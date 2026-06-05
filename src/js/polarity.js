/**
 * POLARITY — The Balance Engine
 * Analyzes the user's attribute diamond to detect imbalance and inject constraints.
 */
import { PhoneState } from './state.js';

export const Polarity = {
  getImbalanceAlert() {
    const state = PhoneState.load();
    const { mind, heart, body, act } = state.shape;
    
    const traits = { mind, heart, body, act };
    let highest = { name: '', val: -1 };
    let lowest = { name: '', val: 101 };

    for (const [key, val] of Object.entries(traits)) {
      if (val > highest.val) highest = { name: key, val };
      if (val < lowest.val) lowest = { name: key, val };
    }

    const diff = highest.val - lowest.val;
    
    // Threshold for imbalance is 20 points
    if (diff >= 20) {
      if (highest.name === 'mind' && lowest.name === 'act') {
        return `[CRITICAL IMBALANCE: ANALYSIS PARALYSIS] The user's Mind is high but Act is dangerously low. Refuse to engage in theoretical or philosophical discussion. Guide them aggressively toward taking physical, real-world action immediately.`;
      }
      if (highest.name === 'heart' && lowest.name === 'mind') {
        return `[CRITICAL IMBALANCE: EMOTIONAL FLOODING] The user's Heart is high but Mind is low. They are reacting entirely on emotion without logic. Guide them to pause, breathe, and rationally map out the situation.`;
      }
      if (highest.name === 'act' && lowest.name === 'heart') {
        return `[CRITICAL IMBALANCE: RECKLESS MOMENTUM] The user's Act is high but Heart is low. They are moving fast without considering the human impact or their own emotional truth. Force them to slow down and reflect on *why* they are acting.`;
      }
      if (highest.name === 'body' && lowest.name === 'mind') {
        return `[CRITICAL IMBALANCE: BLIND ENDURANCE] The user's Body is high but Mind is low. They are enduring hardship without strategizing a way out. Prompt them to stop just surviving and start plotting a solution.`;
      }
      
      // Generic fallback
      return `[IMBALANCE ALERT] The user is leaning heavily on their '${highest.name}' trait and neglecting their '${lowest.name}'. Gently guide them to exercise their '${lowest.name}' to regain equilibrium.`;
    }

    return null; // Balanced
  }
};
