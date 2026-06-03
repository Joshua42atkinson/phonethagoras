// ════════════════════════════════════════════════════════════
// DAYDREAM — The ARCANA Word Library
// ════════════════════════════════════════════════════════════
// 20 power words across 4 channels, 3 stages each.
// Each word is a spell. The deck is the student's directional prompt system.

const Channel = Object.freeze({
  MIND:   'mind',
  HEART:  'heart',
  BODY:   'body',
  ACTION: 'act',
});

// ─── SYMBOLS ───────────────────────────────────────────────
// ◆ Stone (noun)  ◇ Spark (verb)  △ Prism (adjective)
// ○ Void (abstract concept)  ☆ Star (key term / keystone)
export const Symbols = {
  STONE: '◆',   // noun — thing, place, entity
  SPARK: '◇',   // verb — action, transformation
  PRISM: '△',   // adjective — quality, lens
  VOID:  '○',   // abstract — concept, pattern
  STAR:  '☆',   // keystone — anchor term
};

// ─── THE 20 ARCANA WORDS ─────────────────────────────────
export const ARCANA = [
  { word: 'Presence',     channel: Channel.BODY,   symbol: Symbols.STONE, stage: 1, desc: 'Being here, now, fully.' },
  { word: 'Bias',         channel: Channel.MIND,   symbol: Symbols.VOID,  stage: 2, desc: 'The invisible lens that shapes what you see.' },
  { word: 'Resilience',   channel: Channel.ACTION, symbol: Symbols.STONE, stage: 2, desc: 'Bending without breaking. Returning stronger.' },
  { word: 'Patience',     channel: Channel.BODY,   symbol: Symbols.PRISM, stage: 1, desc: 'The quiet strength of waiting well.' },
  { word: 'Courage',      channel: Channel.HEART,  symbol: Symbols.SPARK, stage: 2, desc: 'Feeling fear and moving anyway.' },
  { word: 'Clarity',      channel: Channel.MIND,   symbol: Symbols.STAR,  stage: 3, desc: 'Seeing through the fog of assumption.' },
  { word: 'Empathy',      channel: Channel.HEART,  symbol: Symbols.PRISM, stage: 2, desc: 'Feeling with, not feeling for.' },
  { word: 'Joy',          channel: Channel.HEART,  symbol: Symbols.SPARK, stage: 1, desc: 'The spark that needs no reason.' },
  { word: 'Wonder',       channel: Channel.MIND,   symbol: Symbols.VOID,  stage: 1, desc: 'The question that precedes all learning.' },
  { word: 'Forge',        channel: Channel.ACTION, symbol: Symbols.SPARK, stage: 3, desc: 'Creating through heat and pressure.' },
  { word: 'Stewardship',  channel: Channel.MIND,   symbol: Symbols.STAR,  stage: 3, desc: 'Caring for what you did not make.' },
  { word: 'Vulnerability',channel: Channel.BODY,   symbol: Symbols.VOID,  stage: 2, desc: 'Keeping the antenna sensitive.' },
  { word: 'Curiosity',    channel: Channel.MIND,   symbol: Symbols.SPARK, stage: 1, desc: 'The engine that drives all growth.' },
  { word: 'Devotion',     channel: Channel.HEART,  symbol: Symbols.STONE, stage: 3, desc: 'Commitment beyond convenience.' },
  { word: 'Grounding',    channel: Channel.BODY,   symbol: Symbols.STAR,  stage: 2, desc: 'Returning to the body when the mind spins.' },
  { word: 'Creation',     channel: Channel.ACTION, symbol: Symbols.STAR,  stage: 3, desc: 'Bringing the unseen into form.' },
  { word: 'Reflection',   channel: Channel.MIND,   symbol: Symbols.PRISM, stage: 2, desc: 'The mirror that teaches without judgment.' },
  { word: 'Trust',        channel: Channel.HEART,  symbol: Symbols.STONE, stage: 2, desc: 'The bridge built one step at a time.' },
  { word: 'Rest',         channel: Channel.BODY,   symbol: Symbols.VOID,  stage: 1, desc: 'The active practice of slowing down.' },
  { word: 'Initiative',   channel: Channel.ACTION, symbol: Symbols.SPARK, stage: 2, desc: 'Moving before you are ready.' },
];

// ─── SYNERGY PAIRS ───────────────────────────────────────
// When both words are in a deck, they unlock a resonance bonus.
export const SYNERGIES = [
  { words: ['Resilience', 'Patience'],      name: 'Steadfast',     bonus: 2, desc: 'Unshakeable calm in the storm.' },
  { words: ['Courage', 'Vulnerability'],   name: 'Wholehearted',  bonus: 3, desc: 'Strength through openness.' },
  { words: ['Clarity', 'Wonder'],          name: 'Illumination',  bonus: 2, desc: 'Light that reveals more mystery.' },
  { words: ['Forge', 'Creation'],          name: 'Blacksmith',      bonus: 3, desc: 'Shaping raw material into meaning.' },
  { words: ['Joy', 'Rest'],                name: 'Sabbath',         bonus: 2, desc: 'Deliberate delight in stillness.' },
  { words: ['Curiosity', 'Reflection'],    name: 'Inquiry',         bonus: 2, desc: 'The loop that grows itself.' },
  { words: ['Empathy', 'Trust'],           name: 'Bond',            bonus: 2, desc: 'Connection that holds under weight.' },
  { words: ['Presence', 'Grounding'],        name: 'Rooted',          bonus: 2, desc: 'Deep anchoring in the present.' },
];

// ─── ARCHETYPES ──────────────────────────────────────────
export const Archetypes = {
  ORACLE:     { name: 'The Oracle',     channel: Channel.MIND,   dominant: 0.80, others: 0.40, desc: 'Sees patterns others miss. Speaks in questions.' },
  BARD:       { name: 'The Bard',       channel: Channel.HEART,  dominant: 0.80, others: 0.40, desc: 'Moves hearts with story and song. Feels the room.' },
  CULTIVATOR: { name: 'The Cultivator', channel: Channel.BODY,   dominant: 0.80, others: 0.40, desc: 'Grows slowly, deeply. Roots before branches.' },
  TEMPLAR:    { name: 'The Templar',    channel: Channel.ACTION, dominant: 0.80, others: 0.40, desc: 'Builds what others only imagine. Moves the world.' },
  ARCHITECT:  { name: 'The Architect',  channel: null,            dominant: 0.60, others: 0.55, desc: 'Balances all channels. Sees the whole system.' },
};

// ─── VOICE STYLES ────────────────────────────────────────
export const VoiceStyles = {
  SAGE:        { id: 'sage',        name: '🧙‍♂️ The Sage',        desc: 'Analytical, measured, Socratic.' },
  HERO:        { id: 'hero',        name: '⚔️ The Hero',        desc: 'Action-oriented, confident, punchy pacing.' },
  JESTER:      { id: 'jester',      name: '🎭 The Jester',      desc: 'Playful, unexpected, highly variable pitch.' },
  CAREGIVER:   { id: 'caregiver',   name: '💖 The Caregiver',   desc: 'Empathic, warm, softer volume.' },
  BARD:        { id: 'bard',        name: '🎻 The Bard',        desc: 'Poetic, rhythmic, story-driven.' },
};

// ─── AMBIENT MOODS ───────────────────────────────────────
export const AmbientMoods = {
  SILENCE:   { id: 'silence',   name: 'Deep Silence',   drone: 0,    desc: 'No ambient sound. Just the voice.' },
  CAVE:      { id: 'cave',      name: 'The Cave',       drone: 136.1, desc: 'Om frequency. Grounding, ancient.' },
  FOREST:    { id: 'forest',    name: 'The Forest',     drone: 174.6, desc: 'Healing frequency. Gentle, alive.' },
  WATER:     { id: 'water',     name: 'The River',      drone: 196.0, desc: 'Flow state. Fluid, continuous.' },
  STARS:     { id: 'stars',     name: 'The Void',       drone: 220.0, desc: 'Mystery. Expansive, cosmic.' },
  DAWN:      { id: 'dawn',      name: 'The Dawn',       drone: 261.6, desc: 'Clarity. Bright, awakening.' },
};

// ─── HELPERS ─────────────────────────────────────────────
export function getArcanaByWord(word) {
  return ARCANA.find(a => a.word === word) || null;
}

export function getArcanaByChannel(channel) {
  return ARCANA.filter(a => a.channel === channel);
}

export function getSynergiesForDeck(deckWords) {
  const set = new Set(deckWords);
  return SYNERGIES.filter(s => s.words.every(w => set.has(w)));
}

export function getArcanaStageStars(stage) {
  return '★'.repeat(stage) + '☆'.repeat(3 - stage);
}

export function getChannelColor(channel) {
  const map = {
    [Channel.MIND]:   '#4a9e6e',
    [Channel.HEART]:  '#d4783c',
    [Channel.BODY]:   '#4a7eb5',
    [Channel.ACTION]: '#c4a43c',
  };
  return map[channel] || '#888';
}
