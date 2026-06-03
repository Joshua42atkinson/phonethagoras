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

  console.log('[phone] Player state loaded:', playerState.id);

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

  // ─── 4. Navigation ───
  const navButtons = document.querySelectorAll('.nav-btn[data-panel]');
  const panels = document.querySelectorAll('.panel');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPanel = btn.dataset.panel;

      // Update active button
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show target panel
      panels.forEach(p => {
        p.classList.remove('panel-active');
        if (p.id === `panel-${targetPanel}`) {
          p.classList.add('panel-active');
        }
      });
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
      const activeBtn = document.querySelector('.nav-btn.active');
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
      console.log(`[phone] Zen Mode (KISS) set to: ${playerState.zenMode}`);
    });
  }

  // ─── 5. Settings Buttons ───
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
        
        console.log('[phone] State imported successfully');
      } catch (err) {
        console.error('[phone] Import failed:', err);
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
        
        console.log('[phone] State reset to defaults');
      }
    });
  }

  // ─── 6. Dismiss Loading Overlay ───
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    // Small delay to let the initial render settle
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 800);
  }

  console.log('[phone] ◆ ready.');
})();
