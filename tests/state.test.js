import { describe, it, expect, beforeEach, vi } from 'vitest';
import PhoneState from '../src/js/state.js';
import Constants from '../src/js/data/constants.js';

// Mock the ZEN_CONST global that state.js relies on for updateFace
global.ZEN_CONST = Constants;

describe('PhoneState Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default state', () => {
    const state = PhoneState.load();
    expect(state).toBeDefined();
    expect(state.shape.mind).toBe(50);
    expect(state.shape.heart).toBe(50);
    expect(state.shape.body).toBe(50);
    expect(state.shape.act).toBe(50);
    expect(state.face).toBe(null); // Below 60 threshold
  });

  it('should save and load state from localStorage', () => {
    const state = PhoneState.load();
    state.shape.mind = 90;
    PhoneState.save(state);
    
    const raw = localStorage.getItem('zen_book');
    expect(raw).toBeTruthy();
    
    const parsed = JSON.parse(raw);
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
