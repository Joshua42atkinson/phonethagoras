/**
 * COACH BRIDGE CONTROLLER — phone.com
 * 
 * Implements the caseload dashboard and the "Help/Up" sorting algorithm.
 * Dynamically evaluates player states based on Self-Determination Theory (autonomy, relatedness, competence)
 * and cognitive metrics to determine caseload priorities.
 */

import { PhoneState } from './state.js';

export const PhoneBridge = (() => {
  let caseloadListEl;

  function init() {
    caseloadListEl = document.getElementById('caseload-list');
    if (!caseloadListEl) return;

    renderCaseload();

    // Re-render when the user switches to this panel to show live state updates
    const navBridgeBtn = document.getElementById('nav-bridge');
    if (navBridgeBtn) {
      navBridgeBtn.addEventListener('click', renderCaseload);
    }
  }

  function getSimulatedClients() {
    return [
      {
        id: "sim-client-1",
        name: "Sarah Jenkins",
        story: "Military spouse, seeking admin work after relocation",
        roots: { own: 0.85, bond: 0.90, skill: 0.75 },
        walk: { path: { steps: [{ done: true }, { done: true }, { done: true }] } },
        pulse: { focus: 0.95, guard: 0.80 }
      },
      {
        id: "sim-client-2",
        name: "Marcus Rivera",
        story: "Combat veteran, PTSD, struggling with focus and isolation",
        roots: { own: 0.30, bond: 0.20, skill: 0.40 },
        walk: { path: { steps: [{ done: false }, { done: false }, { done: false }] } },
        pulse: { focus: 0.35, guard: 0.20 }
      },
      {
        id: "sim-client-3",
        name: "David Choi",
        story: "In recovery, pursuing IT certification, 6 months sober",
        roots: { own: 0.60, bond: 0.50, skill: 0.55 },
        walk: { path: { steps: [{ done: true }, { done: false }, { done: false }] } },
        pulse: { focus: 0.70, guard: 0.50 }
      },
      {
        id: "sim-client-4",
        name: "Alicia Thompson",
        story: "Single mom, 2 kids, needs evening-shift work and childcare",
        roots: { own: 0.55, bond: 0.75, skill: 0.35 },
        walk: { path: { steps: [{ done: true }, { done: true }, { done: false }] } },
        pulse: { focus: 0.60, guard: 0.55 }
      },
      {
        id: "sim-client-5",
        name: "James Whitfield",
        story: "Recently released, rebuilding, needs ID docs and housing",
        roots: { own: 0.25, bond: 0.15, skill: 0.30 },
        walk: { path: { steps: [{ done: false }, { done: false }, { done: false }] } },
        pulse: { focus: 0.40, guard: 0.25 }
      }
    ];
  }

  function sortCaseload(players) {
    return players.map(player => {
      const autonomy = player.roots.own;
      const competence = player.roots.skill;
      const attention = player.pulse.focus;
      const milestones = player.walk.path.steps;
      
      const completedSteps = milestones.filter(m => m.done).length;
      const complianceRate = completedSteps / milestones.length;

      // Readiness Score Formula from Spec: (autonomy * 0.4) + (competence * 0.3) + (complianceRate * 0.3)
      const readinessScore = (autonomy * 0.4) + (competence * 0.3) + (complianceRate * 0.3);

      let actionRequired = "HOLD";
      if (readinessScore >= 0.75) {
        actionRequired = "UP"; // Promotion challenge
      } else if (readinessScore < 0.40 || attention < 0.5) {
        actionRequired = "HELP"; // Immediate intervention needed
      }

      return {
        ...player,
        readinessScore,
        actionRequired
      };
    }).sort((a, b) => b.readinessScore - a.readinessScore);
  }

  function renderCaseload() {
    if (!caseloadListEl) return;

    // Load actual user state
    const userState = PhoneState.load();
    const formattedUser = {
      id: userState.id,
      name: `YOU (${userState.name})`,
      story: userState.story || "Active client in transition",
      roots: userState.roots,
      walk: userState.walk,
      pulse: userState.pulse
    };

    // Combine with simulated database entries
    const rawCaseload = [formattedUser, ...getSimulatedClients()];
    const sortedCaseload = sortCaseload(rawCaseload);

    // Clear output
    caseloadListEl.innerHTML = '';

    sortedCaseload.forEach(client => {
      const row = document.createElement('div');
      row.className = 'caseload-row';

      // Badge styling
      let badgeBg = 'hsla(43, 55%, 50%, 0.15)';
      let badgeColor = 'var(--color-act)';
      if (client.actionRequired === 'UP') {
        badgeBg = 'hsla(150, 38%, 46%, 0.15)';
        badgeColor = 'var(--color-mind)';
      } else if (client.actionRequired === 'HELP') {
        badgeBg = 'hsla(25, 65%, 53%, 0.15)';
        badgeColor = 'var(--color-heart)';
      }

      row.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
          <span style="font-weight: 600; color: var(--color-text);">${escapeHTML(client.name)}</span>
          <span style="font-size: 0.75rem; color: var(--color-text-dim); line-height: 1.2;">${escapeHTML(client.story)}</span>
        </div>
        <div style="text-align: center; font-family: var(--font-mono); font-weight: 500;">
          ${Math.round(client.readinessScore * 100)}%
        </div>
        <div style="text-align: center; font-family: var(--font-mono); font-weight: 500; color: ${client.pulse.focus < 0.5 ? 'var(--color-heart)' : 'var(--color-text)'}">
          ${Math.round(client.pulse.focus * 100)}%
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; font-family: var(--font-mono); background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}40;">
            ${client.actionRequired}
          </span>
        </div>
      `;

      caseloadListEl.appendChild(row);
    });
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init
  };
})();
