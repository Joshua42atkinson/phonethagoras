/**
 * CONSTANTS — The Naming Matrix
 * 
 * Every name in this system is scored by three metrics from
 * psycholinguistic research (Brysbaert, Kuperman, Warriner norms):
 *
 *   AoA  = Age of Acquisition (Kuperman). Lower = learned earlier = simpler.
 *   Conc = Concreteness (Brysbaert, 1-5). Higher = more tangible.
 *   FK   = Flesch-Kincaid syllable count. Fewer = lighter cognitive load.
 *
 * The Zen Zuse principle: if a child can't use the word by age 6,
 * find a simpler one.
 *
 * Naming Philosophy: "East meets West"
 *   Zen  = strip away what isn't essential (Eastern)
 *   Zuse = build from first principles, no institution needed (Western)
 */

(function(root, factory) {
  const consts = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = consts;
  } else {
    root.ZEN_CONST = consts;
  }
})(typeof self !== 'undefined' ? self : this, function() {
  // ─── The Four Directions ───
  // Each maps to a human capacity. One syllable. AoA < 4 years.
  //
  // | Name  | AoA  | Conc | FK  | Replaces                    |
  // |-------|------|------|-----|-----------------------------|
  // | mind  | 3.5  | 2.8  | 1   | Intelligence / Sage         |
  // | heart | 2.9  | 4.8  | 1   | Courage / Hero              |
  // | body  | 2.5  | 4.9  | 2   | Empathy / Caregiver         |
  // | act   | 3.1  | 2.1  | 1   | Eloquence / Jester          |
  //
  const DIR = Object.freeze({
    MIND:  'mind',
    HEART: 'heart',
    BODY:  'body',
    ACT:   'act',
  });

  // ─── The Four Depths ───
  // How deeply you know a word. Past-tense verbs a child uses by age 5.
  //
  // | Name  | AoA  | Conc | FK  | Replaces           |
  // |-------|------|------|-----|--------------------|  
  // | seen  | 2.2  | 3.1  | 1   | Hero (Passive)     |
  // | felt  | 3.0  | 3.4  | 1   | Outlaw (Reactive)  |
  // | held  | 2.8  | 4.2  | 1   | Edge Lord (Active) |
  // | known | 3.2  | 2.0  | 1   | Best Self (Mastery)|
  //
  const DEPTH = Object.freeze({
    SEEN:  'seen',
    FELT:  'felt',
    HELD:  'held',
    KNOWN: 'known',
  });

  // ─── The Five Faces ───
  // Emergent identity from your shape. Common English nouns.
  //
  // | Name     | AoA  | Conc | FK  | Pattern      | Replaces     |
  // |----------|------|------|-----|--------------|------------- |
  // | seer     | 5.2  | 3.0  | 1   | mind-heavy   | The Oracle   |
  // | singer   | 3.8  | 4.5  | 2   | heart-heavy  | The Bard     |
  // | gardener | 4.1  | 4.8  | 3   | body-heavy   | The Cultivator|
  // | maker    | 3.5  | 3.8  | 2   | act-heavy    | The Templar  |
  // | weaver   | 5.0  | 4.2  | 2   | balanced     | The Architect|
  //
  const FACE = Object.freeze({
    SEER:     'seer',
    SINGER:   'singer',
    GARDENER: 'gardener',
    MAKER:    'maker',
    WEAVER:   'weaver',
  });

  // ─── The Three Roots ───
  // Self-Determination Theory (Deci & Ryan, 1985).
  // Renamed to monosyllables.
  //
  // | Name  | AoA  | Conc | FK  | Replaces              |
  // |-------|------|------|-----|-----------------------|
  // | own   | 2.5  | 2.0  | 1   | Autonomy/Sovereignty  |
  // | bond  | 4.8  | 3.5  | 1   | Relatedness/Tribe     |
  // | skill | 4.2  | 2.8  | 1   | Competence/Mastery    |
  //
  const ROOT = Object.freeze({
    OWN:   'own',
    BOND:  'bond',
    SKILL: 'skill',
  });

  // ─── Colors ───
  // Canonical hex values (same as Day_Dream).
  const COLOR = Object.freeze({
    [DIR.MIND]:  '#4a9e6e',
    [DIR.HEART]: '#d4783c',
    [DIR.BODY]:  '#4a7eb5',
    [DIR.ACT]:   '#c4a43c',
  });

  // ─── HSL variants for CSS ───
  const HSL = Object.freeze({
    [DIR.MIND]:  'hsl(150, 38%, 46%)',
    [DIR.HEART]: 'hsl(25, 65%, 53%)',
    [DIR.BODY]:  'hsl(210, 45%, 50%)',
    [DIR.ACT]:   'hsl(43, 55%, 50%)',
  });

  // ─── Each direction asks one question ───
  const ASK = Object.freeze({
    [DIR.MIND]:  'What does this mean?',
    [DIR.HEART]: 'Where is the love here?',
    [DIR.BODY]:  'What is my body telling me?',
    [DIR.ACT]:   'How do I make this real?',
  });

  // ─── Depth thresholds (uses needed to advance) ───
  const DEPTH_THRESHOLD = Object.freeze({
    [DEPTH.SEEN]:  1,
    [DEPTH.FELT]:  3,
    [DEPTH.HELD]:  7,
    [DEPTH.KNOWN]: 15,
  });

  // ─── The Zen Rename Map ───
  // Complete translation table: ornate → zen
  const ZEN = Object.freeze({
    // System concepts
    'SILK':                             'silk',
    'Attribute Matrix':                 'shape',
    'Virtue Topology':                  'roots',
    'Active Campaign':                  'walk',
    'Commitment Contract':              'path',
    'Milestones':                       'steps',
    'Quest':                            'dare',
    'Forge Reset':                      'breath',
    'Prestige Class':                   'face',
    'Player State':                     'book',
    'Sensor Telemetry':                 'pulse',
    'Attention Stewardship Score':      'focus',
    'Armor Density':                    'guard',
    'Archetype Build':                  'name',
    'Session':                          'sit',
    // Direction renames
    'Intelligence':                     'mind',
    'Courage':                          'heart',
    'Empathy':                          'body',
    'Eloquence':                        'act',
    // Class renames
    'Sage':                             'seer',
    'Hero':                             'singer',
    'Caregiver':                        'gardener',
    'Jester':                           'maker',
    // SDT renames
    'Autonomy':                         'own',
    'Relatedness':                      'bond',
    'Competence':                       'skill',
  });

  return { DIR, DEPTH, FACE, ROOT, COLOR, HSL, ASK, DEPTH_THRESHOLD, ZEN };
});
