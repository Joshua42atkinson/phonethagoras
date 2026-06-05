import { describe, it, expect, beforeEach } from 'vitest';
import PhoneState from '../src/js/state.js';
import Constants from '../src/js/data/constants.js';

// Mock the ZEN_CONST global that state.js relies on for updateFace
global.ZEN_CONST = Constants;

describe('PhoneState Engine', () => {
  beforeEach(async () => {
    localStorage.clear();
    await PhoneState.init();
    PhoneState.reset();
  });

  it('should initialize with default state', () => {
    const state = PhoneState.load();
    expect(state).toBeDefined();
    expect(state.shape.mind).toBe(10);
    expect(state.shape.heart).toBe(10);
    expect(state.shape.body).toBe(10);
    expect(state.shape.act).toBe(10);
    expect(state.face).toBe(null); // Below 60 threshold
  });

  it('should save and load state from localStorage', () => {
    const state = PhoneState.load();
    state.shape.mind = 90;
    PhoneState.save(state);
    
    // Vault saves to localStorage as vault_Character.md in web mode fallback
    const raw = localStorage.getItem('vault_Character.md');
    expect(raw).toBeTruthy();
    
    // Extract JSON substring between the first { and the last }
    const startIdx = raw.indexOf('{');
    const endIdx = raw.lastIndexOf('}');
    expect(startIdx).toBeGreaterThan(-1);
    expect(endIdx).toBeGreaterThan(-1);
    
    const parsed = JSON.parse(raw.substring(startIdx, endIdx + 1));
    expect(parsed.shape.mind).toBe(90);
  });

  it('should correctly calculate the active Face on save', () => {
    const state = PhoneState.load();
    state.shape.heart = 80;
    PhoneState.save(state);
    
    const reloaded = PhoneState.load();
    expect(reloaded.face).toBe(Constants.FACE.SINGER); // Heart > 60 is Singer
  });
});
