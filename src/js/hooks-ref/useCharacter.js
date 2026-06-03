import { useState, useCallback } from 'react';
import { Archetypes } from '../data/arcana';
import { Channel } from '../data/constants';

// ════════════════════════════════════════════════════════════
// useCharacter — Character Creation + Deck Pairing
// ════════════════════════════════════════════════════════════
// Each character has a deck. The deck defines the story direction.
// Character + Deck are saved together and can be switched in Settings.

const STORAGE_KEY = 'daydream_characters';

function loadCharacters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCharacters(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

function makeCharacter({ name, archetypeKey, attunement, deck }) {
  const archetype = Archetypes[archetypeKey];
  const id = `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: name.trim() || 'Wanderer',
    archetype: archetypeKey,
    archetypeName: archetype?.name || 'Unknown',
    dominantChannel: archetype?.channel || null,
    attunement: {
      [Channel.MIND]: attunement.mind || 0,
      [Channel.HEART]: attunement.heart || 0,
      [Channel.BODY]: attunement.body || 0,
      [Channel.ACTION]: attunement.action || 0,
    },
    deck: deck || [],
    createdAt: Date.now(),
    xp: 0,
    level: 1,
    journeysCompleted: 0,
    wordsMastered: 0,
  };
}

export function useCharacter() {
  const [characters, setCharacters] = useState(() => loadCharacters());

  const updateList = useCallback((updater) => {
    setCharacters(prev => {
      const next = updater(prev);
      saveCharacters(next);
      return next;
    });
  }, []);

  const createCharacter = useCallback((opts) => {
    const char = makeCharacter(opts);
    updateList(prev => [...prev, char]);
    return char;
  }, [updateList]);

  const updateCharacter = useCallback((id, patch) => {
    updateList(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, [updateList]);

  const deleteCharacter = useCallback((id) => {
    updateList(prev => prev.filter(c => c.id !== id));
  }, [updateList]);

  const getCharacter = useCallback((id) => {
    return characters.find(c => c.id === id) || null;
  }, [characters]);

  const setCharacterDeck = useCallback((charId, deckWords) => {
    updateList(prev => prev.map(c =>
      c.id === charId ? { ...c, deck: deckWords } : c
    ));
  }, [updateList]);

  const addXp = useCallback((charId, amount) => {
    updateList(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const newXp = c.xp + amount;
      const newLevel = Math.floor(newXp / 100) + 1;
      return { ...c, xp: newXp, level: newLevel };
    }));
  }, [updateList]);

  const deriveEmergentClass = useCallback((char) => {
    const a = char?.attunement;
    if (!a) return 'Newcomer';
    const entries = Object.entries(a);
    const [dominant] = entries.reduce((max, curr) => curr[1] > max[1] ? curr : max, entries[0]);
    const map = {
      [Channel.MIND]: 'The Oracle',
      [Channel.HEART]: 'The Bard',
      [Channel.BODY]: 'The Cultivator',
      [Channel.ACTION]: 'The Templar',
    };
    return map[dominant] || 'The Architect';
  }, []);

  return {
    characters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacter,
    setCharacterDeck,
    addXp,
    deriveEmergentClass,
  };
}
