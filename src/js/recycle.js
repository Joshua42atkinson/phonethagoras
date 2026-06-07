/**
 * RECYCLER CONTROLLER — phone.com
 * 
 * Implements "The Reframing Engine".
 * Takes raw personal narratives/trauma and parses them (using PhoneAI or offline heuristics)
 * to output professional resume competencies through third-person cognitive detachment.
 */

import { PhoneState } from './state.js';
import { PhoneAI } from './ai.js';
import { PhoneDashboard } from './dashboard.js';
import { PhoneRadar } from './radar.js';

export const PhoneRecycle = (() => {
  let rawInput, runBtn, storyContextVal, resultCard, resultText, copyBtn, syncBtn;

  function init() {
    rawInput = document.getElementById('recycle-raw-input');
    runBtn = document.getElementById('btn-run-recycler');
    storyContextVal = document.getElementById('recycle-story-context');
    resultCard = document.getElementById('card-recycle-result');
    resultText = document.getElementById('recycle-result-text');
    copyBtn = document.getElementById('btn-copy-recycled');
    syncBtn = document.getElementById('btn-drive-sync-recycled');

    if (!runBtn) return; // Exit if not on page

    // 1. Load initial narrative context
    updateNarrativeDisplay();

    // 2. Wire listeners
    runBtn.addEventListener('click', runRecycler);
    copyBtn.addEventListener('click', copyToClipboard);
    syncBtn.addEventListener('click', syncToGoogleDoc);
  }

  function updateNarrativeDisplay() {
    if (!storyContextVal) return;
    const state = PhoneState.load();
    if (state.story) {
      storyContextVal.textContent = state.story;
    } else {
      storyContextVal.textContent = 'None logged yet. Start typing below.';
    }
  }

  async function runRecycler() {
    const text = rawInput.value.trim();
    if (!text) {
      alert('Write about what happened — messy is fine. The engine will find the skills.');
      return;
    }

    runBtn.textContent = 'Finding your skills...';
    runBtn.disabled = true;

    // Load current state for prompt context
    const state = PhoneState.load();
    
    // Construct reframing system prompt
    const systemPrompt = `You are the System Console of Phonethagoras, a LitRPG self-mastery engine. 
Your task is to take the user's raw, loud, messy lived experience, trauma, setbacks, or transition challenges, and process them as unrefined EXP. 
Do NOT tell them to calm down. Validate the intensity as raw power. 
Extract their actions, endurance, and strategy to forge professional competencies and skills for the Main Character.

Use the current player's stats for context:
- mind: ${state.shape.mind}
- heart: ${state.shape.heart}
- body: ${state.shape.body}
- act: ${state.shape.act}

Format the output strictly as markdown containing:
1. ### QUEST LOG: THE CHARACTER'S JOURNEY
A short paragraph rewriting their experience in the third person (e.g. "The Main Character experienced X..."). This creates cognitive distance while honoring the epic nature of their survival.
2. ### STATUS UPDATE: UNLOCKED CLASS & PLAYSTYLE
A 2-3 sentence summary framing their reframed experience as an unlocked "Class" (e.g. "The Resilient Coordinator") and their overarching "Playstyle" (professional summary).
3. ### NEW CLASS SKILLS & PERKS
3 bullet points starting with strong action verbs. Frame them as "Unlocked Perks" or "Skill Tree Nodes" that map directly to standard vocational resume standards (e.g., Crisis Management, Strategic Resource Allocation).`;

    try {
      const result = await PhoneAI.complete(systemPrompt, text);
      
      // Update output
      if (resultText && resultCard) {
        resultText.textContent = result;
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth' });
      }

      // Add XP Gamification Popup
      const xpPopup = document.createElement('div');
      xpPopup.className = 'xp-popup';
      xpPopup.textContent = '+50 XP (S.I.L.K. Skill Unlocked)';
      xpPopup.style.left = '50%';
      xpPopup.style.top = '50%';
      xpPopup.style.transform = 'translate(-50%, -50%)';
      document.body.appendChild(xpPopup);
      setTimeout(() => xpPopup.remove(), 2000);

      // Automatically update state.story with the original text (to save narrative context)
      state.story = text;
      PhoneState.save(state);
      updateNarrativeDisplay();
      
    } catch (e) {
      console.error('[phone-recycle] Alchemize failed:', e);
      alert('Failed to alchemize raw input. Check console.');
    } finally {
      runBtn.textContent = 'Find the Skills in My Story';
      runBtn.disabled = false;
    }
  }

  function copyToClipboard() {
    if (!resultText) return;
    const text = resultText.textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy Text', 2000);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }

  function syncToGoogleDoc() {
    if (!resultText) return;
    const text = resultText.textContent;

    // Simulate Google Drive API Sync
    syncBtn.textContent = 'Syncing...';
    syncBtn.disabled = true;

    setTimeout(() => {
      alert(`[Drive Sync] Successfully synchronized document to Google Drive!
File: 'Phonethagoras - Recycled Skills.gdoc'
Scope: drive.file (Access limited to this specific file only)`);
      syncBtn.textContent = 'Sync to Google Doc';
      syncBtn.disabled = false;
    }, 1200);
  }

  return {
    init
  };
})();
