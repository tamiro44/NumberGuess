import { useEffect, useRef, useState, useCallback } from 'react';
import './Modal.css';

export default function Modal({ title, children, onClose }) {
  const [closing, setClosing] = useState(false);
  const backdropRef = useRef(null);
  const closeRef = useRef(null);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);

    // Focus trap - focus the close button on open
    closeRef.current?.focus();

    return () => document.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) handleClose();
  };

  return (
    <div
      className={`modal-backdrop ${closing ? 'modal-backdrop--closing' : ''}`}
      ref={backdropRef}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button
            className="modal__close"
            onClick={handleClose}
            ref={closeRef}
            aria-label="סגירה"
          >
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
