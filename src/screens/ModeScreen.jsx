import { useState, useCallback, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import {
  createAIState,
  nextGuess,
  updateStateFromFeedback,
  getThinkingDelay,
} from '../game/humanLikeAI';
import './ModeScreen.css';

const MODE_LABELS = {
  pvp: 'מצב שני שחקנים',
  ai: 'מצב נגד המחשב',
};

const DIFFICULTY_OPTIONS = [
  { key: 'easy', label: 'קל', emoji: '😊' },
  { key: 'medium', label: 'בינוני', emoji: '🤔' },
  { key: 'hard', label: 'קשה', emoji: '🔥' },
];

/* ——— tiny ripple helper ——— */
function createBtnRipple(e) {
  const btn = e.currentTarget;
  const existing = btn.querySelector('.btn-ripple');
  if (existing) existing.remove();
  const circle = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  circle.style.width = circle.style.height = `${size}px`;
  circle.style.left = `${e.clientX - rect.left - size / 2}px`;
  circle.style.top = `${e.clientY - rect.top - size / 2}px`;
  circle.classList.add('btn-ripple');
  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 500);
}

export default function ModeScreen({ mode, onBack, settings, onConfetti }) {
  /* ——— state ——— */
  const [showHowTo, setShowHowTo] = useState(false);

  // AI game state
  const [gamePhase, setGamePhase] = useState('setup'); // setup | playing | thinking | win
  const [difficulty, setDifficulty] = useState('medium');
  const [aiState, setAiState] = useState(null);
  const [currentGuess, setCurrentGuess] = useState(null);
  const [aiMessage, setAiMessage] = useState('');
  const [guessHistory, setGuessHistory] = useState([]);
  const [thinkingDots, setThinkingDots] = useState('');
  const [showWinOverlay, setShowWinOverlay] = useState(false);
  const [winGuessCount, setWinGuessCount] = useState(0);

  // Scoreboard (persists across rounds within session)
  const [score, setScore] = useState({ playerWins: 0, aiWins: 0, aiGuessTotal: 0, aiRounds: 0 });

  const thinkingTimerRef = useRef(null);
  const dotsIntervalRef = useRef(null);
  const historyEndRef = useRef(null);

  const animationsOn = settings?.animations !== false;

  /* ——— cleanup on unmount ——— */
  useEffect(() => {
    return () => {
      clearTimeout(thinkingTimerRef.current);
      clearInterval(dotsIntervalRef.current);
    };
  }, []);

  /* ——— auto-scroll guess history ——— */
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [guessHistory]);

  /* ——— animated thinking dots ——— */
  const startThinkingDots = useCallback(() => {
    let count = 0;
    clearInterval(dotsIntervalRef.current);
    dotsIntervalRef.current = setInterval(() => {
      count = (count + 1) % 4;
      setThinkingDots('.'.repeat(count || 1));
    }, 350);
  }, []);

  const stopThinkingDots = useCallback(() => {
    clearInterval(dotsIntervalRef.current);
    setThinkingDots('');
  }, []);

  /* ——— start a new round ——— */
  const handleStart = useCallback(() => {
    const state = createAIState(difficulty);
    setAiState(state);
    setGuessHistory([]);
    setCurrentGuess(null);
    setAiMessage('חשבו על מספר בין 0 ל-100...');
    setShowWinOverlay(false);
    setGamePhase('playing');

    // AI makes its first guess after a short delay
    const delay = animationsOn ? getThinkingDelay() : 0;
    if (animationsOn) {
      setGamePhase('thinking');
      startThinkingDots();
    }

    thinkingTimerRef.current = setTimeout(() => {
      stopThinkingDots();
      const { guess, message } = nextGuess(state);
      setCurrentGuess(guess);
      setAiMessage(message);
      setGuessHistory([{ guess, feedback: null }]);
      setGamePhase('playing');
    }, delay);
  }, [difficulty, animationsOn, startThinkingDots, stopThinkingDots]);

  /* ——— player gives feedback ——— */
  const handleFeedback = useCallback(
    (feedback) => {
      if (!aiState || gamePhase !== 'playing') return;

      // Update history with feedback
      setGuessHistory((prev) => {
        const copy = [...prev];
        if (copy.length > 0) copy[copy.length - 1].feedback = feedback;
        return copy;
      });

      if (feedback === 'correct') {
        const totalGuesses = aiState.guessCount + 1;
        setWinGuessCount(totalGuesses);
        setGamePhase('win');
        setShowWinOverlay(true);
        setAiMessage('מצאתי! 🎉');
        setScore((prev) => ({
          ...prev,
          aiWins: prev.aiWins + 1,
          aiGuessTotal: prev.aiGuessTotal + totalGuesses,
          aiRounds: prev.aiRounds + 1,
        }));
        onConfetti?.();
        return;
      }

      // Update AI knowledge
      const newState = updateStateFromFeedback(aiState, feedback, currentGuess);
      setAiState(newState);

      // AI "thinks" then guesses
      const delay = animationsOn ? getThinkingDelay() : 0;
      if (animationsOn) {
        setGamePhase('thinking');
        setAiMessage('חושב');
        startThinkingDots();
      }

      thinkingTimerRef.current = setTimeout(() => {
        stopThinkingDots();
        const { guess, message } = nextGuess(newState);
        setCurrentGuess(guess);
        setAiMessage(message);
        setGuessHistory((prev) => [...prev, { guess, feedback: null }]);
        setGamePhase('playing');
      }, delay);
    },
    [aiState, currentGuess, gamePhase, animationsOn, onConfetti, startThinkingDots, stopThinkingDots]
  );

  /* ——— player wins (gave up / impossible) ——— */
  const handlePlayerWins = useCallback(() => {
    setScore((prev) => ({ ...prev, playerWins: prev.playerWins + 1 }));
    setGamePhase('setup');
    setAiMessage('');
    clearTimeout(thinkingTimerRef.current);
    stopThinkingDots();
  }, [stopThinkingDots]);

  /* ——— play again after win ——— */
  const handlePlayAgain = useCallback(() => {
    setShowWinOverlay(false);
    setGamePhase('setup');
    setAiMessage('');
    setCurrentGuess(null);
    setGuessHistory([]);
  }, []);

  /* ——— computed ——— */
  const avgGuesses =
    score.aiRounds > 0 ? (score.aiGuessTotal / score.aiRounds).toFixed(1) : '—';

  const isPlaying = gamePhase === 'playing' || gamePhase === 'thinking';

  /* ——— render: AI mode ——— */
  if (mode === 'ai') {
    return (
      <main className="mode-screen screen-enter">
        <h1 className="mode-screen__title">{MODE_LABELS[mode]}</h1>

        {/* Scoreboard */}
        <div className="scoreboard">
          <div className="scoreboard__item">
            <span className="scoreboard__value">{score.playerWins}</span>
            <span className="scoreboard__label">ניצחונות שחקן</span>
          </div>
          <div className="scoreboard__divider" />
          <div className="scoreboard__item">
            <span className="scoreboard__value">{score.aiWins}</span>
            <span className="scoreboard__label">ניצחונות מחשב</span>
          </div>
          <div className="scoreboard__divider" />
          <div className="scoreboard__item">
            <span className="scoreboard__value">{avgGuesses}</span>
            <span className="scoreboard__label">ממוצע ניסיונות</span>
          </div>
        </div>

        {/* Setup: difficulty + start */}
        {gamePhase === 'setup' && (
          <div className="setup-panel screen-enter">
            <p className="setup-panel__instruction">בחרו רמת קושי:</p>
            <div className="difficulty-selector" role="radiogroup" aria-label="רמת קושי">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  className={`difficulty-btn ${difficulty === opt.key ? 'difficulty-btn--active' : ''}`}
                  onClick={() => setDifficulty(opt.key)}
                  role="radio"
                  aria-checked={difficulty === opt.key}
                >
                  <span className="difficulty-btn__emoji" aria-hidden="true">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            <p className="setup-panel__desc">
              חשבו על מספר בין <strong>0</strong> ל-<strong>100</strong> והמחשב ינסה לנחש!
            </p>

            <div className="mode-screen__actions">
              <button className="btn btn--primary btn--lg" onClick={handleStart}>
                <span aria-hidden="true">▶</span>
                התחלה
              </button>
              <button className="btn btn--secondary" onClick={() => setShowHowTo(true)}>
                <span aria-hidden="true">📖</span>
                איך משחקים?
              </button>
              <button className="btn btn--ghost" onClick={onBack}>
                ↩ חזרה
              </button>
            </div>
          </div>
        )}

        {/* Playing / Thinking */}
        {isPlaying && (
          <div className="game-active screen-enter">
            {/* AI message bubble */}
            <div className="ai-bubble" aria-live="polite">
              <span className="ai-bubble__avatar" aria-hidden="true">🤖</span>
              <span className="ai-bubble__text">
                {gamePhase === 'thinking'
                  ? `חושב${thinkingDots}`
                  : aiMessage}
              </span>
            </div>

            {/* Current guess display */}
            <div className="guess-display" role="region" aria-label="ניחוש נוכחי">
              <div className={`guess-display__number ${gamePhase === 'thinking' ? 'guess-display__number--thinking' : ''}`}>
                {gamePhase === 'thinking' ? '?' : currentGuess}
              </div>
              <p className="guess-display__label">
                ניחוש מספר {guessHistory.length}
              </p>
            </div>

            {/* Feedback buttons */}
            <div className="feedback-buttons">
              <button
                className="feedback-btn feedback-btn--higher"
                onClick={(e) => { createBtnRipple(e); handleFeedback('higher'); }}
                disabled={gamePhase === 'thinking'}
                aria-label="המספר שלי גבוה יותר"
              >
                <span className="feedback-btn__arrow" aria-hidden="true">⬆</span>
                יותר
              </button>
              <button
                className="feedback-btn feedback-btn--correct"
                onClick={(e) => { createBtnRipple(e); handleFeedback('correct'); }}
                disabled={gamePhase === 'thinking'}
                aria-label="ניחשת נכון"
              >
                <span className="feedback-btn__icon" aria-hidden="true">🎯</span>
                בדיוק!
              </button>
              <button
                className="feedback-btn feedback-btn--lower"
                onClick={(e) => { createBtnRipple(e); handleFeedback('lower'); }}
                disabled={gamePhase === 'thinking'}
                aria-label="המספר שלי נמוך יותר"
              >
                <span className="feedback-btn__arrow" aria-hidden="true">⬇</span>
                פחות
              </button>
            </div>

            {/* Guess history */}
            {guessHistory.length > 0 && (
              <div className="guess-history">
                <h3 className="guess-history__title">היסטוריה</h3>
                <div className="guess-history__list">
                  {guessHistory.map((entry, i) => (
                    <div
                      key={i}
                      className={`guess-history__item ${i === guessHistory.length - 1 ? 'guess-history__item--latest' : ''}`}
                    >
                      <span className="guess-history__num">{entry.guess}</span>
                      <span className="guess-history__feedback">
                        {entry.feedback === 'higher' && '⬆ יותר'}
                        {entry.feedback === 'lower' && '⬇ פחות'}
                        {entry.feedback === 'correct' && '🎯 בדיוק!'}
                        {entry.feedback === null && '⏳'}
                      </span>
                    </div>
                  ))}
                  <div ref={historyEndRef} />
                </div>
              </div>
            )}

            {/* Bottom actions while playing */}
            <div className="game-active__bottom">
              <button className="btn btn--ghost" onClick={handlePlayerWins}>
                🏳️ ויתרתי, השחקן ניצח
              </button>
            </div>
          </div>
        )}

        {/* Win Overlay */}
        {showWinOverlay && (
          <div className="win-overlay" role="dialog" aria-modal="true" aria-label="המחשב ניצח">
            <div className="win-overlay__card screen-enter">
              <div className="win-overlay__emoji">😎</div>
              <h2 className="win-overlay__title">המחשב ניצח!</h2>
              <p className="win-overlay__sub">
                ניחשתי ב-<strong>{winGuessCount}</strong> ניסיונות
              </p>
              <div className="win-overlay__actions">
                <button className="btn btn--primary btn--lg" onClick={handlePlayAgain}>
                  🔄 שחקו שוב
                </button>
                <button className="btn btn--ghost" onClick={onBack}>
                  ↩ חזרה לתפריט
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How to play modal */}
        {showHowTo && (
          <Modal title="איך משחקים?" onClose={() => setShowHowTo(false)}>
            <div className="how-to-play">
              <h3>חוקי המשחק</h3>
              <ol>
                <li>חשבו על מספר בין 0 ל-100.</li>
                <li>המחשב ינחש מספר.</li>
                <li>ענו: <strong>״יותר״</strong> אם המספר שלכם גבוה יותר, <strong>״פחות״</strong> אם נמוך יותר, או <strong>״בדיוק!״</strong> אם ניחש נכון.</li>
                <li>המטרה: לגרום למחשב לנחש בכמה שפחות ניסיונות!</li>
              </ol>
              <p>רמת הקושי משפיעה על כמה ״חכם״ המחשב. בהצלחה!</p>
            </div>
          </Modal>
        )}
      </main>
    );
  }

  /* ——— render: PvP mode (unchanged placeholder) ——— */
  return (
    <main className="mode-screen screen-enter">
      <h1 className="mode-screen__title">{MODE_LABELS[mode]}</h1>

      <div className="game-board" role="region" aria-label="לוח המשחק">
        <div className="game-board__placeholder">
          <span className="game-board__placeholder-icon" aria-hidden="true">🎮</span>
          לוח המשחק יופיע כאן
        </div>
      </div>

      <div className="mode-screen__actions">
        <button className="btn btn--primary" onClick={(e) => createBtnRipple(e)}>
          <span aria-hidden="true">▶</span>
          התחלה
        </button>
        <button className="btn btn--secondary" onClick={() => setShowHowTo(true)}>
          <span aria-hidden="true">📖</span>
          איך משחקים?
        </button>
        <button className="btn btn--secondary" onClick={onBack}>
          <span aria-hidden="true">↩</span>
          חזרה
        </button>
      </div>

      <div className="mode-screen__switch">
        <button className="btn btn--ghost" onClick={onBack}>
          🔄 החלף מצב
        </button>
      </div>

      {showHowTo && (
        <Modal title="איך משחקים?" onClose={() => setShowHowTo(false)}>
          <div className="how-to-play">
            <h3>חוקי המשחק</h3>
            <ol>
              <li>כל שחקן מקבל תור לשחק.</li>
              <li>בחרו את המהלך שלכם על לוח המשחק.</li>
              <li>השחקן הראשון שמשלים את המטרה - מנצח!</li>
            </ol>
            <p>שחקו עם חבר על אותו מסך. החליפו תורות ותהנו!</p>
          </div>
        </Modal>
      )}
    </main>
  );
}
