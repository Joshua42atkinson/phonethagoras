/**
 * MENTORSHIP PORTAL — Phonethagoras
 * 
 * Replaces the old simulated caseload dashboard with a REAL
 * client-driven mentorship bridge.
 * 
 * How it works:
 * 1. Client saves mentor contact info (name, email, relationship type)
 * 2. Client composes a weekly "Situation Report" (SitRep) with:
 *    - Auto-populated character sheet stats (mind/heart/body/act, current quest)
 *    - Free-text: wins, struggles, help request
 *    - Selectable help-request tags (accountability, resources, emotional, etc.)
 * 3. Client sends the SitRep via:
 *    - mailto: link (opens their email client with a pre-composed message)
 *    - JSON file download (for offline or privacy-first sharing)
 * 4. SitRep history is saved locally so clients can review what they've shared.
 * 
 * Design principle: The client controls 100% of what the mentor sees.
 * Nothing is sent without an explicit user action.
 */

import { PhoneState } from './state.js';
import { WllamaEngine } from './wllama-engine.js';
import { Vault } from './vault.js';

export const PhoneBridge = (() => {
  const MENTOR_KEY = 'zen_mentor';
  const SITREP_HISTORY_KEY = 'zen_sitrep_history';

  // DOM refs
  let mentorNameInput, mentorEmailInput, mentorRelSelect, btnSaveMentor;
  let sitrepMind, sitrepHeart, sitrepBody, sitrepAct, sitrepQuest;
  let sitrepWins, sitrepStruggles, sitrepHelp;
  let helpTagsContainer;
  let btnSendSitrep, btnDownloadSitrep;
  let historyContainer, historyList;

  let selectedHelpTags = new Set();

  function init() {
    // Mentor connection
    mentorNameInput = document.getElementById('mentor-name-input');
    mentorEmailInput = document.getElementById('mentor-email-input');
    mentorRelSelect = document.getElementById('mentor-relationship-select');
    btnSaveMentor = document.getElementById('btn-save-mentor');

    // SitRep auto-populated fields
    sitrepMind = document.getElementById('sitrep-mind');
    sitrepHeart = document.getElementById('sitrep-heart');
    sitrepBody = document.getElementById('sitrep-body');
    sitrepAct = document.getElementById('sitrep-act');
    sitrepQuest = document.getElementById('sitrep-quest');

    // SitRep free-text
    sitrepWins = document.getElementById('sitrep-wins');
    sitrepStruggles = document.getElementById('sitrep-struggles');
    sitrepHelp = document.getElementById('sitrep-help');

    // Help tags
    helpTagsContainer = document.getElementById('help-tags-container');

    // Actions
    btnSendSitrep = document.getElementById('btn-send-sitrep');
    btnDownloadSitrep = document.getElementById('btn-download-sitrep');
    const btnP2PSync = document.getElementById('btn-p2p-mentor-sync');

    // History
    historyContainer = document.getElementById('sitrep-history-container');
    historyList = document.getElementById('sitrep-history-list');

    if (!btnSaveMentor) return; // Not on this page

    // Load saved mentor info
    loadMentorInfo();

    // Populate character sheet stats
    populateStats();

    // Wire events
    btnSaveMentor.addEventListener('click', saveMentorInfo);
    btnSendSitrep.addEventListener('click', sendSitrep);
    btnDownloadSitrep.addEventListener('click', downloadSitrep);
    if (btnP2PSync) {
      btnP2PSync.addEventListener('click', async () => {
        btnP2PSync.textContent = "Connecting P2P...";
        btnP2PSync.disabled = true;
        try {
          const { PhoneNativeBridge } = await import('./native-bridge.js');
          await PhoneNativeBridge.startP2PSync();
          alert("P2P Sync complete. Data has been shared locally.");
        } catch(e) {
          console.error("P2P Sync failed", e);
          alert("Failed to sync via P2P. Make sure Bluetooth/WiFi Direct is enabled.");
        } finally {
          btnP2PSync.textContent = "P2P Mentor Sync (Offline QR/Bluetooth)";
          btnP2PSync.disabled = false;
        }
      });
    }

    // Help tag toggle buttons
    if (helpTagsContainer) {
      helpTagsContainer.querySelectorAll('.help-tag-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleHelpTag(btn));
      });
    }

    // AI Drafting
    const btnDraftHelp = document.getElementById('btn-ai-draft-help');
    if (btnDraftHelp) {
      btnDraftHelp.addEventListener('click', draftHelpRequest);
    }

    // Render history
    renderHistory();

    // Listen for state changes to keep stats live
    if (typeof PhoneState !== 'undefined') {
      PhoneState.on('state:changed', populateStats);
    }
  }

  // ─── Mentor Info ───

  function loadMentorInfo() {
    try {
      const saved = localStorage.getItem(MENTOR_KEY);
      if (saved) {
        const mentor = JSON.parse(saved);
        if (mentorNameInput) mentorNameInput.value = mentor.name || '';
        if (mentorEmailInput) mentorEmailInput.value = mentor.email || '';
        if (mentorRelSelect) mentorRelSelect.value = mentor.relationship || 'guild_master';
        updateSaveButton(true);
      }
    } catch (e) {
      console.warn('[bridge] Failed to load mentor info:', e);
    }
  }

  function saveMentorInfo() {
    const mentor = {
      name: mentorNameInput?.value.trim() || '',
      email: mentorEmailInput?.value.trim() || '',
      relationship: mentorRelSelect?.value || 'guild_master',
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(MENTOR_KEY, JSON.stringify(mentor));
    updateSaveButton(true);

    // Flash confirmation
    btnSaveMentor.textContent = 'Saved ✓';
    btnSaveMentor.style.borderColor = 'var(--color-success)';
    btnSaveMentor.style.color = 'var(--color-success)';
    setTimeout(() => {
      btnSaveMentor.textContent = 'Save Mentor Info';
      btnSaveMentor.style.borderColor = '';
      btnSaveMentor.style.color = '';
    }, 2000);
  }

  function updateSaveButton(hasMentor) {
    if (!btnSaveMentor) return;
    if (hasMentor) {
      btnSaveMentor.textContent = 'Update Mentor Info';
    }
  }

  function getMentor() {
    try {
      const raw = localStorage.getItem(MENTOR_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // ─── Character Sheet Stats ───

  function populateStats() {
    const state = PhoneState.load();
    if (!state) return;

    if (sitrepMind) sitrepMind.textContent = state.shape?.mind ?? '—';
    if (sitrepHeart) sitrepHeart.textContent = state.shape?.heart ?? '—';
    if (sitrepBody) sitrepBody.textContent = state.shape?.body ?? '—';
    if (sitrepAct) sitrepAct.textContent = state.shape?.act ?? '—';
    if (sitrepQuest) sitrepQuest.textContent = state.walk?.dare || state.walk?.path?.goal || 'None set';
  }

  // ─── Help Tag Toggles ───

  function toggleHelpTag(btn) {
    const tag = btn.dataset.tag;
    if (selectedHelpTags.has(tag)) {
      selectedHelpTags.delete(tag);
      btn.style.background = 'transparent';
      btn.style.color = 'var(--color-text-muted)';
      btn.style.borderColor = 'var(--color-border)';
    } else {
      selectedHelpTags.add(tag);
      btn.style.background = 'var(--color-accent)';
      btn.style.color = '#000';
      btn.style.borderColor = 'var(--color-accent)';
    }
  }

  // ─── Build SitRep Object ───

  function buildSitrep() {
    const state = PhoneState.load();
    const mentor = getMentor();

    return {
      timestamp: new Date().toISOString(),
      week: getWeekString(),
      client: {
        name: state.name || 'Anonymous',
        id: state.id
      },
      mentor: mentor ? {
        name: mentor.name,
        relationship: mentor.relationship
      } : null,
      characterSheet: {
        mind: state.shape?.mind,
        heart: state.shape?.heart,
        body: state.shape?.body,
        act: state.shape?.act,
        currentQuest: state.walk?.dare || state.walk?.path?.goal || 'None'
      },
      wins: sitrepWins?.value.trim() || '',
      struggles: sitrepStruggles?.value.trim() || '',
      helpNeeded: {
        tags: Array.from(selectedHelpTags),
        details: sitrepHelp?.value.trim() || ''
      }
    };
  }

  function getWeekString() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  // ─── Format SitRep as Human-Readable Text ───

  function formatSitrepAsText(sitrep) {
    const relationshipLabels = {
      guild_master: 'Guild Master',
      guild_officer: 'Guild Officer',
      party_member: 'Party Member',
      healer: 'Healer',
      paladin: 'Paladin',
      family: 'Family Support',
      other: 'Mentor'
    };

    const mentorTitle = sitrep.mentor
      ? relationshipLabels[sitrep.mentor.relationship] || 'Mentor'
      : 'Mentor';

    let text = `WEEKLY CHECK-IN — ${sitrep.week}\n`;
    text += `From: ${sitrep.client.name}\n`;
    text += `To: ${sitrep.mentor?.name || 'My ' + mentorTitle}\n`;
    text += `Date: ${new Date(sitrep.timestamp).toLocaleDateString()}\n`;
    text += `\n`;
    text += `── CHARACTER SHEET ──\n`;
    text += `Mind: ${sitrep.characterSheet.mind} | Heart: ${sitrep.characterSheet.heart} | Body: ${sitrep.characterSheet.body} | Act: ${sitrep.characterSheet.act}\n`;
    text += `Current Quest: ${sitrep.characterSheet.currentQuest}\n`;
    text += `\n`;

    if (sitrep.wins) {
      text += `── WHAT WENT WELL ──\n`;
      text += `${sitrep.wins}\n\n`;
    }

    if (sitrep.struggles) {
      text += `── WHAT WAS HARD ──\n`;
      text += `${sitrep.struggles}\n\n`;
    }

    if (sitrep.helpNeeded.tags.length > 0 || sitrep.helpNeeded.details) {
      text += `── WHAT I NEED ──\n`;
      if (sitrep.helpNeeded.tags.length > 0) {
        text += `Tags: ${sitrep.helpNeeded.tags.join(', ')}\n`;
      }
      if (sitrep.helpNeeded.details) {
        text += `${sitrep.helpNeeded.details}\n`;
      }
      text += `\n`;
    }

    text += `──\n`;
    text += `Sent via Phonethagoras — local-first, private, yours.\n`;

    return text;
  }

  // ─── AI Drafting ───
  
  async function draftHelpRequest() {
    const btn = document.getElementById('btn-ai-draft-help');
    if (!btn) return;
    
    // Check if Wllama is loaded
    const status = WllamaEngine.getStatus();
    if (!status.logicLoaded) {
      alert('The Liquid Brain (AI Logic) is not currently loaded. Please load it from the Dashboard settings first.');
      return;
    }

    const wins = sitrepWins?.value.trim() || '';
    const struggles = sitrepStruggles?.value.trim() || '';
    
    if (!struggles && !wins) {
      alert('Please write down some wins or struggles first so the AI has context to draft a request.');
      return;
    }

    btn.innerHTML = '<span>⏳</span> Thinking...';
    btn.disabled = true;

    try {
      const state = PhoneState.load();
      const currentQuest = state.walk?.dare || state.walk?.path?.goal || 'None';
      
      const prompt = `Draft a concise, polite 2-3 sentence request for help or guidance addressed to a mentor based on the following context. Keep it realistic, vulnerable but proactive. Do not include greetings or sign-offs, just the core message.
Context:
- User's Current Goal: ${currentQuest}
- What went well this week: ${wins || 'Nothing specific.'}
- Struggles this week: ${struggles || 'Nothing specific.'}
- Selected Help Tags: ${Array.from(selectedHelpTags).join(', ') || 'None'}`;

      const response = await WllamaEngine.chat([
        { role: 'system', content: 'Follow the instructions exactly.' },
        { role: 'user', content: prompt }
      ], {
        max_tokens: 100,
        temperature: 0.7
      });

      if (response && response.trim()) {
        sitrepHelp.value = response.trim();
        sitrepHelp.style.borderColor = 'var(--color-primary)';
        setTimeout(() => { sitrepHelp.style.borderColor = ''; }, 2000);
      }
    } catch (err) {
      console.error('[bridge] Draft failed:', err);
      alert('Failed to draft request. Make sure the AI logic is running.');
    } finally {
      btn.innerHTML = '<span>✨</span> Draft';
      btn.disabled = false;
    }
  }

  // ─── Send via WhatsApp (wa.me) ───

  function sendSitrep() {
    const sitrep = buildSitrep();

    // Validate minimum content
    if (!sitrep.wins && !sitrep.struggles) {
      alert('Write at least one thing about your week — wins or struggles — before sending.');
      return;
    }

    const mentor = getMentor();
    const email = mentor?.email || '';
    const subject = `Weekly Check-in — ${sitrep.client.name} — ${sitrep.week}`;
    const body = formatSitrepAsText(sitrep);

    // Save to local history before sending
    saveToHistory(sitrep);

    // Build WhatsApp link (wa.me)
    let waUrl = `https://wa.me/`;
    if (email && email.match(/^[+0-9]+$/)) { 
      waUrl += `${email.replace(/[^0-9]/g, '')}`;
    }
    waUrl += `?text=${encodeURIComponent(body)}`;

    // Open WhatsApp (Agnostic Routing)
    if (window.__TAURI__) {
      // Native NDK routing
      import('@tauri-apps/plugin-shell').then(module => {
        module.open(waUrl);
      }).catch(err => {
        console.warn('[bridge] Tauri shell plugin failed, falling back to window.open', err);
        window.open(waUrl, '_blank');
      });
    } else {
      // Web browser routing
      window.open(waUrl, '_blank');
    }

    // XP feedback
    showXpPopup('+25 XP (Weekly Bridge Report)');

    // Clear the form
    clearForm();

    // Refresh history
    renderHistory();
  }

  // ─── Download as File ───

  async function downloadSitrep() {
    const sitrep = buildSitrep();

    if (!sitrep.wins && !sitrep.struggles) {
      alert('Write at least one thing about your week before saving.');
      return;
    }

    // Save to local history
    saveToHistory(sitrep);

    // Save using Vault abstraction (either Tauri native FS or LocalStorage)
    const jsonContent = JSON.stringify(sitrep, null, 2);
    const textContent = formatSitrepAsText(sitrep);
    
    const safeName = sitrep.client.name.replace(/\\s+/g, '_') || 'user';
    
    try {
      await Vault.write(`SITREPS/sitrep_${sitrep.week}_${safeName}.json`, jsonContent);
      await Vault.write(`SITREPS/checkin_${sitrep.week}.md`, textContent);
      showXpPopup('+15 XP (Check-in Saved to Vault)');
    } catch (err) {
      console.error('[bridge] Failed to save SitRep to Vault', err);
      alert('Failed to save to Vault. Please check logs.');
    }

    clearForm();
    renderHistory();
  }

  // ─── History ───

  function getHistory() {
    try {
      const raw = localStorage.getItem(SITREP_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveToHistory(sitrep) {
    const history = getHistory();
    // Keep only the last 12 check-ins to avoid bloating localStorage
    history.unshift({
      week: sitrep.week,
      timestamp: sitrep.timestamp,
      winsPreview: (sitrep.wins || '').substring(0, 80),
      strugglesPreview: (sitrep.struggles || '').substring(0, 80),
      helpTags: sitrep.helpNeeded.tags,
      mentorName: sitrep.mentor?.name || 'Unknown'
    });
    if (history.length > 12) history.pop();
    localStorage.setItem(SITREP_HISTORY_KEY, JSON.stringify(history));
  }

  function renderHistory() {
    if (!historyContainer || !historyList) return;

    const history = getHistory();
    if (history.length === 0) {
      historyContainer.style.display = 'none';
      return;
    }

    historyContainer.style.display = 'block';
    historyList.innerHTML = '';

    history.forEach(entry => {
      const div = document.createElement('div');
      div.style.cssText = `
        padding: 0.6rem 0.8rem;
        background: var(--color-surface-2);
        border: 1px solid var(--color-border-subtle);
        border-radius: 6px;
        font-size: 0.8rem;
      `;

      const dateStr = new Date(entry.timestamp).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });

      let tagsHtml = '';
      if (entry.helpTags && entry.helpTags.length > 0) {
        tagsHtml = entry.helpTags.map(t =>
          `<span style="display: inline-block; padding: 0.1rem 0.4rem; background: var(--color-accent); color: #000; border-radius: 10px; font-size: 0.65rem; font-weight: 600;">${escapeHTML(t)}</span>`
        ).join(' ');
      }

      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
          <span style="font-weight: 600; color: var(--color-text);">${entry.week}</span>
          <span style="color: var(--color-text-dim); font-size: 0.75rem;">${dateStr}</span>
        </div>
        ${entry.winsPreview ? `<div style="color: var(--color-success); font-size: 0.75rem;">✓ ${escapeHTML(entry.winsPreview)}${entry.winsPreview.length >= 80 ? '…' : ''}</div>` : ''}
        ${entry.strugglesPreview ? `<div style="color: var(--color-heart); font-size: 0.75rem; margin-top: 0.2rem;">✗ ${escapeHTML(entry.strugglesPreview)}${entry.strugglesPreview.length >= 80 ? '…' : ''}</div>` : ''}
        ${tagsHtml ? `<div style="margin-top: 0.3rem; display: flex; flex-wrap: wrap; gap: 0.3rem;">${tagsHtml}</div>` : ''}
      `;
      historyList.appendChild(div);
    });
  }

  // ─── Helpers ───

  function clearForm() {
    if (sitrepWins) sitrepWins.value = '';
    if (sitrepStruggles) sitrepStruggles.value = '';
    if (sitrepHelp) sitrepHelp.value = '';
    selectedHelpTags.clear();
    if (helpTagsContainer) {
      helpTagsContainer.querySelectorAll('.help-tag-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--color-text-muted)';
        btn.style.borderColor = 'var(--color-border)';
      });
    }
  }

  function showXpPopup(text) {
    const popup = document.createElement('div');
    popup.className = 'xp-popup';
    popup.textContent = text;
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 2000);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    getMentor,
    buildSitrep,
    getHistory
  };
})();
