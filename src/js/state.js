/**
 * STATE — The Book
 * 
 * Manages the local-first player state lifecycle.
 * All data stays on the user's device. Yours.
 *
 * Zen Zuse naming: every field uses the simplest possible English word.
 */

import { ZEN_CONST } from './data/constants.js';

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
      language: 'en',              // Current user language
      name: 'newcomer',           // was archetype_build / 'Unawakened'
      story: '',                   // was demographics_private.narrative_context
      shape: {                     // was attribute_matrix
        mind:  10,                 // was intelligence_sage
        heart: 10,                 // was courage_hero
        body:  10,                 // was empathy_caregiver
        act:   10,                 // was eloquence_jester
      },
      roots: {                     // was virtue_topology_gravity
        own:   0.20,               // was autonomy_sovereignty
        bond:  0.20,               // was relatedness_tribe
        skill: 0.20,               // was competence_mastery
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
    if (!ZEN_CONST) return;
    
    const { mind, heart, body, act } = state.shape;
    const maxVal = Math.max(mind, heart, body, act);
    
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

  // ─── Persistence (IndexedDB + Cache) ───
  let currentStateCache = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PhonethagorasDB', 1);
      request.onupgradeneeded = (e) => {
        e.target.result.createObjectStore('store');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbGet(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('store', 'readonly');
        const store = tx.objectStore('store');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IndexedDB blocked or unavailable:', e);
      return null;
    }
  }

  async function dbSet(key, val) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('store', 'readwrite');
        const store = tx.objectStore('store');
        const req = store.put(val, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IndexedDB blocked or unavailable:', e);
    }
  }

  async function dbRemove(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('store', 'readwrite');
        const store = tx.objectStore('store');
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IndexedDB blocked or unavailable:', e);
    }
  }

  async function init() {
    try {
      const dbState = await dbGet(STORAGE_KEY);
      if (dbState) {
        currentStateCache = deepMerge(createDefaultState(), dbState);
      } else {
        // Migration from localStorage
        const lsRaw = localStorage.getItem(STORAGE_KEY);
        if (lsRaw) {
          const parsed = JSON.parse(lsRaw);
          currentStateCache = deepMerge(createDefaultState(), parsed);
          await dbSet(STORAGE_KEY, currentStateCache);
          localStorage.removeItem(STORAGE_KEY);
        } else {
          currentStateCache = createDefaultState();
          await dbSet(STORAGE_KEY, currentStateCache);
        }
      }
    } catch (err) {
      console.error('[PhoneState] DB Init failed, falling back to memory', err);
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
    
    dbSet(STORAGE_KEY, currentStateCache).catch(e => {
      console.error('[PhoneState] Failed to save state to DB:', e);
    });
    
    emit('state:changed', currentStateCache);
    return true;
  }

  function reset() {
    currentStateCache = createDefaultState();
    dbRemove(STORAGE_KEY).catch(e => console.error(e));
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
