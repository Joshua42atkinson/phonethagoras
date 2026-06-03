import { useCallback } from 'react';

// ════════════════════════════════════════════════════════════
// useHaptics — Physical Deck & Somatic Feedback 
// ════════════════════════════════════════════════════════════
// Maps game actions to physical device vibrations, reinforcing
// the "Hero's Tome" LitRPG tactile boundaries.

export function useHaptics() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback((pattern) => {
    if (!isSupported) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore if user hasn't interacted with document yet
    }
  }, [isSupported]);

  return {
    // UI Micro-interactions
    tap: () => vibrate(15),              // Light button press (Modes, Tabs)
    heavyTap: () => vibrate([25, 50, 25]), // Important structural toggle
    
    // Combat / Narrative Events
    diceRoll: () => vibrate([10, 30, 10, 30, 15]), // Shaking the dice
    damageLight: () => vibrate([40, 50, 40]),      // Took a small hit
    damageHeavy: () => vibrate([80, 50, 100, 50, 150]), // Took massive damage
    heal: () => vibrate([20, 20, 20, 20, 40]),     // Magic healing flutter
    
    // Progression
    lootFound: () => vibrate([30, 40, 60, 40, 100]), // Heavy metallic click
    levelUp: () => vibrate([50, 50, 100, 50, 200, 50, 300]), // Long rising sequence
    
    // Swipe Mechanics
    swipeConfirm: () => vibrate(20),       // Node navigation confirmed
    error: () => vibrate([30, 80, 30])     // Blocked action
  };
}
