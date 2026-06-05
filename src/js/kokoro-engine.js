/**
 * KOKORO ENGINE — In-Browser Neural TTS via kokoro-js
 *
 * Loads the Kokoro-82M ONNX model (q8 quantization, ~120MB) entirely in the
 * browser using Transformers.js / ONNX Runtime Web.  No sidecar, no server,
 * no data leaves the device.
 *
 * Dependencies (fetched at load-time from CDN):
 *   - kokoro-js  → https://cdn.jsdelivr.net/npm/kokoro-js/+esm
 *
 * Audio flow:
 *   KokoroTTS.generate(text, {voice})
 *     → RawAudio  (.toBlob() → WAV Blob → Object URL → <Audio>.play())
 *
 * Exported singleton:  KokoroEngine
 */

// Dynamic import so the page loads instantly; the 2MB+ ESM bundle is only
// fetched when the user explicitly clicks "Load Voice".
let KokoroTTS = null;

/**
 * Lazily import the kokoro-js library from CDN.
 * Separated so we can retry on transient network errors without reloading
 * the entire page.
 */
async function ensureKokoroLib() {
  if (KokoroTTS) return;
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/kokoro-js@0.4.1/+esm');
    KokoroTTS = mod.KokoroTTS;
    if (!KokoroTTS) {
      throw new Error('KokoroTTS class not found in kokoro-js module');
    }
  } catch (err) {
    console.error('[Kokoro] Failed to load kokoro-js from CDN:', err);
    throw new Error(`Could not fetch kokoro-js library: ${err.message}`);
  }
}

// ─── Default voice ──────────────────────────────────────────────────────────
// af_sky  — American female, described as warm / professional / clear.
// am_adam — American male, friendly / neutral narrator.
// Both are excellent for a life-coaching context.
const DEFAULT_VOICE = 'af_sky';

// ─── Model identifier & quantisation ────────────────────────────────────────
const MODEL_ID = 'onnx-community/Kokoro-82M-ONNX';
const MODEL_DTYPE = 'q8'; // Best quality-to-size ratio for browser (~120MB)

export const KokoroEngine = (() => {
  /** @type {import('kokoro-js').KokoroTTS | null} */
  let tts = null;
  let isLoaded = false;
  let isLoading = false;
  let loadProgress = 0;

  // ── Playback state (shared with voice.js via getters) ────────────────────
  let activeAudio = null; // Currently playing HTMLAudioElement
  let onPlaybackEnd = null; // Callback fired when speech finishes

  // ────────────────────────────────────────────────────────────────────────────
  // LOAD
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Download & initialise the Kokoro ONNX model.
   *
   * @param {(progress: number) => void} [onProgress]  0-100 progress callback
   * @returns {Promise<void>}
   */
  async function load(onProgress) {
    if (isLoaded || isLoading) return;
    isLoading = true;
    loadProgress = 0;

    try {
      // 1. Fetch the kokoro-js library itself
      if (onProgress) onProgress(0);
      await ensureKokoroLib();

      // 2. Load the ONNX model weights (cached by the browser after first load)
      tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: MODEL_DTYPE,
        progress_callback: (p) => {
          // p may have { status, progress, file, loaded, total }
          if (typeof p.progress === 'number') {
            loadProgress = Math.round(p.progress);
          } else if (p.loaded && p.total) {
            loadProgress = Math.round((p.loaded / p.total) * 100);
          }
          if (onProgress) onProgress(loadProgress);
        }
      });

      isLoaded = true;
      loadProgress = 100;
      if (onProgress) onProgress(100);
      console.log('[Kokoro] Model loaded successfully (q8, ~120MB)');
    } catch (err) {
      console.error('[Kokoro] Failed to load model:', err);
      tts = null;
      isLoaded = false;
      throw err;
    } finally {
      isLoading = false;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SPEAK
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Synthesise speech from text and play it.
   *
   * @param {string}  text            Text to speak
   * @param {Object}  [opts]          Options
   * @param {string}  [opts.voice]    Voice ID (default: af_sky)
   * @param {() => void} [opts.onEnd] Callback when playback finishes
   * @returns {Promise<void>}         Resolves once playback starts
   */
  async function speak(text, { voice = DEFAULT_VOICE, onEnd } = {}) {
    if (!tts) throw new Error('Kokoro not loaded — call load() first');
    if (!text || text.trim().length === 0) return;

    // Cancel any in-progress playback
    stop();

    onPlaybackEnd = onEnd || null;

    try {
      // Generate the audio (returns a RawAudio object)
      const rawAudio = await tts.generate(text, { voice });

      // Convert to a WAV Blob → Object URL → HTMLAudioElement
      const blob = rawAudio.toBlob();
      const url = URL.createObjectURL(blob);

      activeAudio = new Audio(url);

      activeAudio.onended = () => {
        _cleanup(url);
        if (onPlaybackEnd) onPlaybackEnd();
      };

      activeAudio.onerror = (e) => {
        console.error('[Kokoro] Playback error:', e);
        _cleanup(url);
        if (onPlaybackEnd) onPlaybackEnd();
      };

      await activeAudio.play();
    } catch (err) {
      console.error('[Kokoro] Speak failed:', err);
      if (onPlaybackEnd) onPlaybackEnd();
      throw err;
    }
  }

  /**
   * Generate audio and return the WAV Blob without playing it.
   * Useful if the caller wants to feed it into Web Audio API (e.g. voice.js
   * playAudioBuffer).
   *
   * @param {string} text
   * @param {string} [voice]
   * @returns {Promise<Blob>}  WAV Blob
   */
  async function generateBlob(text, voice = DEFAULT_VOICE) {
    if (!tts) throw new Error('Kokoro not loaded');
    const rawAudio = await tts.generate(text, { voice });
    return rawAudio.toBlob();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STOP / UNLOAD
  // ────────────────────────────────────────────────────────────────────────────

  /** Stop current playback (if any). */
  function stop() {
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch (_) { /* already stopped */ }
      // Revoke object URL if we can
      if (activeAudio.src && activeAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(activeAudio.src);
      }
      activeAudio = null;
    }
    onPlaybackEnd = null;
  }

  /** Release all model memory. */
  function unload() {
    stop();
    tts = null;
    isLoaded = false;
    isLoading = false;
    loadProgress = 0;
    console.log('[Kokoro] Engine unloaded');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VOICES
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * List all available voice IDs.  Requires the model to be loaded.
   * @returns {string[]}
   */
  function listVoices() {
    if (!tts) return [];
    try {
      return tts.list_voices();
    } catch (_) {
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ────────────────────────────────────────────────────────────────────────────

  function _cleanup(objectUrl) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    activeAudio = null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ────────────────────────────────────────────────────────────────────────────

  return Object.freeze({
    load,
    speak,
    generateBlob,
    stop,
    unload,
    listVoices,
    isLoaded:    () => isLoaded,
    isLoading:   () => isLoading,
    getProgress: () => loadProgress,
  });
})();
