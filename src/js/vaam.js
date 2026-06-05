/**
 * VAAM — Vocabulary Acquisition Autonomy Mastery
 * 
 * "A word isn't defined by other words. It's defined by experience."
 * 
 * The VAAM engine runs on every interaction:
 *   1. LISTEN  — scan the user's natural language
 *   2. DETECT  — find vocabulary that matters  
 *   3. WEIGHT  — how much does this word mean to this person?
 *   4. MIRROR  — reflect the pattern back
 *   5. ADAPT   — change the system's response
 *
 * Ported from trinity-protocol/vaam_profile.rs (516 lines)
 * and trinity-iron-road/vaam/cognitive_load.rs (117 lines)
 */

import { Polarity } from './polarity.js';
import { PhoneState } from './state.js';

  const STORAGE_KEY = 'zen_vaam_profile';

  // ─── Cognitive Load (exact port from cognitive_load.rs) ───
  function countSyllables(word) {
    const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!clean) return 0;
    const vowels = new Set(['a','e','i','o','u','y']);
    let count = 0;
    let lastWasVowel = false;
    for (const ch of clean) {
      const isVowel = vowels.has(ch);
      if (isVowel && !lastWasVowel) count++;
      lastWasVowel = isVowel;
    }
    if (clean.endsWith('e') && count > 1) count--;
    return Math.max(count, 1);
  }

  function calculateCognitiveLoad(text, knownWords = []) {
    const words = text.split(/\s+/).filter(Boolean);
    const totalWords = words.length;
    const sentences = Math.max(text.split(/[.!?]/).filter(Boolean).length, 1);
    const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
    
    const wordsPerSentence = totalWords / sentences;
    const syllablesPerWord = totalSyllables / Math.max(totalWords, 1);
    const fleschKincaidGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
    
    const complexWords = words.filter(w => countSyllables(w) >= 3).length;
    const knownSet = new Set(knownWords.map(w => w.toLowerCase()));
    const matchedKnown = words.filter(w => {
      const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
      return knownSet.has(clean);
    }).length;
    const tierMatchPercentage = complexWords > 0
      ? (matchedKnown / complexWords) * 100
      : 100;
    
    return { totalWords, complexWords, fleschKincaidGrade, tierMatchPercentage };
  }

  // ─── Word Weight (port from vaam_profile.rs WordWeight) ───
  function createWordWeight() {
    return { timesChosen: 0, timesAvailable: 0, deliberateChoices: 0, affinity: 0 };
  }

  function recalculateAffinity(ww) {
    const frequency = ww.timesChosen / Math.max(ww.timesAvailable, 1);
    const deliberateRatio = ww.timesChosen > 0
      ? 0.5 + 0.5 * (ww.deliberateChoices / ww.timesChosen)
      : 0.5;
    ww.affinity = Math.min(frequency * deliberateRatio, 1.0);
  }

  // ─── Communication Style (port from vaam_profile.rs CommunicationStyle) ───
  function createStyle() {
    return { brevity: 0.5, directness: 0.5 };
  }

  function updateStyle(style, wordCount, questionCount, statementCount, totalInteractions) {
    const alpha = totalInteractions < 10 ? 0.3 : 0.1;
    const brevitySample = 1.0 - Math.min(wordCount / 50, 1.0);
    style.brevity = style.brevity * (1 - alpha) + brevitySample * alpha;
    const totalUtterances = Math.max(questionCount + statementCount, 1);
    const directnessSample = statementCount / totalUtterances;
    style.directness = style.directness * (1 - alpha) + directnessSample * alpha;
  }

  // ─── VAAM Profile ───
  function createProfile() {
    return {
      wordWeights: {},
      style: createStyle(),
      keystrokes: { wpmAvg: 0, correctionRateAvg: 0, pauseCountTotal: 0 },
      interactionsAnalyzed: 0,
      discovered: {},  // word → timesUsed
      mastered: [],     // words that hit Rule of Three
      totalDepthEarned: 0,
    };
  }

  // ─── Persistence ───
  function loadProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) { console.warn('[VAAM] Failed to load profile:', e); }
    return createProfile();
  }

  function saveProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch(e) { console.warn('[VAAM] Failed to save profile:', e); }
  }

  // ─── Core API ───
  let profile = loadProfile();

  function recordWordUsage(word, deliberate = false) {
    const key = word.toLowerCase();
    if (!profile.wordWeights[key]) {
      profile.wordWeights[key] = createWordWeight();
    }
    const ww = profile.wordWeights[key];
    ww.timesChosen++;
    ww.timesAvailable++;
    if (deliberate) ww.deliberateChoices++;
    recalculateAffinity(ww);
    saveProfile(profile);
  }

  function recordInteraction(wordCount, questionCount, statementCount) {
    profile.interactionsAnalyzed++;
    updateStyle(profile.style, wordCount, questionCount, statementCount, profile.interactionsAnalyzed);
    saveProfile(profile);
  }

  function recordKeystrokes(metrics) {
    if (!profile.keystrokes) {
      profile.keystrokes = { wpmAvg: 0, correctionRateAvg: 0, pauseCountTotal: 0 };
    }
    const alpha = profile.interactionsAnalyzed < 10 ? 0.3 : 0.1;
    profile.keystrokes.wpmAvg = profile.keystrokes.wpmAvg * (1 - alpha) + metrics.wpm * alpha;
    profile.keystrokes.correctionRateAvg = profile.keystrokes.correctionRateAvg * (1 - alpha) + metrics.correctionRate * alpha;
    profile.keystrokes.pauseCountTotal += metrics.pauseCount;
    saveProfile(profile);
  }

  function scanMessage(text, vocabulary = []) {
    const lower = text.toLowerCase();
    const detections = [];
    for (const entry of vocabulary) {
      const word = (typeof entry === 'string') ? entry : entry.word;
      const wordLower = word.toLowerCase();
      if (lower.includes(wordLower)) {
        // Check context clues if available
        const contextClues = (typeof entry === 'object' && entry.context) ? entry.context : [];
        const hasContext = contextClues.length === 0 || contextClues.some(c => lower.includes(c.toLowerCase()));
        
        // Record discovery / mastery
        if (!profile.discovered[wordLower]) {
          profile.discovered[wordLower] = 0;
        }
        profile.discovered[wordLower]++;
        const timesUsed = profile.discovered[wordLower];
        const newlyMastered = timesUsed === 3 && !profile.mastered.includes(wordLower);
        if (newlyMastered) {
          profile.mastered.push(wordLower);
        }
        
        detections.push({
          word,
          correctUsage: hasContext,
          timesUsed,
          newlyMastered,
        });
      }
    }
    if (detections.length > 0) saveProfile(profile);
    return detections;
  }

  function topWords(n = 10) {
    return Object.entries(profile.wordWeights)
      .sort((a, b) => b[1].affinity - a[1].affinity)
      .slice(0, n)
      .map(([word, ww]) => ({ word, affinity: ww.affinity }));
  }

  function promptSummary() {
    let summary = `[VAAM Telemetry]\n`;
    
    // 1. Stress injection
    if (stressState === 'high_stress') {
      summary += `STATE: HIGH STRESS DETECTED. User is dysregulated. DO NOT ask complex questions. Guide them to ground themselves immediately.\n`;
    } else {
      summary += `STATE: Nominal.\n`;
    }

    // 2. Polarity Injection
    const polarityAlert = Polarity.getImbalanceAlert();
    if (polarityAlert) {
      summary += `${polarityAlert}\n`;
    }

    // 3. Core Constraints
    summary += `CORE RULE: All interventions must be consensual. Do NOT interrogate or force self-help. If the user does not opt-in, just listen. If cognitive load is high, simply use shorter sentences.`;
    
    return summary;
  }

  function getProfile() { return { ...profile }; }
  function resetProfile() {
    profile = createProfile();
    saveProfile(profile);
    return profile;
  }

export const VAAM = {
    countSyllables,
    calculateCognitiveLoad,
    recordWordUsage,
    recordInteraction,
    recordKeystrokes,
    scanMessage,
    topWords,
    promptSummary,
    getProfile,
    resetProfile,
  };
