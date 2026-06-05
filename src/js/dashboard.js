/**
 * DASHBOARD CONTROLLER
 * 
 * Populates all dashboard cards from the player state:
 * - Roots (own, bond, skill) bars
 * - Walk status + steps
 * - Pulse (focus, guard) gauges
 * - Identity (self)
 */

import { ZEN_CONST } from './data/constants.js';

export const PhoneDashboard = (() => {

  /**
   * Render the full dashboard from a player state object
   */
  function render(state) {
    renderRoots(state.roots);
    renderWalk(state.walk);
    renderFirebox(state.thermo);
    renderPearl(state.pearlState);
    renderIdentity(state);
  }

  // ─── Roots Topology ───
  function renderRoots(roots) {
    animateBar('root-own-bar', roots.own);
    animateBar('root-bond-bar', roots.bond);
    animateBar('root-skill-bar', roots.skill);

    setText('root-own-val', formatPercent(roots.own));
    setText('root-bond-val', formatPercent(roots.bond));
    setText('root-skill-val', formatPercent(roots.skill));
  }

  // ─── Walk ───
  function renderWalk(walk) {
    setText('walk-depth', walk.depth);
    setText('walk-dare', walk.dare);

    const container = document.getElementById('walk-steps');
    if (container && walk.path) {
      container.innerHTML = '';
      const steps = walk.path.steps || [];

      steps.forEach(m => {
        const div = document.createElement('div');
        div.className = `milestone ${m.done ? 'completed' : ''}`;
        div.innerHTML = `
          <span class="milestone-check">${m.done ? '✓' : '○'}</span>
          <span class="milestone-text">${escapeHTML(m.act)}</span>
        `;
        container.appendChild(div);
      });

      // Progress bar
      const completed = steps.filter(m => m.done).length;
      const pct = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;
      animateBar('walk-progress-bar', pct / 100);
      setText('walk-progress-text', `${pct}%`);
    }
  }

  // ─── Firebox Gauges ───
  function renderFirebox(thermo) {
    if (!thermo) return;
    const circumference = 2 * Math.PI * 50; // r=50

    // Coal (Stamina), max 100
    const coalPct = Math.min(Math.max(thermo.coal / 100, 0), 1);
    animateGauge('gauge-coal-arc', coalPct, circumference);
    setText('gauge-coal-val', thermo.coal);

    // Steam (Momentum), max 100 for gauge display
    const steamPct = Math.min(Math.max(thermo.steam / 100, 0), 1);
    animateGauge('gauge-steam-arc', steamPct, circumference);
    setText('gauge-steam-val', thermo.steam);
  }

  // ─── PEARL Map ───
  function renderPearl(currentPhase) {
    const phases = ['perspective', 'engineering', 'aesthetic', 'research', 'alignment'];
    let passed = true;
    
    for (const p of phases) {
      const el = document.getElementById(`node-${p}`);
      if (!el) continue;
      
      el.classList.remove('active', 'completed');
      if (p === currentPhase) {
        el.classList.add('active');
        passed = false;
      } else if (passed) {
        el.classList.add('completed');
      }
    }
  }

  function animateGauge(id, value, circumference) {
    const el = document.getElementById(id);
    if (el) {
      const dashLength = value * circumference;
      // Use requestAnimationFrame for smooth initial render
      requestAnimationFrame(() => {
        el.style.transition = 'stroke-dasharray 1s cubic-bezier(0.22, 1, 0.36, 1)';
        el.setAttribute('stroke-dasharray', `${dashLength} ${circumference}`);
      });
    }
  }

  // ─── Player Identity ───
  function renderIdentity(state) {
    setText('identity-name', state.name);
    
    const faceText = state.face || 'none';
    setText('identity-face', faceText);
    
    // Apply aura based on face mapping if available in ZEN_CONST
    const auraEl = document.getElementById('identity-aura');
    if (auraEl && typeof ZEN_CONST !== 'undefined') {
      let hexColor = 'var(--color-surface-2)';
      let shadowColor = 'transparent';

      if (faceText === ZEN_CONST.FACE.SEER) {
        hexColor = ZEN_CONST.COLOR[ZEN_CONST.DIR.MIND];
      } else if (faceText === ZEN_CONST.FACE.SINGER) {
        hexColor = ZEN_CONST.COLOR[ZEN_CONST.DIR.HEART];
      } else if (faceText === ZEN_CONST.FACE.GARDENER) {
        hexColor = ZEN_CONST.COLOR[ZEN_CONST.DIR.BODY];
      } else if (faceText === ZEN_CONST.FACE.MAKER) {
        hexColor = ZEN_CONST.COLOR[ZEN_CONST.DIR.ACT];
      } else if (faceText === ZEN_CONST.FACE.WEAVER) {
        hexColor = '#9a7fd5'; // Special balance color
      }

      if (faceText !== 'none') {
        shadowColor = hexColor + '66'; // 40% opacity hex
      }

      auraEl.style.background = hexColor;
      auraEl.style.boxShadow = `0 0 15px ${shadowColor}`;
    }
  }

  // ─── Utilities ───
  function animateBar(id, value) {
    const el = document.getElementById(id);
    if (el) {
      requestAnimationFrame(() => {
        el.style.width = `${Math.round(value * 100)}%`;
      });
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
  }

  function truncateUUID(uuid) {
    if (!uuid) return '—';
    return uuid.substring(0, 8) + '…';
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { render };
})();
