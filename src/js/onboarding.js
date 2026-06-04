/**
 * ONBOARDING — First Run Wizard
 * 
 * Shows a 4-step welcome flow for new users:
 * 1. Welcome / privacy promise
 * 2. Name
 * 3. Story (where are you at?)
 * 4. First goal
 * 
 * Stores completion flag so it only shows once.
 */

const PhoneOnboarding = (() => {
  const ONBOARDED_KEY = 'zen_onboarded';

  function shouldShow() {
    return !localStorage.getItem(ONBOARDED_KEY);
  }

  function init() {
    if (!shouldShow()) return;

    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;

    modal.classList.remove('hidden');

    // Wire step navigation
    const nextBtns = modal.querySelectorAll('.onboard-next');
    nextBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const nextStep = btn.dataset.next;
        showStep(nextStep);
      });
    });

    // Wire finish button
    const finishBtn = document.getElementById('onboard-finish');
    if (finishBtn) {
      finishBtn.addEventListener('click', completeOnboarding);
    }

    // Auto-focus name input when step 2 appears
    const nameInput = document.getElementById('onboard-name');
    if (nameInput) {
      nameInput.addEventListener('focus', () => {
        nameInput.select();
      });
    }
  }

  function showStep(stepNum) {
    const steps = document.querySelectorAll('.onboarding-step');
    steps.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`onboard-step-${stepNum}`);
    if (target) {
      target.classList.add('active');
      // Auto-focus inputs
      const input = target.querySelector('input, textarea');
      if (input) setTimeout(() => input.focus(), 200);
    }
  }

  function completeOnboarding() {
    const name = (document.getElementById('onboard-name')?.value || '').trim();
    const story = (document.getElementById('onboard-story')?.value || '').trim();
    const goal = (document.getElementById('onboard-goal')?.value || '').trim();

    // Questionnaire answers
    const q1 = document.querySelector('input[name="q1"]:checked')?.value;
    const q2 = document.querySelector('input[name="q2"]:checked')?.value;
    const q3 = document.querySelector('input[name="q3"]:checked')?.value;
    const q4 = document.querySelector('input[name="q4"]:checked')?.value;

    // Update state
    let state = PhoneState.load();
    
    if (name) state.name = name;
    if (story) state.story = story;
    if (goal) {
      state.walk.dare = goal;
      // Create initial quest steps from the goal
      state.walk.path.goal = goal;
      state.walk.path.steps = [
        { act: `Learn about ${goal.toLowerCase()}`, done: false },
        { act: `Take one small step toward ${goal.toLowerCase()}`, done: false },
        { act: `Complete first milestone`, done: false }
      ];
    }

    // Calculate base stats from questionnaire (starts at 10)
    let stats = { mind: 10, heart: 10, body: 10, act: 10 };
    [q1, q2, q3, q4].forEach(val => {
      if (val && stats[val] !== undefined) {
        stats[val] += 5; // boost the chosen stat by 5
      }
    });

    state.shape.mind = stats.mind;
    state.shape.heart = stats.heart;
    state.shape.body = stats.body;
    state.shape.act = stats.act;

    // Determine archetype face based on highest stat
    let highest = 0;
    for (const val of Object.values(stats)) {
      if (val > highest) highest = val;
    }
    
    const topStats = Object.keys(stats).filter(k => stats[k] === highest);
    if (topStats.length > 1) {
      state.face = 'weaver'; // Balanced or tied
    } else {
      const top = topStats[0];
      if (top === 'mind') state.face = 'seer';
      if (top === 'heart') state.face = 'singer';
      if (top === 'body') state.face = 'gardener';
      if (top === 'act') state.face = 'maker';
    }

    // Set roots to humble starting values
    state.roots.own = 0.30;
    state.roots.bond = 0.25;
    state.roots.skill = 0.20;

    PhoneState.save(state);

    // Mark onboarding complete
    localStorage.setItem(ONBOARDED_KEY, 'true');

    // Close modal
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.opacity = '';
        
        // Re-render dashboard with new state
        if (typeof PhoneRadar !== 'undefined') {
          PhoneRadar.animateEntrance(state.shape, 300);
        }
        if (typeof PhoneDashboard !== 'undefined') {
          PhoneDashboard.render(state);
        }

        // Update the welcome message in chat
        const feed = document.getElementById('chat-feed');
        if (feed && name) {
          feed.innerHTML = '';
          const msg = document.createElement('div');
          msg.className = 'chat-message agent';
          msg.innerHTML = `<p>Welcome to the Guild, <strong>${escapeHTML(name)}</strong>. I see you want to work on "${escapeHTML(goal || 'your next chapter')}." That's a solid quest. Let's talk about where you're at — what feels hardest right now?</p>`;
          feed.appendChild(msg);
        }
      }, 400);
    }

    console.log('[onboarding] Complete. Welcome,', name || 'traveler');
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, shouldShow };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhoneOnboarding;
} else {
  window.PhoneOnboarding = PhoneOnboarding;
}
