/**
 * VOICE ENGINE — phone.com
 * 
 * Implements:
 * 1. Web Speech API Speech-to-Text (STT) for hands-free voice commands
 * 2. Kokoro neural Text-to-Speech (TTS) with fallbacks:
 *    - TIER 1: Local Python Kokoro sidecar (http://localhost:8200/tts)
 *    - TIER 2: Browser-based SpeechSynthesis (fast, lightweight fallback)
 * 3. Hands-free loop: automatically restarts listening when agent stops speaking
 */

export const PhoneVoice = (() => {
  let recognition = null;
  let audioCtx = null;
  let activeAudioSource = null;
  
  let isListening = false;
  let isSpeaking = false;
  let handsFree = false;
  let ttsEnabled = false; // Turned off by default because user found it jarring
  
  let onTranscriptChangeCallback = null;
  let onFinalTranscriptCallback = null;
  
  // Voice Stress Analysis (Biometrics)
  let stressAudioCtx = null;
  let stressAnalyser = null;
  let stressStream = null;
  let stressInterval = null;
  let vocalJitterScore = 0;

  function init() {
    // 1. Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        updateMicUI();
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (onTranscriptChangeCallback) {
          onTranscriptChangeCallback(interimTranscript || finalTranscript);
        }

        if (finalTranscript && onFinalTranscriptCallback) {
          const cleanText = finalTranscript.trim();
          if (cleanText.length > 0) {
            onFinalTranscriptCallback(cleanText);
          }
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          console.warn('[phone-voice] Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        isListening = false;
        stopVoiceStressAnalysis();
        updateMicUI();
        // If hands-free is enabled and we aren't speaking, start listening again
        if (handsFree && !isSpeaking) {
          setTimeout(() => {
            if (handsFree && !isListening && !isSpeaking) {
              startListening();
            }
          }, 300);
        }
      };
    } else {
      console.warn('[phone-voice] Web Speech API Speech Recognition not supported in this browser.');
    }
  }

  function startListening() {
    if (!recognition || isListening) return;
    try {
      recognition.start();
      startVoiceStressAnalysis();
    } catch (e) {
      console.warn('[phone-voice] Failed to start recognition:', e.message);
    }
  }

  async function startVoiceStressAnalysis() {
    try {
      if (!stressAudioCtx) {
        stressAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (stressAudioCtx.state === 'suspended') {
        await stressAudioCtx.resume();
      }
      stressStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const source = stressAudioCtx.createMediaStreamSource(stressStream);
      stressAnalyser = stressAudioCtx.createAnalyser();
      stressAnalyser.fftSize = 512;
      source.connect(stressAnalyser);

      const bufferLength = stressAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let previousFundamental = 0;
      let totalJitter = 0;
      let samples = 0;

      stressInterval = setInterval(() => {
        if (!isListening) return;
        stressAnalyser.getByteFrequencyData(dataArray);
        
        // Find peak frequency (simple proxy for fundamental)
        let maxVal = 0;
        let peakIndex = 0;
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > maxVal) {
            maxVal = dataArray[i];
            peakIndex = i;
          }
        }
        
        if (maxVal > 50) { // If there is actual voice
          if (previousFundamental > 0) {
            const jitter = Math.abs(peakIndex - previousFundamental);
            totalJitter += jitter;
            samples++;
          }
          previousFundamental = peakIndex;
        }
      }, 100);

      // We attach the score to a getter
      setInterval(() => {
        if (samples > 0) {
          vocalJitterScore = totalJitter / samples;
          // Send to VAAM if available
          if (typeof window.VAAM !== 'undefined') {
            // we could dispatch an event or call directly. Let's just store it here for the chat to harvest
          }
        }
      }, 2000);
      
    } catch (err) {
      console.warn('[phone-voice] Could not start voice stress analysis:', err);
    }
  }

  function stopVoiceStressAnalysis() {
    if (stressInterval) clearInterval(stressInterval);
    if (stressStream) {
      stressStream.getTracks().forEach(track => track.stop());
      stressStream = null;
    }
  }

  function getVocalStressScore() {
    return vocalJitterScore;
  }

  function resetVocalStressScore() {
    vocalJitterScore = 0;
  }

  function stopListening() {
    if (!recognition || !isListening) return;
    try {
      recognition.stop();
    } catch (e) {
      console.warn('[phone-voice] Failed to stop recognition:', e.message);
    }
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  function setHandsFree(enabled) {
    handsFree = enabled;
    console.log(`[phone-voice] Hands-free mode: ${handsFree ? 'ON' : 'OFF'}`);
    if (handsFree && !isListening && !isSpeaking) {
      startListening();
    }
  }

  function setTTSEnabled(enabled) {
    ttsEnabled = enabled;
    if (!ttsEnabled) {
      cancel();
    }
  }

  function cancel() {
    // Stop active audio buffer source
    if (activeAudioSource) {
      try {
        activeAudioSource.stop();
      } catch (e) {}
      activeAudioSource = null;
    }
    // Stop native speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isSpeaking = false;
  }

  // Play audio from raw buffer
  async function playAudioBuffer(arrayBuffer) {
    cancel();
    isSpeaking = true;
    
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    try {
      const buffer = await audioCtx.decodeAudioData(arrayBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        isSpeaking = false;
        activeAudioSource = null;
        if (handsFree && !isListening) {
          startListening();
        }
      };

      activeAudioSource = source;
      source.start(0);
      return true;
    } catch (e) {
      console.error('[phone-voice] Audio decode failed:', e);
      isSpeaking = false;
      return false;
    }
  }

  // Neural TTS speaker
  async function speak(text) {
    if (!ttsEnabled) return;
    cancel();
    
    // Stop listening while speaking to prevent echo/feedback loops
    stopListening();
    isSpeaking = true;

    // TIER 1: Try Local Python Kokoro Sidecar (Port 8200)
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3000); // 3s connection timeout

      const response = await fetch('http://localhost:8200/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'am_adam' }), // default mentor voice
        signal: controller.signal
      });

      clearTimeout(t);

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const success = await playAudioBuffer(buffer);
        if (success) {
          console.log('[phone-voice] Neural TTS: Spoke via Kokoro sidecar');
          return;
        }
      }
    } catch (e) {
      console.log('[phone-voice] Kokoro sidecar unavailable, falling back to Web Speech synthesis.');
    }

    // TIER 2: Fallback to Native SpeechSynthesis (Built-in)
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a warm male/female voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural'));
      if (preferred) utterance.voice = preferred;
      
      utterance.rate = 0.95; // thoughtful pacing
      
      utterance.onend = () => {
        isSpeaking = false;
        if (handsFree && !isListening) {
          startListening();
        }
      };

      utterance.onerror = (e) => {
        console.error('[phone-voice] SpeechSynthesis error:', e);
        isSpeaking = false;
        if (handsFree && !isListening) {
          startListening();
        }
      };

      window.speechSynthesis.speak(utterance);
      console.log('[phone-voice] Local SpeechSynthesis: Spoke via browser engine');
    } else {
      console.warn('[phone-voice] No speech synthesis available.');
      isSpeaking = false;
      if (handsFree && !isListening) {
        startListening();
      }
    }
  }

  function updateMicUI() {
    const btn = document.getElementById('btn-mic');
    if (!btn) return;
    if (isListening) {
      btn.classList.add('mic-active');
      btn.innerHTML = '🎙️ Listening...';
    } else {
      btn.classList.remove('mic-active');
      btn.innerHTML = '🎙️ Talk hands-free';
    }
  }

  function setCallbacks(onChange, onFinal) {
    onTranscriptChangeCallback = onChange;
    onFinalTranscriptCallback = onFinal;
  }

  return {
    init,
    startListening,
    stopListening,
    toggleListening,
    setHandsFree,
    setTTSEnabled,
    speak,
    cancel,
    setCallbacks,
    isListening: () => isListening,
    isSpeaking: () => isSpeaking,
    getVocalStressScore,
    resetVocalStressScore
  };
})();
