import { useCallback, useRef, useState, useEffect } from 'react';

// ════════════════════════════════════════════════════════════
// useSwipeGesture — Mouse + Touch drag with direction detection
// ════════════════════════════════════════════════════════════
// Ported from prototype/index.html lines 640-787.
// Fires onSwipe(direction, exit) when threshold exceeded.

const SWIPE_THRESHOLD = 80;
const DAMPEN_FACTOR = 0.15;
const DOUBLE_TAP_MS = 350;

export function useSwipeGesture({ exits, onSwipe, onDoubleTap }) {
  const [dragState, setDragState] = useState(null); // { dx, dy, dir, exit }
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);
  const cardRef = useRef(null);

  const getPrimaryDirection = useCallback((dx, dy) => {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < 20 && absDy < 20) return null;
    if (absDx > absDy) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }, []);

  const onDragStart = useCallback((x, y) => {
    // Double-tap detection
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      if (onDoubleTap) onDoubleTap();
      return;
    }
    lastTap.current = now;

    isDragging.current = true;
    startPos.current = { x, y };
    setDragState({ dx: 0, dy: 0, dir: null, exit: null });
  }, [onDoubleTap]);

  const onDragMove = useCallback((x, y) => {
    if (!isDragging.current) return;

    let dx = x - startPos.current.x;
    let dy = y - startPos.current.y;
    const dir = getPrimaryDirection(dx, dy);
    const exit = dir && exits[dir] ? exits[dir] : null;

    // Dampen if no exit in that direction
    if (!exit) {
      dx *= DAMPEN_FACTOR;
      dy *= DAMPEN_FACTOR;
    }

    setDragState({ dx, dy, dir: exit ? dir : null, exit });
  }, [exits, getPrimaryDirection]);

  const onDragEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    setDragState((prev) => {
      if (!prev) return null;
      const mag = Math.sqrt(prev.dx * prev.dx + prev.dy * prev.dy);
      if (prev.exit && mag > SWIPE_THRESHOLD) {
        // Commit the swipe
        onSwipe(prev.dir, prev.exit);
        return { ...prev, committed: true };
      }
      // Snap back
      return null;
    });
  }, [onSwipe]);

  // Mouse handlers
  const onMouseDown = useCallback((e) => {
    onDragStart(e.clientX, e.clientY);
  }, [onDragStart]);

  // Touch handlers
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    onDragStart(t.clientX, t.clientY);
  }, [onDragStart]);

  // Global move/end handlers (attached to window for reliability)
  useEffect(() => {
    const handleMouseMove = (e) => onDragMove(e.clientX, e.clientY);
    const handleMouseUp = () => onDragEnd();
    const handleTouchMove = (e) => {
      const t = e.touches[0];
      onDragMove(t.clientX, t.clientY);
    };
    const handleTouchEnd = () => onDragEnd();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onDragMove, onDragEnd]);

  // Card transform style computed from drag state
  const cardTransform = dragState
    ? {
        transform: dragState.committed
          ? (() => {
              const dir = dragState.dir;
              const flyX = (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) * window.innerWidth * 1.5;
              const flyY = (dir === 'up' ? -1 : dir === 'down' ? 1 : 0) * window.innerHeight * 1.5;
              return `translate(${flyX}px, ${flyY}px) rotate(${flyX * 0.01}deg)`;
            })()
          : `translate(${dragState.dx}px, ${dragState.dy}px) rotate(${dragState.dx * 0.015}deg)`,
        opacity: dragState.committed ? 0 : 1,
        transition: dragState.committed
          ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease'
          : 'none',
        cursor: isDragging.current ? 'grabbing' : 'grab',
      }
    : {
        transform: 'translate(0, 0) rotate(0deg)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'grab',
      };

  // Active direction and magnitude for exit hint opacity
  const activeDir = dragState?.dir || null;
  const magnitude = dragState
    ? Math.sqrt(dragState.dx * dragState.dx + dragState.dy * dragState.dy)
    : 0;

  return {
    cardRef,
    cardTransform,
    activeDir,
    magnitude,
    onMouseDown,
    onTouchStart,
  };
}
