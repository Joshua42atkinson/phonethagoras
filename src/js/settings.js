/**
 * SETTINGS CONTROLLER — phone.com
 * Wires the settings panel (State Export/Import, Zen Mode, Brain Modal).
 */

import { PhoneState } from './state.js';
import { PhoneI18n } from './i18n.js';
import { PhoneAI } from './ai.js';
import { PhoneLFM } from './lfm-manager.js';
import { PhoneVision } from './vision-manager.js';

export const PhoneSettings = (() => {
  function init() {
    wireDataControls();
    wirePreferences();
    wireBrainModal();
    renderCurrentState();
  }

  function renderCurrentState() {
    const state = PhoneState.load();
    const zenToggle = document.getElementById('setting-zen-mode');
    const langSelect = document.getElementById('setting-language');

    if (zenToggle) zenToggle.checked = !!state.zenMode;
    if (langSelect) langSelect.value = state.language || 'en';
  }

  function wireDataControls() {
    const btnExport = document.getElementById('btn-export-state');
    const btnImport = document.getElementById('btn-import-state');
    const btnReset = document.getElementById('btn-reset-state');
    const fileImport = document.getElementById('file-import');

    // Offline Liquid LFM download button
    const btnWebLLM = document.getElementById('btn-enable-webllm');
    const webllmProgressContainer = document.getElementById('webllm-progress-container');
    const webllmProgressBar = document.getElementById('webllm-progress-bar');
    const webllmProgressText = document.getElementById('webllm-progress-text');

    if (btnWebLLM) {
      btnWebLLM.addEventListener('click', async () => {
        if (typeof PhoneLFM === 'undefined') {
          alert("Liquid LFM Manager not loaded.");
          return;
        }

        btnWebLLM.disabled = true;
        btnWebLLM.textContent = "Downloading/Loading...";
        webllmProgressContainer.style.display = 'block';

        try {
          await PhoneLFM.init((progress, text) => {
            webllmProgressBar.style.width = `${progress}%`;
            webllmProgressText.textContent = text || `${progress}%`;
          });
          btnWebLLM.textContent = "Brain Ready";
          webllmProgressText.textContent = "Download complete. Liquid LFM engine loaded.";
        } catch (e) {
          btnWebLLM.disabled = false;
          btnWebLLM.textContent = "Retry Download";
          webllmProgressText.textContent = "Error: " + e.message;
        }
      });
    }

    // Offline Vision download button
    const btnVision = document.getElementById('btn-enable-vision');
    const visionProgressContainer = document.getElementById('vision-progress-container');
    const visionProgressBar = document.getElementById('vision-progress-bar');
    const visionProgressText = document.getElementById('vision-progress-text');

    if (btnVision) {
      btnVision.addEventListener('click', async () => {
        if (typeof PhoneVision === 'undefined') {
          alert("Vision Manager not loaded.");
          return;
        }

        btnVision.disabled = true;
        btnVision.textContent = "Downloading Vision...";
        visionProgressContainer.style.display = 'block';

        try {
          await PhoneVision.init((progress, text) => {
            visionProgressBar.style.width = `${progress}%`;
            visionProgressText.textContent = text || `${progress}%`;
          });
          btnVision.textContent = "Vision Ready";
          visionProgressText.textContent = "Download complete. Vision engine loaded.";
        } catch (e) {
          btnVision.disabled = false;
          btnVision.textContent = "Retry Download";
          visionProgressText.textContent = "Error: " + e.message;
        }
      });
    }

    if (btnExport) {
      btnExport.addEventListener('click', async () => {
        const json = await PhoneState.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phonethagoras_state_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (btnImport && fileImport) {
      btnImport.addEventListener('click', () => fileImport.click());
      fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            await PhoneState.importJSON(event.target.result);
            alert('State successfully imported! Reloading...');
            window.location.reload();
          } catch (err) {
            alert('Failed to import state. Invalid JSON format.');
          }
        };
        reader.readAsText(file);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', async () => {
        if (confirm('Are you absolutely sure you want to reset your character sheet? All progress and memory will be lost.')) {
          if (confirm('Final warning: This cannot be undone.')) {
            await PhoneState.reset();
            window.location.reload();
          }
        }
      });
    }
  }

  function wirePreferences() {
    const zenToggle = document.getElementById('setting-zen-mode');
    const langSelect = document.getElementById('setting-language');

    if (zenToggle) {
      zenToggle.addEventListener('change', (e) => {
        const state = PhoneState.load();
        state.zenMode = e.target.checked;
        PhoneState.save(state);
      });
    }

    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        const state = PhoneState.load();
        state.language = e.target.value;
        PhoneState.save(state);
        if (typeof PhoneI18n !== 'undefined') {
          PhoneI18n.translateDOM(state.language);
        }
      });
    }
  }

  function wireBrainModal() {
    // Basic modal toggling logic for Brain Setup
    // Ensure we can close it if the user opens it manually
    const closeBtn = document.getElementById('close-brain-settings');
    const modal = document.getElementById('brain-settings-modal');
    const engineSelect = document.getElementById('engine-select');

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }

    if (engineSelect) {
      engineSelect.addEventListener('change', (e) => {
        PhoneAI.setActiveBackend(e.target.value);
      });
    }
  }

  return { init };
})();
