/**
 * APP — Phonethagoras Main Entry Point
 * 
 * Orchestrates initialization:
 * 1. Load player state from localStorage
 * 2. Run hardware profile
 * 3. Render the dashboard
 * 4. Wire up navigation (proper tab switching)
 * 5. First-run onboarding
 * 6. Dismiss loading overlay
 */

import { PhoneState } from './state.js';
import { PhoneI18n } from './i18n.js';
import { PhoneHardware } from './hardware.js';
import { PhoneRadar } from './radar.js';
import { PhoneDashboard } from './dashboard.js';
import { VAAM } from './vaam.js';
import { PhoneChat } from './chat.js';
import { PhoneBreath } from './breath.js';
import { PhoneRecycle } from './recycle.js';
import { PhoneBridge } from './bridge.js';
import { PhoneSync } from './sync.js';
import { PhoneDocs } from './docs.js';
import { PhoneOnboarding } from './onboarding.js';
import { PhoneQuest } from './quest.js';
import { PhoneSettings } from './settings.js';
import { PhoneVision } from './vision-manager.js';
import { PhoneRAG } from './rag-manager.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('[phonethagoras] SW registered:', reg.scope))
      .catch(err => console.error('[phonethagoras] SW registration failed:', err));
  });
}

(async function initApp() {
  'use strict';

  // ─── 1. Load State (IndexedDB) ───
  await PhoneState.init();
  let playerState = PhoneState.load();
  PhoneState.save(playerState);

  PhoneState.on('state:changed', (newState) => {
    playerState = newState;
    PhoneRadar.render(newState.shape);
    PhoneDashboard.render(newState);
    if (typeof PhoneI18n !== 'undefined') {
      PhoneI18n.translateDOM(newState.language);
    }
  });

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

  // ─── 4. Module Initialization ───
  if (typeof PhoneChat !== 'undefined') await PhoneChat.init();
  if (typeof PhoneBreath !== 'undefined') PhoneBreath.init();
  if (typeof PhoneRecycle !== 'undefined') PhoneRecycle.init();
  if (typeof PhoneBridge !== 'undefined') PhoneBridge.init();
  if (typeof PhoneSync !== 'undefined') PhoneSync.init();
  if (typeof PhoneDocs !== 'undefined') PhoneDocs.init();
  if (typeof PhoneQuest !== 'undefined') PhoneQuest.init();
  if (typeof PhoneSettings !== 'undefined') PhoneSettings.init();
  
  // Initialize background RAG silently
  PhoneRAG.init().catch(e => console.warn("RAG Init failed silently in background:", e));

  // ─── 4. Navigation (Clean Tab Switching) ───
  const navButtons = document.querySelectorAll('.sigil-btn[data-panel]');
  const panels = document.querySelectorAll('.panel');

  function switchPanel(panelId) {
    // Deactivate all
    panels.forEach(p => p.classList.remove('panel-active'));
    navButtons.forEach(b => b.classList.remove('active'));
    
    // Activate target
    const panel = document.getElementById(`panel-${panelId}`);
    if (panel) {
      panel.classList.add('panel-active');
    }
    
    // Activate nav button
    const btn = document.querySelector(`.sigil-btn[data-panel="${panelId}"]`);
    if (btn) {
      btn.classList.add('active');
    }

    // Re-render dashboard when switching to it
    if (panelId === 'shape') {
      const state = PhoneState.load();
      PhoneRadar.render(state.shape);
      PhoneDashboard.render(state);
    }
    
    // Re-render bridge when switching to it
    if (panelId === 'bridge' && typeof PhoneBridge !== 'undefined') {
      PhoneBridge.init();
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPanel = btn.dataset.panel;
      switchPanel(targetPanel);
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
      const activeBtn = document.querySelector('.sigil-btn.active');
      if (activeBtn && gatedTabs.includes(activeBtn.id)) {
        switchPanel('shape');
      }
    }
  }

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
      console.log(`[phonethagoras] Zen Mode set to: ${playerState.zenMode}`);
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
        
        if (playerState.zenMode === undefined) playerState.zenMode = true;
        if (checkZenMode) {
          checkZenMode.checked = playerState.zenMode;
          applyZenModeGating(playerState.zenMode);
        }
        
        if (selectLanguage) selectLanguage.value = playerState.language || 'en';
        
        console.log('[phonethagoras] State imported');
      } catch (err) {
        console.error('[phonethagoras] Import failed:', err);
        alert('Import failed: ' + err.message);
      }
      fileInput.value = '';
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Start over? This deletes all your local data.')) {
        playerState = PhoneState.reset();
        PhoneState.save(playerState);
        // Clear onboarding flag so it shows again
        localStorage.removeItem('zen_onboarded');
        
        if (checkZenMode) {
          checkZenMode.checked = true;
          applyZenModeGating(true);
        }
        if (selectLanguage) selectLanguage.value = 'en';
        
        // Show onboarding again
        if (typeof PhoneOnboarding !== 'undefined') {
          PhoneOnboarding.init();
        }
        
        console.log('[phonethagoras] State reset');
      }
    });
  }

  // ─── 6. Brain Settings Modal ───
  const modal = document.getElementById('brain-settings-modal');
  const btnCloseModal = document.getElementById('close-brain-settings');
  const engineSelect = document.getElementById('engine-select');
  const offlineSection = document.getElementById('offline-download-section');
  const btnDownload = document.getElementById('download-model-btn');
  const progressContainer = document.getElementById('download-progress-container');

  if (modal && btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // ─── 7. First-Run Onboarding ───
  if (typeof PhoneOnboarding !== 'undefined') {
    PhoneOnboarding.init();
  }

  // ─── 8. Dismiss Loading Overlay ───
  setTimeout(() => {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
      loading.style.opacity = '0';
      setTimeout(() => loading.remove(), 600);
    }
  }, 800);

  console.log('[phonethagoras] ◆ portal open.');
})();
