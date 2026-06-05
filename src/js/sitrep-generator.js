/**
 * SITREP GENERATOR — Mentorship Bridge
 * 
 * Generates a concise "Situation Report" from the user's local state.
 * This synthesizes their LitRPG attributes, active quests, and PEARL phase
 * into a shareable snapshot for their life coach or mentor.
 * 
 * 100% local, privacy-first.
 */

import { PhoneState } from './state.js';

export const SitRepGenerator = (() => {

  /**
   * Generates a markdown-formatted Situation Report.
   * @returns {string} The formatted report
   */
  function generateReport() {
    const state = PhoneState.load();
    
    const { mind, heart, body, act } = state.shape || { mind: 10, heart: 10, body: 10, act: 10 };
    const { focus, guard } = state.pulse || { focus: 0.5, guard: 0.5 };
    const face = state.face || 'Unawakened';
    const activeDare = state.walk?.dare || 'None';
    const activeGoal = state.walk?.path?.goal || 'No active goal.';
    
    // Calculate S.I.L.K. Total (Sum of all attributes)
    const silkTotal = mind + heart + body + act;
    
    const today = new Date().toLocaleDateString();

    let report = `### 🛡️ MENTORSHIP SITREP — ${today}\n\n`;
    
    report += `**Client:** ${state.name || 'Anonymous'}\n`;
    report += `**Current Face (Class):** ${face}\n`;
    report += `**Active PEARL Phase:** ${state.pearlState.toUpperCase()}\n\n`;

    report += `#### 📊 S.I.L.K. Attributes (Total XP: ${silkTotal})\n`;
    report += `- **Mind (Intellect/Strategy):** ${mind}\n`;
    report += `- **Heart (Empathy/Courage):** ${heart}\n`;
    report += `- **Body (Health/Vitality):** ${body}\n`;
    report += `- **Act (Execution/Discipline):** ${act}\n\n`;

    report += `#### 🩺 Biometric Pulse\n`;
    report += `- **Focus (Attention Stewardship):** ${Math.round(focus * 100)}%\n`;
    report += `- **Guard (Armor/Vulnerability):** ${Math.round(guard * 100)}%\n\n`;

    report += `#### 🎯 Active Commitments\n`;
    report += `- **Current Goal:** ${activeGoal}\n`;
    report += `- **Current Dare:** ${activeDare}\n\n`;

    report += `#### 📝 Help Request / Notes\n`;
    report += `(Client: Please add any specific questions or areas you need help with here before sending.)\n`;

    return report;
  }

  /**
   * Generates the report and returns a mailto: URI
   * @param {string} email - Mentor's email address
   * @returns {string} mailto URI
   */
  function generateMailtoLink(email) {
    const report = generateReport();
    const subject = `Weekly SitRep: ${new Date().toLocaleDateString()}`;
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(report)}`;
  }

  return {
    generateReport,
    generateMailtoLink
  };
})();
