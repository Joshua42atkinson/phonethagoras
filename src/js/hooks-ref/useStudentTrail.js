import { useState, useCallback, useRef } from 'react';
import { Channel, Mastery } from '../data/constants';

// ════════════════════════════════════════════════════════════
// useStudentTrail — Trail, SpellBook, and Channel Attunement
// ════════════════════════════════════════════════════════════
// Sovereign: all data lives in localStorage. Zero server calls.
// Ported from engine/src/components.rs: StudentTrail, SpellBook, CharacterSheet.

const STORAGE_KEY = 'daydream_trail';

function loadTrail() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveTrail(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* storage full — fail silently */ }
}

function createFreshTrail() {
  return {
    // Journey trail — ordered list of steps taken
    steps: [],
    // SpellBook — words encountered with mastery tracking
    spellbook: {},
    // Channel attunement — derived from engagement patterns
    attunement: {
      [Channel.MIND]: 0,
      [Channel.HEART]: 0,
      [Channel.BODY]: 0,
      [Channel.ACTION]: 0,
    },
    // Session metadata
    totalDeeperSwipes: 0,
    adventureId: null,
  };
}

export function useStudentTrail() {
  const [trail, setTrail] = useState(() => loadTrail() || createFreshTrail());
  const trailRef = useRef(trail);
  trailRef.current = trail;

  const updateTrail = useCallback((updater) => {
    setTrail((prev) => {
      const next = updater(prev);
      saveTrail(next);
      return next;
    });
  }, []);

  // Record a step: swiped in a direction at a node
  const recordStep = useCallback((nodeId, direction, virtue, focusWord, channel) => {
    updateTrail((prev) => {
      const next = { ...prev };
      next.steps = [...prev.steps, { nodeId, direction, virtue, focusWord, timestamp: Date.now() }];

      // Update SpellBook
      const entry = prev.spellbook[focusWord] || {
        word: focusWord,
        channel,
        mastery: Mastery.ENCOUNTERED,
        timesEncountered: 0,
      };
      next.spellbook = {
        ...prev.spellbook,
        [focusWord]: {
          ...entry,
          timesEncountered: entry.timesEncountered + 1,
          mastery: entry.timesEncountered >= 2 ? Mastery.EXPERIENCED : entry.mastery,
        },
      };

      // Update Channel attunement (+0.05, capped at 1.0)
      if (channel) {
        next.attunement = { ...prev.attunement };
        next.attunement[channel] = Math.min(1.0, (prev.attunement[channel] || 0) + 0.05);
      }

      return next;
    });
  }, [updateTrail]);

  // Record a depth dive (double-tap Socratic question)
  const recordDepth = useCallback((focusWord) => {
    updateTrail((prev) => {
      const next = { ...prev };
      next.totalDeeperSwipes = prev.totalDeeperSwipes + 1;

      // Upgrade mastery to OWNED if they dig deeper
      const entry = prev.spellbook[focusWord];
      if (entry && entry.mastery !== Mastery.MASTERED) {
        next.spellbook = {
          ...prev.spellbook,
          [focusWord]: { ...entry, mastery: Mastery.OWNED },
        };
      }

      return next;
    });
  }, [updateTrail]);

  // Reset for a new adventure
  const resetTrail = useCallback(() => {
    const fresh = createFreshTrail();
    saveTrail(fresh);
    setTrail(fresh);
  }, []);

  // Derive emergent class from dominant channel
  const getEmergentClass = useCallback(() => {
    const a = trailRef.current.attunement;
    const entries = Object.entries(a);
    const dominant = entries.reduce((max, curr) => curr[1] > max[1] ? curr : max, entries[0]);

    const classes = {
      [Channel.MIND]: 'The Oracle',
      [Channel.HEART]: 'The Bard',
      [Channel.BODY]: 'The Cultivator',
      [Channel.ACTION]: 'The Templar',
    };

    return dominant[1] > 0 ? classes[dominant[0]] || 'Newcomer' : 'Newcomer';
  }, []);

  return {
    trail,
    recordStep,
    recordDepth,
    resetTrail,
    getEmergentClass,
  };
}
