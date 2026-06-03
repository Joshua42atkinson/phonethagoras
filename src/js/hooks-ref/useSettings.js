import { useState, useCallback } from 'react';
import { VoiceStyles, AmbientMoods } from '../data/arcana';

// ════════════════════════════════════════════════════════════
// useSettings — Vibe Controls Portal
// ════════════════════════════════════════════════════════════
// Narration voice, ambient mood, active deck, TTS config.
// All persisted to localStorage.

const STORAGE_KEY = 'daydream_settings';

const DEFAULT_SETTINGS = {
  // Narration
  voiceStyle: VoiceStyles.SAGE.id,
  ttsRate: 0.9,        // 0.5 - 1.5
  ttsPitch: 1.0,       // 0.5 - 2.0
  ttsVolume: 1.0,      // 0.0 - 1.0

  // Ambient
  ambientMood: AmbientMoods.CAVE.id,
  ambientVolume: 0.3,  // 0.0 - 1.0

  // Deck & Character
  activeCharacterId: null,
  activeDeckId: null,

  // Audio
  bluetoothOnly: false,   // Force headphone routing
  autoNarrate: true,      // Auto-read story text
  soundEffects: true,     // UI chimes, transitions

  // Accessibility
  highContrast: false,
  largeText: false,
  reducedMotion: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function useSettings() {
  const [settings, setSettings] = useState(() => loadSettings());

  const update = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const setVoiceStyle = useCallback((id) => {
    // Locomotive Profile Auto-Mapping
    let rate = 1.0;
    let pitch = 1.0;
    
    if (id === 'sage') { rate = 0.85; pitch = 0.9; }
    if (id === 'hero') { rate = 1.15; pitch = 1.1; }
    if (id === 'jester') { rate = 1.25; pitch = 1.5; }
    if (id === 'caregiver') { rate = 0.8; pitch = 1.3; }
    if (id === 'bard') { rate = 0.95; pitch = 1.0; }
    
    update({ voiceStyle: id, ttsRate: rate, ttsPitch: pitch });
  }, [update]);
  const setAmbientMood = useCallback((id) => update({ ambientMood: id }), [update]);
  const setTtsRate = useCallback((v) => update({ ttsRate: Math.max(0.5, Math.min(1.5, v)) }), [update]);
  const setTtsPitch = useCallback((v) => update({ ttsPitch: Math.max(0.5, Math.min(2.0, v)) }), [update]);
  const setAmbientVolume = useCallback((v) => update({ ambientVolume: Math.max(0, Math.min(1, v)) }), [update]);
  const setActiveCharacter = useCallback((id) => update({ activeCharacterId: id }), [update]);
  const setActiveDeck = useCallback((id) => update({ activeDeckId: id }), [update]);
  const toggleBluetoothOnly = useCallback(() => update({ bluetoothOnly: !settings.bluetoothOnly }), [update, settings.bluetoothOnly]);
  const toggleAutoNarrate = useCallback(() => update({ autoNarrate: !settings.autoNarrate }), [update, settings.autoNarrate]);
  const toggleSoundEffects = useCallback(() => update({ soundEffects: !settings.soundEffects }), [update, settings.soundEffects]);

  const resetToDefaults = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return {
    settings,
    update,
    setVoiceStyle,
    setAmbientMood,
    setTtsRate,
    setTtsPitch,
    setAmbientVolume,
    setActiveCharacter,
    setActiveDeck,
    toggleBluetoothOnly,
    toggleAutoNarrate,
    toggleSoundEffects,
    resetToDefaults,
  };
}
