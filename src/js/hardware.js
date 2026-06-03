/**
 * DYNAMIC HARDWARE-ADAPTIVE MODEL COMPILER (DHMC)
 * 
 * Profiles the user's hardware envelope to determine the optimal
 * model tier for WebLLM inference:
 *   HIGH → Liquid-LFM-3B (WebGPU, 16GB+ RAM)
 *   MID  → Liquid-LFM-1.5B (WebGPU, 8GB+ RAM)
 *   LITE → Liquid-LFM-1B (WASM fallback)
 */

const PhoneHardware = (() => {

  async function profile() {
    const memory = navigator.deviceMemory || 4;
    const threads = navigator.hardwareConcurrency || 4;

    let webgpuSupported = false;
    let adapterInfo = null;

    try {
      if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          webgpuSupported = true;
          // Try to get adapter info if available
          try {
            const info = await adapter.requestAdapterInfo();
            adapterInfo = {
              vendor: info.vendor || 'unknown',
              architecture: info.architecture || 'unknown',
              description: info.description || ''
            };
          } catch {
            adapterInfo = { vendor: 'detected', architecture: 'unknown', description: '' };
          }
        }
      }
    } catch (e) {
      console.warn('[DHMC] WebGPU not supported:', e.message);
    }

    // Determine tier
    let tier, model, backend;

    if (webgpuSupported && memory >= 16) {
      tier = 'HIGH';
      model = 'Liquid-LFM-3B-Q4_K_M-WebGPU';
      backend = 'webgpu';
    } else if (webgpuSupported && memory >= 8) {
      tier = 'MID';
      model = 'Liquid-LFM-1.5B-Q4_K_M-WebGPU';
      backend = 'webgpu';
    } else {
      tier = 'LITE';
      model = 'Liquid-LFM-1B-WASM';
      backend = 'wasm';
    }

    return {
      tier,
      model,
      backend,
      memory,
      threads,
      webgpuSupported,
      adapterInfo
    };
  }

  // Render hardware profile into Settings panel
  function renderToSettings(hwProfile) {
    const memEl = document.getElementById('setting-memory');
    const threadsEl = document.getElementById('setting-threads');
    const gpuEl = document.getElementById('setting-webgpu');
    const tierEl = document.getElementById('setting-tier');
    const modelEl = document.getElementById('setting-model');

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

  return { profile, renderToSettings };
})();
