import { useState, useCallback, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import {
  createAIState,
  nextGuess,
  updateStateFromFeedback,
  getThinkingDelay,
} from '../game/humanLikeAI';
import {
  validateNumber,
  compareGuess,
  updateRangeFromFeedback,
  swapRoles,
} from '../game/pvpLogic';
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

/* ═══════════════════════════════════════════════════════
   PvP sub-component (self-contained state)
   ═══════════════════════════════════════════════════════ */
function PvPMode({ onBack, settings, onConfetti }) {
  const animationsOn = settings?.animations !== false;

  // Phases: setup | privacy | secret | handoff | guessing | win
  const [phase, setPhase] = useState('setup');
  const [showHowTo, setShowHowTo] = useState(false);

  // Roles: who chooses, who guesses
  const [chooser, setChooser] = useState(1);
  const guesser = chooser === 1 ? 2 : 1;

  // Secret entry
  const [secretInput, setSecretInput] = useState('');
  const [secretVisible, setSecretVisible] = useState(false);
  const [secretError, setSecretError] = useState('');
  const [secret, setSecret] = useState(null);

  // Guessing
  const [guessInput, setGuessInput] = useState('');
  const [guessError, setGuessError] = useState('');
  const [guessHistory, setGuessHistory] = useState([]);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [rangeLow, setRangeLow] = useState(0);
  const [rangeHigh, setRangeHigh] = useState(100);

  // Handoff countdown
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);

  // Win
  const [winData, setWinData] = useState(null);

  // Scoreboard
  const [score, setScore] = useState({
    p1Wins: 0, p2Wins: 0,
    p1Best: null, p2Best: null,
  });

  const guessInputRef = useRef(null);
  const secretInputRef = useRef(null);
  const historyEndRef = useRef(null);

  // Cleanup timers
  useEffect(() => {
    return () => clearInterval(countdownRef.current);
  }, []);

  // Auto-scroll history
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [guessHistory]);

  // Focus inputs on phase change
  useEffect(() => {
    if (phase === 'secret') secretInputRef.current?.focus();
    if (phase === 'guessing') guessInputRef.current?.focus();
  }, [phase]);

  /* ——— privacy screen ——— */
  const handleStartRound = useCallback(() => {
    setSecretInput('');
    setSecretVisible(false);
    setSecretError('');
    setSecret(null);
    setGuessInput('');
    setGuessError('');
    setGuessHistory([]);
    setLastFeedback(null);
    setRangeLow(0);
    setRangeHigh(100);
    setWinData(null);
    setPhase('privacy');
  }, []);

  /* ——— secret submission ——— */
  const handleSecretSubmit = useCallback(() => {
    const result = validateNumber(secretInput);
    if (!result.ok) {
      setSecretError(result.error);
      return;
    }
    setSecretError('');
    setSecret(result.value);

    // Start handoff (with optional countdown)
    if (animationsOn) {
      setCountdown(3);
      setPhase('handoff');
      let c = 3;
      countdownRef.current = setInterval(() => {
        c -= 1;
        if (c <= 0) {
          clearInterval(countdownRef.current);
          setCountdown(null);
          setPhase('guessing');
        } else {
          setCountdown(c);
        }
      }, 800);
    } else {
      setPhase('handoff');
    }
  }, [secretInput, animationsOn]);

  /* ——— skip countdown ——— */
  const handleSkipToGuessing = useCallback(() => {
    clearInterval(countdownRef.current);
    setCountdown(null);
    setPhase('guessing');
  }, []);

  /* ——— guess submission ——— */
  const handleGuessSubmit = useCallback(() => {
    const result = validateNumber(guessInput);
    if (!result.ok) {
      setGuessError(result.error);
      return;
    }
    setGuessError('');
    const guess = result.value;
    const feedback = compareGuess(guess, secret);

    const entry = { guess, feedback };
    setGuessHistory((prev) => [...prev, entry]);
    setLastFeedback(feedback);
    setGuessInput('');

    // Narrow displayed range
    const newRange = updateRangeFromFeedback(rangeLow, rangeHigh, guess, feedback);
    setRangeLow(newRange.low);
    setRangeHigh(newRange.high);

    if (feedback === 'correct') {
      const attempts = guessHistory.length + 1;
      setWinData({ guesser, attempts });
      setPhase('win');
      onConfetti?.();

      // Update score
      setScore((prev) => {
        const key = `p${guesser}Wins`;
        const bestKey = `p${guesser}Best`;
        const currentBest = prev[bestKey];
        return {
          ...prev,
          [key]: prev[key] + 1,
          [bestKey]: currentBest === null ? attempts : Math.min(currentBest, attempts),
        };
      });
    } else {
      // Re-focus input for next guess
      setTimeout(() => guessInputRef.current?.focus(), 50);
    }
  }, [guessInput, secret, rangeLow, rangeHigh, guessHistory, guesser, onConfetti]);

  /* ——— play again (same roles) ——— */
  const handlePlayAgain = useCallback(() => {
    handleStartRound();
  }, [handleStartRound]);

  /* ——— swap roles + play again ——— */
  const handleSwapAndPlay = useCallback(() => {
    setChooser((c) => swapRoles(c));
    // Small delay so the state updates before starting round
    setTimeout(() => {
      setSecretInput('');
      setSecretVisible(false);
      setSecretError('');
      setSecret(null);
      setGuessInput('');
      setGuessError('');
      setGuessHistory([]);
      setLastFeedback(null);
      setRangeLow(0);
      setRangeHigh(100);
      setWinData(null);
      setPhase('privacy');
    }, 0);
  }, []);

  /* ——— reset scores ——— */
  const handleResetScore = useCallback(() => {
    setScore({ p1Wins: 0, p2Wins: 0, p1Best: null, p2Best: null });
  }, []);

  /* ——— key handler for inputs ——— */
  const onSecretKey = (e) => { if (e.key === 'Enter') handleSecretSubmit(); };
  const onGuessKey = (e) => { if (e.key === 'Enter') handleGuessSubmit(); };

  /* ——— computed ——— */
  const chooserLabel = `שחקן ${chooser}`;
  const guesserLabel = `שחקן ${guesser}`;

  /* ═══════ RENDER ═══════ */
  return (
    <main className="mode-screen screen-enter">
      <h1 className="mode-screen__title">{MODE_LABELS.pvp}</h1>

      {/* Scoreboard */}
      <div className="scoreboard">
        <div className="scoreboard__item">
          <span className="scoreboard__value">{score.p1Wins}</span>
          <span className="scoreboard__label">שחקן 1</span>
          {score.p1Best !== null && (
            <span className="scoreboard__best">שיא: {score.p1Best}</span>
          )}
        </div>
        <div className="scoreboard__divider" />
        <div className="scoreboard__item">
          <span className="scoreboard__value">{score.p2Wins}</span>
          <span className="scoreboard__label">שחקן 2</span>
          {score.p2Best !== null && (
            <span className="scoreboard__best">שיא: {score.p2Best}</span>
          )}
        </div>
      </div>

      {/* ——— Phase: Setup ——— */}
      {phase === 'setup' && (
        <div className="setup-panel screen-enter">
          <div className="pvp-intro">
            <span className="pvp-intro__icon" aria-hidden="true">⚔️</span>
            <p className="pvp-intro__text">
              שחקן אחד בוחר מספר, השני מנחש.
              <br />
              מי ינחש בפחות ניסיונות?
            </p>
          </div>

          <div className="pvp-roles">
            <div className="pvp-roles__badge pvp-roles__badge--chooser">
              🤫 {chooserLabel} בוחר
            </div>
            <div className="pvp-roles__badge pvp-roles__badge--guesser">
              🔍 {guesserLabel} מנחש
            </div>
          </div>

          <div className="mode-screen__actions">
            <button className="btn btn--primary btn--lg" onClick={handleStartRound}>
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
            {(score.p1Wins > 0 || score.p2Wins > 0) && (
              <button className="btn btn--ghost" onClick={handleResetScore}>
                🗑️ איפוס ניקוד
              </button>
            )}
          </div>
        </div>
      )}

      {/* ——— Phase: Privacy overlay ——— */}
      {phase === 'privacy' && (
        <div className="pvp-fullscreen screen-enter">
          <div className="pvp-fullscreen__card">
            <div className="pvp-fullscreen__emoji">🔒</div>
            <h2 className="pvp-fullscreen__title">מסך פרטיות</h2>
            <p className="pvp-fullscreen__text">
              הפנו את המסך ל<strong>{chooserLabel}</strong> בלבד.
              <br />
              {guesserLabel} — אל תסתכלו!
            </p>
            <button
              className="btn btn--primary btn--lg"
              onClick={() => setPhase('secret')}
            >
              😊 אני מוכן/ה
            </button>
          </div>
        </div>
      )}

      {/* ——— Phase: Secret entry ——— */}
      {phase === 'secret' && (
        <div className="pvp-secret screen-enter">
          <h2 className="pvp-secret__title">{chooserLabel}: בחר/י מספר</h2>
          <p className="pvp-secret__sub">הכניסו מספר בין 0 ל-100 בלי ש{guesserLabel} רואה</p>

          <div className="pvp-secret__input-wrap">
            <input
              ref={secretInputRef}
              className={`pvp-secret__input ${secretError ? 'pvp-secret__input--error' : ''}`}
              type={secretVisible ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              placeholder="?"
              value={secretInput}
              onChange={(e) => {
                setSecretInput(e.target.value);
                setSecretError('');
              }}
              onKeyDown={onSecretKey}
              autoComplete="off"
              aria-label="מספר סודי"
            />
            <button
              className="pvp-secret__toggle"
              onClick={() => setSecretVisible((v) => !v)}
              type="button"
              aria-label={secretVisible ? 'הסתר מספר' : 'הצג מספר'}
            >
              {secretVisible ? '🙈' : '👁️'}
            </button>
          </div>

          {secretError && (
            <p className="pvp-secret__error" role="alert">{secretError}</p>
          )}

          <button
            className="btn btn--primary btn--lg"
            onClick={handleSecretSubmit}
          >
            ✅ אישור
          </button>
        </div>
      )}

      {/* ——— Phase: Handoff ——— */}
      {phase === 'handoff' && (
        <div className="pvp-fullscreen screen-enter">
          <div className="pvp-fullscreen__card">
            {countdown !== null ? (
              <>
                <div className="pvp-countdown" key={countdown}>{countdown}</div>
                <h2 className="pvp-fullscreen__title">עכשיו תור {guesserLabel}!</h2>
                <p className="pvp-fullscreen__text">
                  {chooserLabel} הסתיר את המספר. {guesserLabel} — קח/י את המכשיר!
                </p>
                <button className="btn btn--ghost" onClick={handleSkipToGuessing}>
                  ⏩ דלג
                </button>
              </>
            ) : (
              <>
                <div className="pvp-fullscreen__emoji">🎮</div>
                <h2 className="pvp-fullscreen__title">עכשיו תור {guesserLabel}!</h2>
                <p className="pvp-fullscreen__text">
                  {chooserLabel} הסתיר את המספר. {guesserLabel} — קח/י את המכשיר!
                </p>
                <button
                  className="btn btn--primary btn--lg"
                  onClick={handleSkipToGuessing}
                >
                  🔍 התחל לנחש
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ——— Phase: Guessing ——— */}
      {phase === 'guessing' && (
        <div className="game-active screen-enter">
          {/* Last feedback bubble */}
          {lastFeedback && (
            <div className={`pvp-feedback-bubble pvp-feedback-bubble--${lastFeedback}`} aria-live="polite">
              {lastFeedback === 'higher' && '⬆️ יותר!'}
              {lastFeedback === 'lower' && '⬇️ פחות!'}
            </div>
          )}

          {/* Range indicator */}
          <div className="pvp-range" aria-label="טווח אפשרי">
            <span className="pvp-range__label">טווח אפשרי:</span>
            <span className="pvp-range__values">{rangeLow}–{rangeHigh}</span>
          </div>

          {/* Guess input */}
          <div className="pvp-guess">
            <label className="pvp-guess__label" htmlFor="guess-input">
              {guesserLabel}, מה הניחוש שלך?
            </label>
            <div className="pvp-guess__row">
              <input
                id="guess-input"
                ref={guessInputRef}
                className={`pvp-guess__input ${guessError ? 'pvp-guess__input--error' : ''}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                placeholder="?"
                value={guessInput}
                onChange={(e) => {
                  setGuessInput(e.target.value);
                  setGuessError('');
                }}
                onKeyDown={onGuessKey}
                autoComplete="off"
              />
              <button
                className="btn btn--primary pvp-guess__submit"
                onClick={(e) => { createBtnRipple(e); handleGuessSubmit(); }}
              >
                🎯 נחש!
              </button>
            </div>
            {guessError && (
              <p className="pvp-secret__error" role="alert">{guessError}</p>
            )}
          </div>

          {/* Guess count */}
          <p className="pvp-guess-count">
            ניסיון מספר <strong>{guessHistory.length + 1}</strong>
          </p>

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
                    </span>
                  </div>
                ))}
                <div ref={historyEndRef} />
              </div>
            </div>
          )}

          {/* Bottom actions */}
          <div className="game-active__bottom">
            <button className="btn btn--ghost" onClick={() => { setPhase('setup'); }}>
              🏳️ ביטול סיבוב
            </button>
          </div>
        </div>
      )}

      {/* ——— Phase: Win ——— */}
      {winData && phase === 'win' && (
        <div className="win-overlay" role="dialog" aria-modal="true" aria-label="ניצחון">
          <div className="win-overlay__card screen-enter">
            <div className="win-overlay__emoji">🏆</div>
            <h2 className="win-overlay__title">ניצחון ל{guesserLabel}!</h2>
            <p className="win-overlay__sub">
              המספר היה <strong>{secret}</strong>
              <br />
              ניחשתי ב-<strong>{winData.attempts}</strong> ניסיונות
            </p>
            <div className="win-overlay__actions">
              <button className="btn btn--primary btn--lg" onClick={handlePlayAgain}>
                🔄 שחקו שוב
              </button>
              <button className="btn btn--secondary" onClick={handleSwapAndPlay}>
                🔁 החלף תפקידים
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
            <h3>חוקי המשחק — שני שחקנים</h3>
            <ol>
              <li><strong>שחקן 1</strong> בוחר מספר סודי בין 0 ל-100.</li>
              <li><strong>שחקן 2</strong> מנחש — ומקבל רמזים: <strong>״יותר״</strong>, <strong>״פחות״</strong>, או <strong>״בדיוק!״</strong></li>
              <li>המטרה: לנחש בכמה שפחות ניסיונות!</li>
              <li>אחרי כל סיבוב אפשר <strong>להחליף תפקידים</strong>.</li>
            </ol>
            <p>מי ינחש בפחות? בהצלחה!</p>
          </div>
        </Modal>
      )}
    </main>
  );
}

/* ═══════════════════════════════════════════════════════
   AI sub-component (unchanged logic, extracted for clarity)
   ═══════════════════════════════════════════════════════ */
function AIMode({ onBack, settings, onConfetti }) {
  const [showHowTo, setShowHowTo] = useState(false);

  // AI game state
  const [gamePhase, setGamePhase] = useState('setup');
  const [difficulty, setDifficulty] = useState('medium');
  const [aiState, setAiState] = useState(null);
  const [currentGuess, setCurrentGuess] = useState(null);
  const [aiMessage, setAiMessage] = useState('');
  const [guessHistory, setGuessHistory] = useState([]);
  const [thinkingDots, setThinkingDots] = useState('');
  const [showWinOverlay, setShowWinOverlay] = useState(false);
  const [winGuessCount, setWinGuessCount] = useState(0);
  const [showInvalidOverlay, setShowInvalidOverlay] = useState(false);

  const [score, setScore] = useState({ playerWins: 0, aiWins: 0, aiGuessTotal: 0, aiRounds: 0 });

  const thinkingTimerRef = useRef(null);
  const dotsIntervalRef = useRef(null);
  const historyEndRef = useRef(null);

  const animationsOn = settings?.animations !== false;

  useEffect(() => {
    return () => {
      clearTimeout(thinkingTimerRef.current);
      clearInterval(dotsIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [guessHistory]);

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

  const handleStart = useCallback(() => {
    const state = createAIState(difficulty);
    setAiState(state);
    setGuessHistory([]);
    setCurrentGuess(null);
    setAiMessage('חשבו על מספר בין 0 ל-100...');
    setShowWinOverlay(false);
    setGamePhase('playing');

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

  const handleFeedback = useCallback(
    (feedback) => {
      if (!aiState || gamePhase !== 'playing') return;

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

      const newState = updateStateFromFeedback(aiState, feedback, currentGuess);

      // Check if bounds became invalid
      if (newState.invalid) {
        setShowInvalidOverlay(true);
        setGamePhase('setup');
        return;
      }

      setAiState(newState);

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

  const handlePlayerWins = useCallback(() => {
    setScore((prev) => ({ ...prev, playerWins: prev.playerWins + 1 }));
    setGamePhase('setup');
    setAiMessage('');
    clearTimeout(thinkingTimerRef.current);
    stopThinkingDots();
  }, [stopThinkingDots]);

  const handlePlayAgain = useCallback(() => {
    setShowWinOverlay(false);
    setGamePhase('setup');
    setAiMessage('');
    setCurrentGuess(null);
    setGuessHistory([]);
  }, []);

  const handleResetAfterInvalid = useCallback(() => {
    setShowInvalidOverlay(false);
    setGamePhase('setup');
    setAiMessage('');
    setCurrentGuess(null);
    setGuessHistory([]);
    setAiState(null);
  }, []);

  const handleContinueAnywayAfterInvalid = useCallback(() => {
    setShowInvalidOverlay(false);
    setGamePhase('setup');
    setAiMessage('');
    setCurrentGuess(null);
    setGuessHistory([]);
    setAiState(null);
    setScore((prev) => ({ ...prev, playerWins: prev.playerWins + 1 }));
  }, []);

  const avgGuesses =
    score.aiRounds > 0 ? (score.aiGuessTotal / score.aiRounds).toFixed(1) : '—';

  const isPlaying = gamePhase === 'playing' || gamePhase === 'thinking';

  return (
    <main className="mode-screen screen-enter">
      <h1 className="mode-screen__title">{MODE_LABELS.ai}</h1>

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

      {/* Setup */}
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
          <div className="ai-bubble" aria-live="polite">
            <span className="ai-bubble__avatar" aria-hidden="true">🤖</span>
            <span className="ai-bubble__text">
              {gamePhase === 'thinking' ? `חושב${thinkingDots}` : aiMessage}
            </span>
          </div>

          <div className="guess-display" role="region" aria-label="ניחוש נוכחי">
            <div className={`guess-display__number ${gamePhase === 'thinking' ? 'guess-display__number--thinking' : ''}`}>
              {gamePhase === 'thinking' ? '?' : currentGuess}
            </div>
            <p className="guess-display__label">ניחוש מספר {guessHistory.length}</p>
          </div>

          <div className="feedback-buttons">
            <button
              className="feedback-btn feedback-btn--higher"
              onClick={(e) => { createBtnRipple(e); handleFeedback('higher'); }}
              disabled={gamePhase === 'thinking' || currentGuess === 100}
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
              disabled={gamePhase === 'thinking' || currentGuess === 0}
              aria-label="המספר שלי נמוך יותר"
            >
              <span className="feedback-btn__arrow" aria-hidden="true">⬇</span>
              פחות
            </button>
          </div>

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

      {/* Invalid Bounds Overlay */}
      {showInvalidOverlay && (
        <div className="win-overlay" role="dialog" aria-modal="true" aria-label="סתירה בתשובות">
          <div className="win-overlay__card screen-enter">
            <div className="win-overlay__emoji">⚠️</div>
            <h2 className="win-overlay__title">נראה שיש סתירה בתשובות</h2>
            <p className="win-overlay__sub">
              התשובות שנתתם סותרות זו את זו. למשל, אמרתם ״יותר״ כשהמספר היה 100, או ״פחות״ כשהיה 0.
            </p>
            <p className="win-overlay__sub">
              רוצים לאפס את הסיבוב?
            </p>
            <div className="win-overlay__actions">
              <button className="btn btn--primary btn--lg" onClick={handleResetAfterInvalid}>
                🔄 איפוס סיבוב
              </button>
              <button className="btn btn--ghost" onClick={handleContinueAnywayAfterInvalid}>
                ↩ המשך בכל זאת
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

/* ═══════════════════════════════════════════════════════
   Main ModeScreen — delegates to the right sub-component
   ═══════════════════════════════════════════════════════ */
export default function ModeScreen({ mode, onBack, settings, onConfetti }) {
  if (mode === 'ai') {
    return <AIMode onBack={onBack} settings={settings} onConfetti={onConfetti} />;
  }
  return <PvPMode onBack={onBack} settings={settings} onConfetti={onConfetti} />;
}
