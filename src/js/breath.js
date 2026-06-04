/**
 * BREATHING ENGINE (FORGE RESET) — phone.com
 * 
 * Implements:
 * 1. Box Breathing pacing: Inhale 4s -> Hold 4s -> Exhale 4s -> Hold 4s
 * 2. Visual breathing circle (expanding / contracting)
 * 3. Web Audio API sine wave oscillator drone (ambient sound tempering)
 */

const PhoneBreath = (() => {
  let audioCtx = null;
  let oscillator = null;
  let gainNode = null;
  
  let isActive = false;
  let cycleInterval = null;
  let timerInterval = null;
  
  // Box breathing states
  const STATES = {
    INACTIVE: 'inactive',
    INHALE: 'inhale',
    HOLD_IN: 'hold-in',
    EXHALE: 'exhale',
    HOLD_OUT: 'hold-out'
  };
  
  let currentState = STATES.INACTIVE;
  let timeRemaining = 4;

  let visualizerEl, phaseTextEl, timerTextEl, toggleBtn, droneSelect;

  function init() {
    visualizerEl = document.getElementById('breath-visualizer');
    phaseTextEl = document.getElementById('breath-phase-text');
    timerTextEl = document.getElementById('breath-timer-text');
    toggleBtn = document.getElementById('btn-toggle-breath');
    droneSelect = document.getElementById('drone-hz-select');

    if (!toggleBtn) return; // Exit if not on page

    toggleBtn.addEventListener('click', toggleExercise);
  }

  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.connect(audioCtx.destination);
    } catch (e) {
      console.warn('[phone-breath] Audio context not supported:', e.message);
    }
  }

  function startAudio() {
    initAudio();
    if (!audioCtx || !gainNode || !droneSelect) return;

    const hz = parseFloat(droneSelect.value);
    if (hz <= 0) return; // Silence selected

    stopAudio(); // Ensure clean start

    try {
      oscillator = audioCtx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = hz;
      oscillator.connect(gainNode);
      oscillator.start(0);

      // Fade in drone
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setTargetAtTime(0.08, audioCtx.currentTime, 1.2);
      console.log(`[phone-breath] Ambient drone active: ${hz} Hz`);
    } catch (e) {
      console.error('[phone-breath] Failed to start oscillator:', e);
    }
  }

  function stopAudio() {
    if (oscillator) {
      try {
        oscillator.stop();
      } catch (e) {}
      oscillator = null;
    }
    if (gainNode && audioCtx) {
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3);
    }
  }

  function toggleExercise() {
    if (isActive) {
      stop();
    } else {
      start();
    }
  }

  function start() {
    isActive = true;
    toggleBtn.textContent = 'Stop Exercise';
    toggleBtn.classList.add('btn-danger');
    toggleBtn.classList.remove('btn-accent');

    // Mute speech/TTS to avoid collision
    if (typeof PhoneVoice !== 'undefined') {
      PhoneVoice.cancel();
      PhoneVoice.stopListening();
    }

    startAudio();
    nextState(STATES.INHALE);

    // Setup pacing loops
    cycleInterval = setInterval(tickCycle, 4000);
    timerInterval = setInterval(tickTimer, 1000);
  }

  function stop() {
    isActive = false;
    currentState = STATES.INACTIVE;
    
    clearInterval(cycleInterval);
    clearInterval(timerInterval);
    
    stopAudio();

    if (toggleBtn) {
      toggleBtn.textContent = 'Start Exercise';
      toggleBtn.classList.remove('btn-danger');
      toggleBtn.classList.add('btn-accent');
    }

    if (visualizerEl) {
      visualizerEl.className = 'breath-circle';
    }
    if (phaseTextEl) {
      phaseTextEl.textContent = 'Breathe';
    }
    if (timerTextEl) {
      timerTextEl.textContent = '04';
    }

    // Slightly increase guard (armor density) in player state for finishing exercise!
    if (typeof PhoneState !== 'undefined') {
      let state = PhoneState.load();
      state.pulse.guard = Math.min(state.pulse.guard + 0.05, 1.0);
      PhoneState.save(state);
      if (typeof PhoneDashboard !== 'undefined') {
        PhoneDashboard.render(state);
      }
      console.log('[phone-breath] Guard reinforced via breath exercise.');
    }
  }

  function tickCycle() {
    switch (currentState) {
      case STATES.INHALE:
        nextState(STATES.HOLD_IN);
        break;
      case STATES.HOLD_IN:
        nextState(STATES.EXHALE);
        break;
      case STATES.EXHALE:
        nextState(STATES.HOLD_OUT);
        break;
      case STATES.HOLD_OUT:
        nextState(STATES.INHALE);
        break;
    }
  }

  function tickTimer() {
    timeRemaining--;
    if (timeRemaining < 0) {
      timeRemaining = 3; // Reset to 4s cycle (index 3)
    }
    if (timerTextEl) {
      timerTextEl.textContent = `0${timeRemaining + 1}`;
    }
  }

  function nextState(state) {
    currentState = state;
    timeRemaining = 4;

    if (timerTextEl) {
      timerTextEl.textContent = '04';
    }

    if (!visualizerEl || !phaseTextEl) return;

    visualizerEl.className = `breath-circle ${state}`;

    switch (state) {
      case STATES.INHALE:
        phaseTextEl.textContent = 'Inhale';
        break;
      case STATES.HOLD_IN:
        phaseTextEl.textContent = 'Hold';
        break;
      case STATES.EXHALE:
        phaseTextEl.textContent = 'Exhale';
        break;
      case STATES.HOLD_OUT:
        phaseTextEl.textContent = 'Hold';
        break;
    }
  }

  return {
    init,
    start,
    stop,
    isActive: () => isActive
  };
})();
