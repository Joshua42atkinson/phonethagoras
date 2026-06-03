/**
 * STATE — The Book
 * 
 * Manages the local-first player state lifecycle.
 * All data stays on the user's device. Yours.
 *
 * Zen Zuse naming: every field uses the simplest possible English word.
 */

(function(root, factory) {
  const state = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = state;
  } else {
    root.PhoneState = state;
  }
})(typeof self !== 'undefined' ? self : this, function() {
  const STORAGE_KEY = 'zen_book';

  function createDefaultState() {
    return {
      id: generateUUID(),
      zenMode: true,
      language: 'en',              // Current user language
      name: 'newcomer',           // was archetype_build / 'Unawakened'
      story: '',                   // was demographics_private.narrative_context
      shape: {                     // was attribute_matrix
        mind:  50,                 // was intelligence_sage
        heart: 50,                 // was courage_hero
        body:  50,                 // was empathy_caregiver
        act:   50,                 // was eloquence_jester
      },
      roots: {                     // was virtue_topology_gravity
        own:   0.50,               // was autonomy_sovereignty
        bond:  0.50,               // was relatedness_tribe
        skill: 0.50,               // was competence_mastery
      },
      walk: {                      // was active_campaign
        depth: 'seen',             // was current_level (now uses DEPTH enum)
        dare: 'Begin',             // was current_quest
        fret: 1,                   // active fret (1 to 12)
        gate: 'be',                // active gate ('be', 'do', 'play')
        sandboxMode: false,        // sandbox bypass
        gatesCompleted: {
          1: { be: false, do: false, play: false },
          2: { be: false, do: false, play: false },
          3: { be: false, do: false, play: false },
          4: { be: false, do: false, play: false },
          5: { be: false, do: false, play: false },
          6: { be: false, do: false, play: false },
          7: { be: false, do: false, play: false },
          8: { be: false, do: false, play: false },
          9: { be: false, do: false, play: false },
          10: { be: false, do: false, play: false },
          11: { be: false, do: false, play: false },
          12: { be: false, do: false, play: false }
        },
        path: {                    // was commitment_contract
          id: 'path-init',
          goal: 'Observe yourself for one week.',
          steps: [
            { n: 1, act: 'Notice what grabs your attention today', done: false, at: null },
            { n: 2, act: 'Name one pattern you keep repeating', done: false, at: null },
            { n: 3, act: 'Ask: is the pattern mine, or borrowed?', done: false, at: null },
          ]
        }
      },
      pulse: {                     // was local_sensor_telemetry
        focus: 0.50,               // was attention_stewardship_score
        guard: 0.50,               // was armor_density_vulnerability
      },

      pearlState: 'perspective',   // Current PEARL phase (Perspective -> Engineering -> Aesthetic -> Research -> Alignment)
      face: null,                  // was prestige_class
      _meta: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '0.3.0'
      }
    };
  }

  // ─── UUID v4 Generator ───
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  
  // ─── Face Evolvement ───
  function updateFace(state) {
    if (typeof ZEN_CONST === 'undefined') return;
    
    const { mind, heart, body, act } = state.shape;
    const maxVal = Math.max(mind, heart, body, act);
    
    if (maxVal < 60) {
      state.face = 'none'; // Not attuned enough
      return;
    }
    
    // Simplistic assignment based on max
    if (mind === maxVal) state.face = ZEN_CONST.FACE.SEER;
    else if (heart === maxVal) state.face = ZEN_CONST.FACE.SINGER;
    else if (body === maxVal) state.face = ZEN_CONST.FACE.GARDENER;
    else if (act === maxVal) state.face = ZEN_CONST.FACE.MAKER;
    
    // If all are perfectly balanced and high, they become WEAVER
    if (mind > 75 && heart > 75 && body > 75 && act > 75) {
       state.face = ZEN_CONST.FACE.WEAVER;
    }
  }

  // ─── Persistence ───
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with defaults to handle schema evolution
        return deepMerge(createDefaultState(), parsed);
      }
    } catch (e) {
      console.warn('[PhoneState] Failed to load state:', e);
    }
    return createDefaultState();
  }

  function save(state) {
    try {
      updateFace(state); // Automatically evolve face before saving
      state._meta.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('[PhoneState] Failed to save state:', e);
      return false;
    }
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    return createDefaultState();
  }

  // ─── Export / Import ───
  function exportJSON(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'book.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const merged = deepMerge(createDefaultState(), parsed);
          resolve(merged);
        } catch (err) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // ─── Deep Merge Utility ───
  function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  return {
    load,
    save,
    reset,
    exportJSON,
    importJSON,
    createDefaultState
  };
});
