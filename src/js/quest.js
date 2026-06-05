/**
 * QUEST — The Path Engine
 * Manages Commitment Contracts and milestone checking.
 */
import { PhoneState } from './state.js';

export const PhoneQuest = (function() {
  let containerEl;
  let goalTitleEl;

  function init() {
    containerEl = document.getElementById('quest-container');
    goalTitleEl = document.getElementById('path-goal-title');
    
    // Initial Render
    render(PhoneState.load());

    // Listen for state changes
    PhoneState.on('state:changed', (state) => {
      render(state);
    });

    // Event delegation for checkbox toggles
    if (containerEl) {
      containerEl.addEventListener('change', (e) => {
        if (e.target.classList.contains('quest-checkbox')) {
          const stepIndex = parseInt(e.target.dataset.index, 10);
          toggleStep(stepIndex, e.target.checked);
        }
      });
    }
  }

  function render(state) {
    if (!containerEl || !goalTitleEl) return;
    
    const path = state.walk?.path;
    if (!path) {
      goalTitleEl.textContent = "no active path";
      containerEl.innerHTML = `<div class="quest-empty">Seek guidance in the chat to forge a new path.</div>`;
      return;
    }

    goalTitleEl.textContent = path.goal || "active commitment";
    
    if (!path.steps || path.steps.length === 0) {
      containerEl.innerHTML = `<div class="quest-empty">No steps defined.</div>`;
      return;
    }

    let html = '<ul class="quest-list" style="list-style:none; padding:0; margin:1rem 0;">';
    path.steps.forEach((step, idx) => {
      const checked = step.done ? 'checked' : '';
      const style = step.done ? 'text-decoration:line-through; opacity:0.5;' : '';
      html += `
        <li style="display:flex; align-items:flex-start; margin-bottom:0.75rem;">
          <input type="checkbox" class="quest-checkbox" data-index="${idx}" ${checked} style="margin-top:0.25rem; margin-right:0.75rem; accent-color: var(--color-accent); cursor:pointer;">
          <span style="${style} font-size:0.95rem; line-height:1.4;">${step.act}</span>
        </li>
      `;
    });
    html += '</ul>';

    // If all done
    const allDone = path.steps.every(s => s.done);
    if (allDone) {
      html += `<div style="text-align:center; color:var(--color-accent); margin-top:1rem; font-family:var(--font-mono); font-size:0.9rem;">PATH COMPLETE</div>`;
    }

    containerEl.innerHTML = html;
  }

  function toggleStep(index, isDone) {
    const state = PhoneState.load();
    if (state.walk && state.walk.path && state.walk.path.steps[index]) {
      state.walk.path.steps[index].done = isDone;
      state.walk.path.steps[index].at = isDone ? new Date().toISOString() : null;
      
      // Award XP based on polarity
      if (isDone) {
        awardXP(state);
      }
      
      PhoneState.save(state); // Persists to IndexedDB via PhoneState logic
    }
  }

  function awardXP(state) {
    // Add +1 to the 'act' stat for completing a physical checklist item
    state.shape.act = Math.min(100, state.shape.act + 1);
    // Add +0.01 to the 'own' root (Autonomy) for self-directed completion
    state.roots.own = Math.min(1.0, state.roots.own + 0.01);
  }

  return { init, render };
})();
