import { useRef, useCallback, useEffect } from 'react';

// ════════════════════════════════════════════════════════════
// useAmbientDrone — Web Audio sine wave drone per slide
// ════════════════════════════════════════════════════════════
// Ported from prototype/index.html lines 498-525.
// Each slide has a drone frequency. Cross-fades between them.
// Requires user gesture to initialize (browser policy).

export function useAmbientDrone() {
  const ctxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);

  const initAudio = useCallback(() => {
    if (ctxRef.current) return;
    try {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.gain.value = 0;
      gainRef.current.connect(ctxRef.current.destination);
    } catch {
      // Audio not available — fail silently
    }
  }, []);

  const playDrone = useCallback((hz) => {
    initAudio();
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;

    // Stop previous oscillator
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch { /* already stopped */ }
      oscRef.current = null;
    }

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;
    osc.connect(gain);
    osc.start();
    oscRef.current = osc;

    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0.06, ctx.currentTime, 0.8);
  }, [initAudio]);

  const fadeDrone = useCallback(() => {
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  }, []);

  // Cleanup on unmount — stop oscillator, close context
  useEffect(() => {
    return () => {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch { /* noop */ }
      }
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return { playDrone, fadeDrone, initAudio };
}
