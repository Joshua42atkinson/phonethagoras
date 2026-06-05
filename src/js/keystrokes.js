/**
 * KEYSTROKE DYNAMICS ENGINE — phone.com
 * 
 * Implements:
 * 1. Typing cadence tracking (WPM)
 * 2. Correction rate (Backspace frequency)
 * 3. Hesitation tracking (Micro-pauses between strokes)
 * 
 * Used as a biometric proxy for cognitive load and emotional state.
 */

export const PhoneKeystrokes = (() => {
  let inputEl = null;

  let totalKeystrokes = 0;
  let backspaceCount = 0;
  let lastKeystrokeTime = 0;
  let pauseCount = 0;
  let startTime = 0;

  const PAUSE_THRESHOLD_MS = 1500; // 1.5s is considered a cognitive pause

  function init(elementId) {
    inputEl = document.getElementById(elementId);
    if (!inputEl) return;

    inputEl.addEventListener('keydown', handleKeyDown);
    inputEl.addEventListener('input', handleInput);
  }

  function handleKeyDown(e) {
    if (e.key === 'Backspace') {
      backspaceCount++;
    }
    
    // Ignore enter/submit
    if (e.key === 'Enter') return;

    const now = Date.now();
    if (startTime === 0) {
      startTime = now;
    }

    if (lastKeystrokeTime > 0) {
      const delta = now - lastKeystrokeTime;
      if (delta > PAUSE_THRESHOLD_MS) {
        pauseCount++;
      }
    }
    
    lastKeystrokeTime = now;
    totalKeystrokes++;
  }

  function handleInput(e) {
    // Fired for actual text changes, including pastes.
    // For simple metrics, keydown covers most manual typing.
  }

  function reset() {
    totalKeystrokes = 0;
    backspaceCount = 0;
    lastKeystrokeTime = 0;
    pauseCount = 0;
    startTime = 0;
  }

  function getMetrics() {
    if (startTime === 0 || totalKeystrokes === 0) {
      return { wpm: 0, correctionRate: 0, pauseCount: 0 };
    }

    const durationMinutes = (Date.now() - startTime) / 60000;
    // Standard approximation: 5 characters per word
    const estimatedWords = totalKeystrokes / 5;
    const wpm = durationMinutes > 0 ? (estimatedWords / durationMinutes) : 0;
    const correctionRate = backspaceCount / totalKeystrokes;

    return {
      wpm: Math.round(wpm),
      correctionRate: correctionRate,
      pauseCount: pauseCount
    };
  }

  return {
    init,
    reset,
    getMetrics
  };
})();
