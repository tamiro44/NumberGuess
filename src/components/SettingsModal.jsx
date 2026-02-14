import Modal from './Modal';
import './SettingsModal.css';

export default function SettingsModal({ settings, onToggle, onClose }) {
  return (
    <Modal title="הגדרות" onClose={onClose}>
      <div className="settings-list">
        <div className="settings-item">
          <span className="settings-item__label">
            <span className="settings-item__icon" aria-hidden="true">🔊</span>
            צלילים
          </span>
          <label className="toggle">
            <input
              className="toggle__input"
              type="checkbox"
              checked={settings.sound}
              onChange={() => onToggle('sound')}
              aria-label="צלילים"
            />
            <span className="toggle__slider" />
          </label>
        </div>
        <div className="settings-item">
          <span className="settings-item__label">
            <span className="settings-item__icon" aria-hidden="true">✨</span>
            אנימציות
          </span>
          <label className="toggle">
            <input
              className="toggle__input"
              type="checkbox"
              checked={settings.animations}
              onChange={() => onToggle('animations')}
              aria-label="אנימציות"
            />
            <span className="toggle__slider" />
          </label>
        </div>
      </div>
    </Modal>
  );
}
