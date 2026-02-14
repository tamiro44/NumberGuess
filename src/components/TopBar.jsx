import { useCallback } from 'react';
import './TopBar.css';

function createRipple(e) {
  const btn = e.currentTarget;
  const existing = btn.querySelector('.ripple');
  if (existing) existing.remove();

  const circle = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  circle.style.width = circle.style.height = `${size}px`;
  circle.style.left = `${e.clientX - rect.left - size / 2}px`;
  circle.style.top = `${e.clientY - rect.top - size / 2}px`;
  circle.classList.add('ripple');
  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 500);
}

export default function TopBar({ onHome, onSettings }) {
  const handleHome = useCallback(
    (e) => {
      createRipple(e);
      onHome();
    },
    [onHome]
  );

  const handleSettings = useCallback(
    (e) => {
      createRipple(e);
      onSettings();
    },
    [onSettings]
  );

  return (
    <nav className="topbar" role="navigation" aria-label="ניווט ראשי">
      <button className="topbar__btn" onClick={handleHome} aria-label="חזרה לדף הבית">
        <span className="topbar__btn-icon" aria-hidden="true">🏠</span>
        <span>בית</span>
      </button>
      <button className="topbar__btn" onClick={handleSettings} aria-label="פתיחת הגדרות">
        <span className="topbar__btn-icon" aria-hidden="true">⚙️</span>
        <span>הגדרות</span>
      </button>
    </nav>
  );
}
