/**
 * STATE — The Book
 * 
 * Manages the local-first player state lifecycle.
 * All data stays on the user's device. Yours.
 *
 * Zen Zuse naming: every field uses the simplest possible English word.
 */

import { ZEN_CONST } from './data/constants.js';
import { Vault } from './vault.js';

  const STORAGE_KEY = 'zen_book';
  
  // ─── Event Emitter (Pub/Sub) ───
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[Event: ${event}] Listener error:`, err);
      }
    });
  }

  function createDefaultState() {
    return {
      id: generateUUID(),
      zenMode: true,
      language: 'en',
      name: 'newcomer',
      story: '',
      shape: {
        mind:  10,
        heart: 10,
        body:  10,
        act:   10,
      },
      roots: {
        own:   0.20,
        bond:  0.20,
        skill: 0.20,
      },
      walk: {
        depth: 'seen',
        dare: 'Begin',
        fret: 1,
        gate: 'be',
        sandboxMode: false,
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
        path: {
          id: 'path-init',
          goal: 'Observe yourself for one week.',
          steps: [
            { n: 1, act: 'Notice what grabs your attention today', done: false, at: null },
            { n: 2, act: 'Name one pattern you keep repeating', done: false, at: null },
            { n: 3, act: 'Ask: is the pattern mine, or borrowed?', done: false, at: null },
          ]
        }
      },
      pulse: {
        focus: 0.50,
        guard: 0.50,
      },
      mentorship: {
        coachEmail: '',
        lastSitRep: null,
      },

      pearlState: 'perspective',
      face: null,
      _meta: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '0.4.0'
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
    if (!ZEN_CONST) return;
    
    const { mind, heart, body, act } = state.shape;
    const maxVal = Math.max(mind, heart, body, act);
    
    if (mind === maxVal) state.face = ZEN_CONST.FACE.SEER;
    else if (heart === maxVal) state.face = ZEN_CONST.FACE.SINGER;
    else if (body === maxVal) state.face = ZEN_CONST.FACE.GARDENER;
    else if (act === maxVal) state.face = ZEN_CONST.FACE.MAKER;
    
    if (mind > 75 && heart > 75 && body > 75 && act > 75) {
       state.face = ZEN_CONST.FACE.WEAVER;
    }
  }

  // ─── Persistence (Vault) ───
  let currentStateCache = null;

  async function init() {
    try {
      await Vault.init();
      const vaultData = await Vault.read('Character.md');
      
      let dbState = null;
      if (vaultData) {
        // Extract JSON from markdown code block
        const match = vaultData.match(/```json\\n([\\s\\S]*?)\\n```/);
        if (match && match[1]) {
          dbState = JSON.parse(match[1]);
        } else {
          try { dbState = JSON.parse(vaultData); } catch(e){} // Fallback if plain JSON
        }
      }

      if (dbState) {
        currentStateCache = deepMerge(createDefaultState(), dbState);
      } else {
        // Migration from legacy localStorage
        const lsRaw = localStorage.getItem(STORAGE_KEY);
        if (lsRaw) {
          const parsed = JSON.parse(lsRaw);
          currentStateCache = deepMerge(createDefaultState(), parsed);
          // Auto-save to Vault
          save(currentStateCache);
          localStorage.removeItem(STORAGE_KEY);
        } else {
          currentStateCache = createDefaultState();
          save(currentStateCache);
        }
      }
    } catch (err) {
      console.error('[PhoneState] Vault Init failed, falling back to memory', err);
      currentStateCache = createDefaultState();
    }
    return currentStateCache;
  }

  function load() {
    if (!currentStateCache) {
      console.warn('[PhoneState] load() called before init() finished!');
      return createDefaultState();
    }
    return JSON.parse(JSON.stringify(currentStateCache));
  }

  function save(state) {
    updateFace(state);
    state._meta.updated_at = new Date().toISOString();
    currentStateCache = JSON.parse(JSON.stringify(state));
    
    const content = `\`\`\`json\\n${JSON.stringify(currentStateCache, null, 2)}\\n\`\`\``;
    Vault.write('Character.md', content).catch(e => {
      console.error('[PhoneState] Failed to save state to Vault:', e);
    });
    
    emit('state:changed', currentStateCache);
    return true;
  }

  function reset() {
    currentStateCache = createDefaultState();
    Vault.remove('Character.md').catch(e => console.error(e));
    localStorage.removeItem(STORAGE_KEY);
    return load();
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

export const PhoneState = {
  on,
  off,
  init,
  load,
  save,
  reset,
  exportJSON,
  importJSON,
  createDefaultState,
  emit
};

export default PhoneState;
