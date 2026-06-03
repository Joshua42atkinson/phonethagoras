import { describe, it, expect } from 'vitest';
import Constants from '../src/js/data/constants.js';

describe('Constants Wiring', () => {
  it('should export all required constant dictionaries', () => {
    expect(Constants).toBeDefined();
    
    const { DIR, DEPTH, FACE, ROOT, ZEN } = Constants;
    
    // Check Directions
    expect(DIR.MIND).toBe('mind');
    expect(DIR.HEART).toBe('heart');
    
    // Check SILK translation
    expect(ZEN['SILK']).toBe('silk');
  });
});
