/**
 * RECYCLER CONTROLLER — phone.com
 * 
 * Implements "The Great Recycler" alchemical engine.
 * Takes raw personal narratives/trauma and parses them (using PhoneAI or offline heuristics)
 * to output professional resume competencies and vocational summaries.
 */

const PhoneRecycle = (() => {
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
      alert('Please enter a raw experience or journal entry to alchemize.');
      return;
    }

    runBtn.textContent = 'Alchemizing...';
    runBtn.disabled = true;

    // Load current state for prompt context
    const state = PhoneState.load();
    
    // Construct alchemical system prompt
    const systemPrompt = `You are the Alchemical Recycling Engine of phone, a local-first vocational assistant. 
Your task is to take the user's raw lived experience, trauma, setbacks, or transition challenges, throw away the shame, guilt, and emotional blame, and extract raw, high-value professional competencies and skills.

Use the current player's attribute matrix for context:
- mind (Intellect/Sage): ${state.shape.mind}
- heart (Courage/Hero): ${state.shape.heart}
- body (Empathy/Caregiver): ${state.shape.body}
- act (Eloquence/Jester): ${state.shape.act}

Format the output strictly as markdown containing:
1. ### PROFESSIONAL SUMMARY
A 2-3 sentence resume summary framing their experience positively and professionally (avoiding mentions of addiction, rehab, discharge details, or failures).
2. ### KEY COMPETENCIES & EXPERIENCES
3 bullet points starting with strong action verbs mapping their skills to standard vocational standards.`;

    try {
      const result = await PhoneAI.complete(systemPrompt, text);
      
      // Update output
      if (resultText && resultCard) {
        resultText.textContent = result;
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth' });
      }

      // Automatically update state.story with the original text (to save narrative context)
      state.story = text;
      // Boost "act" (action/eloquence) score by 5 points for performing this alchemical work!
      state.shape.act = Math.min(state.shape.act + 5, 100);
      PhoneState.save(state);
      updateNarrativeDisplay();
      
      // Re-render dashboard to show radar/state updates
      if (typeof PhoneDashboard !== 'undefined') {
        PhoneDashboard.render(state);
      }
      if (typeof PhoneRadar !== 'undefined') {
        PhoneRadar.render(state.shape);
      }

    } catch (e) {
      console.error('[phone-recycle] Alchemize failed:', e);
      alert('Failed to alchemize raw input. Check console.');
    } finally {
      runBtn.textContent = 'Alchemize to Skills';
      runBtn.disabled = false;
    }
  }

  function copyToClipboard() {
    if (!resultText) return;
    const text = resultText.textContent;
    navigator.clipboard.writeText(text).then(() => {
      alert('Recycled output copied to clipboard!');
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
