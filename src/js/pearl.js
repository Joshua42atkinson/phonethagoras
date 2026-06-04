/**
 * PEARL — Prepare, Explore, Act, Reflect, Learn
 * 
 * The interaction loop for the Iron Road. Replaces open-ended chat
 * with structured reasoning and attention management.
 */

const PEARL = (() => {
  const PHASES = Object.freeze({
    ASSESSMENT: 'assessment',
    CHARACTER_SHEET: 'character_sheet',
    QUEST_LOG: 'quest_log',
    INVENTORY: 'inventory',
    LEVEL_UP: 'level_up'
  });

  let currentState = PHASES.ASSESSMENT;
  let assessmentStep = 0; // 0: Greeting, 1: Investigation, 2: Proposal

  // Each phase has a specific system prompt modifier for the AI
  const PHASE_CONTEXTS = {
    [PHASES.ASSESSMENT]: [
      "The user is in the NEEDS ASSESSMENT phase (Greeting). Ask what their immediate real-world blocker or goal is.",
      "The user is in the NEEDS ASSESSMENT phase (Investigation). Ask 1 or 2 follow-up questions to understand if this is a skill issue, a resource issue, or a scheduling issue.",
      "The user is in the NEEDS ASSESSMENT phase (Proposal). Propose a concrete 'Quest Title' for them to tackle today, and ask if they Accept."
    ],
    [PHASES.CHARACTER_SHEET]: "The user is in the CHARACTER SHEET phase. Review their Character Sheet with them transparently. This is their data, and you must make it clear they control it. Help them translate their raw experiences and struggles into employable skills or resume points. Use RPG stat analogies.",
    [PHASES.QUEST_LOG]: "The user is in the QUEST LOG phase. Help them break down their big goal into small, actionable 'Dailies'. Encourage them to put these in their Google Calendar.",
    [PHASES.INVENTORY]: "The user is in the INVENTORY phase. Ask if they have the necessary 'Loot' (forms, documents, resume drafts). Tell them to organize this in their Google Drive Portfolio.",
    [PHASES.LEVEL_UP]: "The user is in the LEVEL UP phase. Help them close the chapter on a completed task and reflect on how their 'Character' has grown. Congratulate them."
  };

  function getState() {
    return currentState;
  }

  // Readiness signals — user is explicitly saying "I'm done with this phase"
  const READINESS_PATTERN = /\b(yes|yeah|sure|okay|ok|accept|do it|next|done|ready|let's go|move on|continue)\b/;

  function advanceState(userInput = "") {
    const text = userInput.toLowerCase().trim();
    
    // Don't advance on very short or empty input
    if (text.length < 3) return currentState;
    
    switch (currentState) {
      case PHASES.ASSESSMENT: 
        if (assessmentStep < 2) {
          // Only advance sub-steps when the user gives a substantive response (>10 chars)
          if (text.length > 10) {
            assessmentStep++;
          }
        } else {
          // At the proposal step — wait for explicit acceptance
          if (READINESS_PATTERN.test(text)) {
            currentState = PHASES.CHARACTER_SHEET; 
            assessmentStep = 0;
          }
        }
        break;
      // Post-assessment phases require user to signal readiness before advancing
      case PHASES.CHARACTER_SHEET:
        if (READINESS_PATTERN.test(text)) currentState = PHASES.QUEST_LOG;
        break;
      case PHASES.QUEST_LOG:
        if (READINESS_PATTERN.test(text)) currentState = PHASES.INVENTORY;
        break;
      case PHASES.INVENTORY:
        if (READINESS_PATTERN.test(text)) currentState = PHASES.LEVEL_UP;
        break;
      case PHASES.LEVEL_UP:
        if (READINESS_PATTERN.test(text)) currentState = PHASES.ASSESSMENT; // loop back
        break;
    }
    document.dispatchEvent(new CustomEvent('pearl-state-changed', { detail: currentState }));
    return currentState;
  }

  function getSystemPromptModifier() {
    if (currentState === PHASES.ASSESSMENT) {
      return PHASE_CONTEXTS[PHASES.ASSESSMENT][assessmentStep];
    }
    return PHASE_CONTEXTS[currentState];
  }

  function checkCoachRouting(userInput) {
    // Only route to coach for genuine crisis/danger signals.
    // Everyday emotional words (overwhelmed, anxious, stressed) are normal coaching topics
    // and should be handled by the AI, not dismissed to a coach.
    const crisisWords = [
      'suicide', 'kill myself', 'want to die', 'self harm', 'self-harm',
      'abuse', 'domestic violence', 'molest', 'trafficking'
    ];
    const text = userInput.toLowerCase();
    for (const phrase of crisisWords) {
      if (text.includes(phrase)) {
        return true;
      }
    }
    return false;
  }

  return {
    PHASES,
    getState,
    advanceState,
    getSystemPromptModifier,
    checkCoachRouting
  };
})();

// Export for module systems or window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PEARL;
} else {
  window.PEARL = PEARL;
}
