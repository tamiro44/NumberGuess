import { useState, useCallback } from 'react';
import TopBar from './components/TopBar';
import SettingsModal from './components/SettingsModal';
import Confetti from './components/Confetti';
import HomeScreen from './screens/HomeScreen';
import ModeScreen from './screens/ModeScreen';
import './App.css';

export default function App() {
  // Navigation state
  const [screen, setScreen] = useState('home'); // 'home' | 'mode'
  const [selectedMode, setSelectedMode] = useState(null); // 'pvp' | 'ai'

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    sound: true,
    animations: true,
  });

  // Confetti state
  const [confettiActive, setConfettiActive] = useState(false);

  const triggerConfetti = useCallback(() => {
    setConfettiActive(false);
    requestAnimationFrame(() => {
      setConfettiActive(true);
    });
    setTimeout(() => setConfettiActive(false), 3500);
  }, []);

  const handleSelectMode = useCallback((mode) => {
    setSelectedMode(mode);
    setScreen('mode');
    triggerConfetti();
  }, [triggerConfetti]);

  const handleGoHome = useCallback(() => {
    setScreen('home');
    setSelectedMode(null);
  }, []);

  const handleToggleSetting = useCallback((key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className={settings.animations ? '' : 'no-animations'}>
      {/* Animated background */}
      <div className="bg-animation" aria-hidden="true">
        <div className="bg-blob bg-blob--1" />
        <div className="bg-blob bg-blob--2" />
        <div className="bg-blob bg-blob--3" />
      </div>

      {/* Top bar */}
      <TopBar
        onHome={handleGoHome}
        onSettings={() => setShowSettings(true)}
      />

      {/* Screens */}
      {screen === 'home' && (
        <HomeScreen onSelectMode={handleSelectMode} />
      )}
      {screen === 'mode' && (
        <ModeScreen
          mode={selectedMode}
          onBack={handleGoHome}
          settings={settings}
          onConfetti={triggerConfetti}
        />
      )}

      {/* Confetti */}
      {settings.animations && <Confetti active={confettiActive} />}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onToggle={handleToggleSetting}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
