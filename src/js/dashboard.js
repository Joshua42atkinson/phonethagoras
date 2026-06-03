/**
 * DASHBOARD CONTROLLER
 * 
 * Populates all dashboard cards from the player state:
 * - Roots (own, bond, skill) bars
 * - Walk status + steps
 * - Pulse (focus, guard) gauges
 * - Identity (self)
 */

const PhoneDashboard = (() => {

  /**
   * Render the full dashboard from a player state object
   */
  function render(state) {
    renderRoots(state.roots);
    renderWalk(state.walk);
    renderPulse(state.pulse);
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

  // ─── Pulse Gauges ───
  function renderPulse(pulse) {
    const circumference = 2 * Math.PI * 50; // r=50

    animateGauge('gauge-focus-arc', pulse.focus, circumference);
    setText('gauge-focus-val', formatPercent(pulse.focus));

    animateGauge('gauge-guard-arc', pulse.guard, circumference);
    setText('gauge-guard-val', formatPercent(pulse.guard));
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
    setText('identity-face', state.face || 'none');
    setText('identity-id', truncateUUID(state.id));
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
