import { useCallback, useRef } from 'react';
import './HomeScreen.css';

function createCardRipple(e) {
  const card = e.currentTarget;
  const existing = card.querySelector('.card-ripple');
  if (existing) existing.remove();

  const circle = document.createElement('span');
  const rect = card.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  circle.style.width = circle.style.height = `${size}px`;
  circle.style.left = `${e.clientX - rect.left - size / 2}px`;
  circle.style.top = `${e.clientY - rect.top - size / 2}px`;
  circle.classList.add('card-ripple');
  card.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

export default function HomeScreen({ onSelectMode }) {
  const cardRefs = useRef([]);

  const handleTilt = useCallback((e, index) => {
    const card = cardRefs.current[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
  }, []);

  const handleTiltReset = useCallback((index) => {
    const card = cardRefs.current[index];
    if (!card) return;
    card.style.transform = '';
  }, []);

  const handleSelect = useCallback(
    (mode, e) => {
      createCardRipple(e);
      // Small delay so ripple is visible
      setTimeout(() => onSelectMode(mode), 200);
    },
    [onSelectMode]
  );

  const handleKeyDown = useCallback(
    (mode, e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectMode(mode);
      }
    },
    [onSelectMode]
  );

  return (
    <main className="home screen-enter">
      <div className="home__title-area">
        <h1 className="home__title">המשחק שלנו</h1>
        <p className="home__subtitle">בחרו מצב והתחילו!</p>
      </div>

      <div className="home__cards" role="group" aria-label="בחירת מצב משחק">
        {/* PvP Card */}
        <div
          className="mode-card mode-card--pvp"
          role="button"
          tabIndex={0}
          ref={(el) => (cardRefs.current[0] = el)}
          onClick={(e) => handleSelect('pvp', e)}
          onKeyDown={(e) => handleKeyDown('pvp', e)}
          onMouseMove={(e) => handleTilt(e, 0)}
          onMouseLeave={() => handleTiltReset(0)}
          aria-label="מצב שני שחקנים - אחד נגד אחד"
        >
          <span className="mode-card__icon" aria-hidden="true">⚔️</span>
          <h2 className="mode-card__title">שני שחקנים (1 נגד 1)</h2>
          <p className="mode-card__desc">שחקו יחד עם חבר על אותו מסך!</p>
        </div>

        {/* AI Card */}
        <div
          className="mode-card mode-card--ai"
          role="button"
          tabIndex={0}
          ref={(el) => (cardRefs.current[1] = el)}
          onClick={(e) => handleSelect('ai', e)}
          onKeyDown={(e) => handleKeyDown('ai', e)}
          onMouseMove={(e) => handleTilt(e, 1)}
          onMouseLeave={() => handleTiltReset(1)}
          aria-label="מצב נגד המחשב"
        >
          <span className="mode-card__icon" aria-hidden="true">🤖</span>
          <h2 className="mode-card__title">נגד המחשב</h2>
          <p className="mode-card__desc">התמודדו מול המחשב ונסו לנצח!</p>
        </div>
      </div>
    </main>
  );
}
