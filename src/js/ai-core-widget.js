// AI Core Widget UI Logic
document.addEventListener('DOMContentLoaded', () => {
  const toggleLogic = document.getElementById('toggle-logic');
  const toggleMemory = document.getElementById('toggle-memory');
  const toggleVoice = document.getElementById('toggle-voice');
  const vramText = document.getElementById('vram-usage-text');
  const vramBar = document.getElementById('vram-progress-bar');
  
  if (!toggleLogic) return; // Not on this page

  const MAX_VRAM = 4000;
  let currentVram = 0;

  const models = {
    logic: { btn: toggleLogic, size: 320, loaded: false, name: 'Logic', color: 'var(--color-accent)' },
    memory: { btn: toggleMemory, size: 80, loaded: false, name: 'Memory', color: 'var(--color-mind)' },
    voice: { btn: toggleVoice, size: 120, loaded: false, name: 'Voice', color: 'var(--color-heart)' }
  };

  function updateVramDisplay() {
    vramText.textContent = `${currentVram} / ${MAX_VRAM} MB`;
    const percentage = Math.min((currentVram / MAX_VRAM) * 100, 100);
    vramBar.style.width = `${percentage}%`;
    
    if (percentage > 85) {
      vramBar.style.background = 'var(--color-danger)';
      vramBar.style.boxShadow = '0 0 10px var(--color-danger)';
    } else if (percentage > 50) {
      vramBar.style.background = 'var(--color-accent)';
      vramBar.style.boxShadow = '0 0 10px var(--color-accent)';
    } else {
      vramBar.style.background = 'var(--color-success)';
      vramBar.style.boxShadow = '0 0 10px var(--color-success)';
    }
  }

  function handleToggle(key) {
    const model = models[key];
    const btn = model.btn;
    
    if (model.loaded) {
      // Unload
      model.loaded = false;
      currentVram -= model.size;
      btn.textContent = 'Load';
      btn.style.background = 'transparent';
      btn.style.color = 'var(--color-text)';
      btn.style.borderColor = 'var(--color-border-subtle)';
      btn.parentElement.style.background = 'rgba(255,255,255,0.02)';
      btn.parentElement.style.boxShadow = 'none';
    } else {
      // Load (Simulated UI effect)
      btn.textContent = 'Loading...';
      btn.style.opacity = '0.7';
      btn.disabled = true;
      
      setTimeout(() => {
        model.loaded = true;
        currentVram += model.size;
        btn.textContent = 'Unload';
        btn.style.background = model.color;
        btn.style.color = '#000';
        btn.style.borderColor = model.color;
        btn.style.opacity = '1';
        btn.disabled = false;
        
        btn.parentElement.style.background = 'rgba(255,255,255,0.08)';
        btn.parentElement.style.boxShadow = `0 0 15px ${model.color}33`;
        
        updateVramDisplay();
      }, 600 + Math.random() * 800); // Simulate network/load time
      return; 
    }
    updateVramDisplay();
  }

  toggleLogic.addEventListener('click', () => handleToggle('logic'));
  toggleMemory.addEventListener('click', () => handleToggle('memory'));
  toggleVoice.addEventListener('click', () => handleToggle('voice'));
  
  updateVramDisplay();
});
