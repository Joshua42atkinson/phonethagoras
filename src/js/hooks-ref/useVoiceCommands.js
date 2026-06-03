import { useState, useCallback, useEffect, useRef } from 'react';

// ════════════════════════════════════════════════════════════
// useVoiceCommands — Browser SpeechRecognition for hands-free play
// ════════════════════════════════════════════════════════════
// Uses Web Speech API (Chrome/Edge) for speech-to-text commands.
// No server needed. Falls back to keyboard if unavailable.

export function useVoiceCommands({ onCommand, enabled = true }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    setSupported(true);

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e) => {
      const interim = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      setTranscript(interim);

      if (e.results[e.results.length - 1].isFinal) {
        const final = interim.toLowerCase().trim();
        parseCommand(final);
        setTranscript('');
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        console.warn('[VoiceCommands] Mic permission denied');
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try { rec.stop(); } catch { /* noop */ }
    };
  }, []);

  const parseCommand = useCallback((text) => {
    // Normalize
    const t = text.toLowerCase().trim();

    // Directional commands
    if (t.includes('up') || t.includes('forward') || t.includes('ahead') || t.includes('north')) {
      onCommand?.('choice_0');
    } else if (t.includes('right') || t.includes('east')) {
      onCommand?.('choice_1');
    } else if (t.includes('down') || t.includes('back') || t.includes('south')) {
      onCommand?.('choice_2');
    } else if (t.includes('left') || t.includes('west')) {
      onCommand?.('choice_3');
    }
    // Action commands
    else if (t.includes('depth') || t.includes('deeper') || t.includes('question') || t.includes('why')) {
      onCommand?.('depth');
    } else if (t.includes('pause') || t.includes('stop') || t.includes('wait')) {
      onCommand?.('pause');
    } else if (t.includes('play') || t.includes('go') || t.includes('begin') || t.includes('start')) {
      onCommand?.('play');
    } else if (t.includes('skip') || t.includes('next')) {
      onCommand?.('skip');
    } else if (t.includes('repeat') || t.includes('again')) {
      onCommand?.('repeat');
    } else {
      // Unknown command — treat as general input, maybe the AI can use it
      onCommand?.('text', t);
    }
  }, [onCommand]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !enabled) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript('');
    } catch (e) {
      console.warn('[VoiceCommands] Start failed:', e);
    }
  }, [enabled]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch { /* noop */ }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    supported,
    startListening,
    stopListening,
  };
}
