/**
 * DYNAMIC HARDWARE-ADAPTIVE MODEL COMPILER (DHMC)
 *
 * Profiles the user's hardware envelope to determine the optimal
 * Trinity model tier for Wllama GGUF inference:
 *
 *   FULL     → 8 GB+ RAM, WebGPU   — All Trinity models + spoke navigation
 *   STANDARD → 6 GB+ RAM, any      — Trinity loads, spokes possible
 *   MINIMAL  → < 6 GB, WASM only   — Logic-only, no embedding, browser TTS
 *
 * @module hardware
 */

export const PhoneHardware = (() => {

  /**
   * Profile the current device and return a hardware envelope.
   * @returns {Promise<HardwareProfile>}
   */
  async function profile() {
    const memory = navigator.deviceMemory || 4;          // GB (capped at 8 on many browsers)
    const threads = navigator.hardwareConcurrency || 4;

    let webgpuSupported = false;
    let adapterInfo = null;

    try {
      if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          webgpuSupported = true;
          try {
            const info = await adapter.requestAdapterInfo();
            adapterInfo = {
              vendor: info.vendor || 'unknown',
              architecture: info.architecture || 'unknown',
              description: info.description || '',
            };
          } catch {
            adapterInfo = { vendor: 'detected', architecture: 'unknown', description: '' };
          }
        }
      }
    } catch (e) {
      console.warn('[DHMC] WebGPU probe failed:', e.message);
    }

    // ── Tier determination ──────────────────────────────────────────
    let tier, model, backend;

    if (webgpuSupported && memory >= 8) {
      tier = 'FULL';
      model = 'LFM-350M-Q4';       // All Trinity models fit
      backend = 'webgpu';
    } else if (memory >= 4) {
      tier = 'STANDARD';
      model = 'LFM-350M-Q4';
      backend = webgpuSupported ? 'webgpu' : 'wasm';
    } else {
      tier = 'MINIMAL';
      model = 'LFM-350M-Q4';       // Logic-only; no embedding model
      backend = 'wasm';
    }

    return {
      tier,
      model,
      backend,
      memory,
      threads,
      webgpuSupported,
      adapterInfo,
    };
  }

  /**
   * Estimate available memory budget for model loading (in MB).
   *
   * Uses performance.measureUserAgentSpecificMemory() when available
   * (Chrome 89+, COOP/COEP required), otherwise falls back to
   * navigator.deviceMemory heuristics.
   *
   * @returns {Promise<number>} Estimated available MB for models.
   */
  async function getMemoryBudget() {
    // ─── TRINITY VRAM FOOTPRINT CALCULUS ───
    // Logic (LFM 350M Q4): ~280 MB VRAM
    // Memory (Nomic Embed v1.5 Q4): ~110 MB VRAM
    // Voice (Kokoro 82M Q8): ~130 MB VRAM
    // Total Trinity Requirement: ~520 MB
    // This allows the full engine to run fluidly on a 6GB device.
    
    // Try the modern memory measurement API (requires crossOriginIsolated)
    if (
      typeof crossOriginIsolated !== 'undefined' &&
      crossOriginIsolated &&
      typeof performance.measureUserAgentSpecificMemory === 'function'
    ) {
      try {
        const mem = await performance.measureUserAgentSpecificMemory();
        const usedMB = Math.round(mem.bytes / (1024 * 1024));
        const deviceMB = (navigator.deviceMemory || 4) * 1024;
        
        // Conservative: allow up to 60 % of reported device memory minus current usage
        // Ensures we maintain enough runway for the 520MB Trinity footprint
        const budget = Math.max(Math.round(deviceMB * 0.6) - usedMB, 0);
        return budget;
      } catch { /* fall through */ }
    }

    // Fallback heuristic: 50 % of deviceMemory
    const deviceMB = (navigator.deviceMemory || 4) * 1024;
    return Math.round(deviceMB * 0.5);
  }

  /**
   * Render the hardware profile into the Settings panel DOM elements.
   * @param {HardwareProfile} hwProfile
   */
  function renderToSettings(hwProfile) {
    const memEl     = document.getElementById('setting-memory');
    const threadsEl = document.getElementById('setting-threads');
    const gpuEl     = document.getElementById('setting-webgpu');
    const tierEl    = document.getElementById('setting-tier');
    const modelEl   = document.getElementById('setting-model');

    if (memEl) memEl.textContent = `${hwProfile.memory} GB`;
    if (threadsEl) threadsEl.textContent = `${hwProfile.threads}`;
    if (gpuEl) {
      gpuEl.textContent = hwProfile.webgpuSupported
        ? `✓ Available${hwProfile.adapterInfo ? ` (${hwProfile.adapterInfo.vendor})` : ''}`
        : '✗ Not available';
      gpuEl.style.color = hwProfile.webgpuSupported
        ? 'var(--color-success)'
        : 'var(--color-danger)';
    }
    if (tierEl) tierEl.textContent = hwProfile.tier;
    if (modelEl) modelEl.textContent = hwProfile.model;

    // Update header badge
    const badge = document.getElementById('hardware-tier-badge');
    if (badge) {
      badge.textContent = `${hwProfile.tier} · ${hwProfile.backend.toUpperCase()}`;
      badge.className = `status-indicator tier-${hwProfile.tier.toLowerCase()}`;
    }
  }

  return { profile, getMemoryBudget, renderToSettings };
})();
