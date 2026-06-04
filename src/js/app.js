/**
 * APP — phone.com Main Entry Point
 * 
 * Orchestrates initialization:
 * 1. Load player state from localStorage
 * 2. Run fit hardware profile
 * 3. Render the dashboard (Radar Chart, Roots, Walk, Pulse)
 * 4. Wire up navigation and settings
 * 5. Dismiss loading overlay
 */

(async function initApp() {
  'use strict';

  // ─── 1. Load State ───
  let playerState = PhoneState.load();
  PhoneState.save(playerState); // Persist defaults if first run

  console.log('[phonethagoras] Player state loaded:', playerState.id);
  
  // ─── 1b. Translate DOM ───
  if (typeof PhoneI18n !== 'undefined') {
    PhoneI18n.translateDOM(playerState.language);
  }

  // ─── 2. Hardware Profile ───
  const hwProfile = await PhoneHardware.profile();
  PhoneHardware.renderToSettings(hwProfile);
  console.log(`[fit] Tier: ${hwProfile.tier} | Model: ${hwProfile.model} | Backend: ${hwProfile.backend}`);

  // ─── 3. Render Dashboard ───
  PhoneRadar.animateEntrance(playerState.shape, 600);
  PhoneDashboard.render(playerState);
  
  if (typeof VAAM !== 'undefined') {
    console.log('[vaam]', VAAM.promptSummary());
  }

  // ─── 3b. Initialize Chat & Breath Subsystems ───
  if (typeof PhoneChat !== 'undefined') {
    await PhoneChat.init();
  }
  if (typeof PhoneBreath !== 'undefined') {
    PhoneBreath.init();
  }
  if (typeof PhoneRecycle !== 'undefined') {
    PhoneRecycle.init();
  }
  if (typeof PhoneBridge !== 'undefined') {
    PhoneBridge.init();
  }
  if (typeof PhoneSync !== 'undefined') {
    PhoneSync.init();
  }
  if (typeof PhoneDocs !== 'undefined') {
    PhoneDocs.init();
  }

  // ─── 4. Navigation (Chat-First Floating Widgets) ───
  const navButtons = document.querySelectorAll('.sigil-btn[data-panel]');
  const panels = document.querySelectorAll('.panel');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('locked')) {
        const toast = document.createElement('div');
        toast.textContent = "Feature Locked (Coming Soon)";
        toast.style.cssText = "position:fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--color-surface-2); border: 1px solid var(--color-border); padding: 8px 16px; border-radius: 20px; z-index: 1000; animation: fadeout 2s forwards;";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
        return;
      }
      
      const targetPanel = btn.dataset.panel;

      // If clicking Walk (Chat), just close all widgets
      if (targetPanel === 'walk') {
        panels.forEach(p => p.classList.remove('widget-active'));
        return;
      }

      const panelEl = document.getElementById(`panel-${targetPanel}`);
      const isCurrentlyActive = panelEl.classList.contains('widget-active');

      // Close all widgets
      panels.forEach(p => p.classList.remove('widget-active'));

      // Toggle the clicked widget
      if (!isCurrentlyActive) {
        panelEl.classList.add('widget-active');
      }
    });
  });

  // ─── 4b. Zen Mode (Complexity Gating) ───
  const checkZenMode = document.getElementById('setting-zen-mode');
  const gatedTabs = ['nav-recycle', 'nav-bridge', 'nav-docs'];

  function applyZenModeGating(zenModeActive) {
    gatedTabs.forEach(id => {
      const tabEl = document.getElementById(id);
      if (tabEl) {
        if (zenModeActive) {
          tabEl.classList.add('hidden');
        } else {
          tabEl.classList.remove('hidden');
        }
      }
    });

    if (zenModeActive) {
      // If user is currently on a hidden panel, push them back to the 'shape' panel
      const activeBtn = document.querySelector('.sigil-btn.active');
      if (activeBtn && gatedTabs.includes(activeBtn.id)) {
        const shapeTab = document.getElementById('nav-shape');
        if (shapeTab) shapeTab.click();
      }
    }
  }

  // Initialize state value
  if (playerState.zenMode === undefined) {
    playerState.zenMode = true;
  }

  if (checkZenMode) {
    checkZenMode.checked = playerState.zenMode;
    applyZenModeGating(playerState.zenMode);

    checkZenMode.addEventListener('change', () => {
      playerState.zenMode = checkZenMode.checked;
      PhoneState.save(playerState);
      applyZenModeGating(playerState.zenMode);
      console.log(`[phonethagoras] Zen Mode (KISS) set to: ${playerState.zenMode}`);
    });
  }

  // ─── 5. Settings Buttons & Selectors ───
  const selectLanguage = document.getElementById('setting-language');
  if (selectLanguage) {
    selectLanguage.value = playerState.language || 'en';
    selectLanguage.addEventListener('change', (e) => {
      playerState.language = e.target.value;
      PhoneState.save(playerState);
      if (typeof PhoneI18n !== 'undefined') {
        PhoneI18n.translateDOM(playerState.language);
      }
      console.log(`[phonethagoras] Language set to: ${playerState.language}`);
    });
  }

  const btnExport = document.getElementById('btn-export-state');
  const btnImport = document.getElementById('btn-import-state');
  const btnReset = document.getElementById('btn-reset-state');
  const fileInput = document.getElementById('file-import');

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      PhoneState.exportJSON(playerState);
    });
  }

  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        playerState = await PhoneState.importJSON(file);
        PhoneState.save(playerState);
        PhoneRadar.animateEntrance(playerState.shape, 200);
        PhoneDashboard.render(playerState);
        
        // Refresh Zen Mode state on import
        if (playerState.zenMode === undefined) playerState.zenMode = true;
        if (checkZenMode) {
          checkZenMode.checked = playerState.zenMode;
          applyZenModeGating(playerState.zenMode);
        }
        
        // Refresh Language on import
        if (selectLanguage) selectLanguage.value = playerState.language || 'en';
        if (typeof PhoneI18n !== 'undefined') {
          PhoneI18n.translateDOM(playerState.language);
        }
        
        console.log('[phonethagoras] State imported successfully');
      } catch (err) {
        console.error('[phonethagoras] Import failed:', err);
        alert('Failed to import state: ' + err.message);
      }
      fileInput.value = ''; // Reset for re-import
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('This will permanently delete all local player data. Continue?')) {
        playerState = PhoneState.reset();
        PhoneState.save(playerState);
        PhoneRadar.animateEntrance(playerState.shape, 200);
        PhoneDashboard.render(playerState);
        
        // Reset Zen Mode back to default true
        if (checkZenMode) {
          checkZenMode.checked = true;
          applyZenModeGating(true);
        }
        
        // Reset language
        if (selectLanguage) selectLanguage.value = 'en';
        if (typeof PhoneI18n !== 'undefined') {
          PhoneI18n.translateDOM('en');
        }
        
        console.log('[phonethagoras] State reset to defaults');
      }
    });
  }

  // ─── 7. Clear Data ───
  const btnClear = document.getElementById('btn-clear-data');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Clear all save data? This cannot be undone.')) {
        PhoneState.clear();
        location.reload();
      }
    });
  }

  // ─── 8. Brain Settings Modal ───
  const modal = document.getElementById('brain-settings-modal');
  const btnSettings = document.getElementById('nav-settings');
  const btnCloseModal = document.getElementById('close-brain-settings');
  const engineSelect = document.getElementById('engine-select');
  const offlineSection = document.getElementById('offline-download-section');
  const btnDownload = document.getElementById('download-model-btn');
  const progressContainer = document.getElementById('download-progress-container');
  const progressFill = document.getElementById('download-progress-fill');
  const progressText = document.getElementById('download-progress-text');

  if (btnSettings && modal) {
    btnSettings.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });
    btnCloseModal.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    const personaSelect = document.getElementById('persona-select');
    const personaDesc = document.getElementById('persona-description');

    engineSelect.addEventListener('change', (e) => {
      if (e.target.value === 'offline') {
        offlineSection.classList.remove('hidden');
      } else {
        offlineSection.classList.add('hidden');
      }
    });

    if (personaSelect && personaDesc) {
      personaSelect.addEventListener('change', (e) => {
        if (typeof GGUFManager !== 'undefined') {
          const personas = GGUFManager.getPersonas();
          if (personas[e.target.value]) {
            personaDesc.textContent = personas[e.target.value].description;
          }
        }
      });
    }

    btnDownload.addEventListener('click', async () => {
      if (typeof GGUFManager === 'undefined') {
        alert("GGUF offline engine failed to load.");
        return;
      }
      
      const selectedPersona = personaSelect ? personaSelect.value : 'professor';
      btnDownload.disabled = true;
      progressContainer.classList.remove('hidden');
      progressText.textContent = "Loading WebAssembly engine...";
      
      try {
        await GGUFManager.init(selectedPersona, (progress, text) => {
          progressFill.style.width = `${progress}%`;
          progressText.textContent = `${progress}% - ${text}`;
        });
        
        btnDownload.textContent = "Downloaded & Ready!";
        btnDownload.disabled = false;
        
        // Switch PhoneAI to offline GGUF mode globally
        if (typeof PhoneAI !== 'undefined') {
          PhoneAI.setActiveBackend('gguf');
        }
      } catch (err) {
        console.error(err);
        progressText.textContent = "Error loading GGUF persona.";
        btnDownload.disabled = false;
      }
    });
  }

  // ─── Finish Initialization ───
  setTimeout(() => {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
      loading.style.opacity = '0';
      setTimeout(() => loading.remove(), 600);
    }
  }, 1200);

  console.log('[phonethagoras] ◆ portal open.');
})();
