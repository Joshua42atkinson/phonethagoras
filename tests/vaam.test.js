import { describe, it, expect, beforeEach } from 'vitest';
import VAAM from '../src/js/vaam.js';

describe('VAAM (Vocabulary Acquisition Autonomy Mastery)', () => {
  
  beforeEach(() => {
    VAAM.resetProfile();
  });

  describe('Cognitive Load & Syllable Counting', () => {
    it('should correctly count syllables using the heuristic', () => {
      expect(VAAM.countSyllables('the')).toBe(1);
      expect(VAAM.countSyllables('apple')).toBe(1); // Heuristic correctly subtracts silent 'e'
      expect(VAAM.countSyllables('banana')).toBe(3);
      expect(VAAM.countSyllables('hello')).toBe(2);
    });

    it('should correctly handle silent e', () => {
      expect(VAAM.countSyllables('make')).toBe(1);
      expect(VAAM.countSyllables('lake')).toBe(1);
    });
    
    it('should calculate cognitive load metrics', () => {
      const text = "This is a simple sentence. This one is slightly more complicated.";
      const load = VAAM.calculateCognitiveLoad(text);
      expect(load.totalWords).toBe(11);
      expect(load.complexWords).toBeGreaterThan(0); // 'complicated' has 4
      expect(typeof load.fleschKincaidGrade).toBe('number');
    });
  });

  describe('Profile & Weights', () => {
    it('should record word usage and increase affinity', () => {
      VAAM.recordWordUsage('leadership', true);
      const profile = VAAM.getProfile();
      
      expect(profile.wordWeights['leadership']).toBeDefined();
      expect(profile.wordWeights['leadership'].timesChosen).toBe(1);
      expect(profile.wordWeights['leadership'].deliberateChoices).toBe(1);
    });
    
    it('should accurately return top words', () => {
      VAAM.recordWordUsage('resilience', true);
      VAAM.recordWordUsage('resilience', true);
      VAAM.recordWordUsage('growth', true);
      
      const top = VAAM.topWords(2);
      expect(top[0].word).toBe('resilience');
      expect(top[1].word).toBe('growth');
    });
  });
});
