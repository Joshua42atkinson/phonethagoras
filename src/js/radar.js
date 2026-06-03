/**
 * STAR — The Shape Diamond
 * 
 * Renders the 4-axis diamond (mind, heart, body, act)
 * as an animated SVG polygon.
 * 
 * Axes:
 *   North (top)    → mind
 *   East  (right)  → heart
 *   South (bottom)  → body
 *   West  (left)    → act
 * 
 * Values are integers [0, 100] mapped to SVG coordinate space.
 */

const PhoneRadar = (() => {
  // SVG coordinate space constants (matches viewBox 0 0 400 400)
  const CENTER = 200;
  const MIN_RADIUS = 0;
  const MAX_RADIUS = 120; // pixels from center to max axis endpoint

  /**
   * Convert an attribute value [0, 100] to a pixel distance from center
   */
  function valueToRadius(value) {
    return MIN_RADIUS + (value / 100) * MAX_RADIUS;
  }

  /**
   * Calculate the four diamond points from attribute values
   * Returns { north, east, south, west } as {x, y} coordinates
   */
  function calculatePoints(attrs) {
    const mind  = valueToRadius(attrs.mind);
    const heart = valueToRadius(attrs.heart);
    const body  = valueToRadius(attrs.body);
    const act   = valueToRadius(attrs.act);

    return {
      north: { x: CENTER,         y: CENTER - mind },
      east:  { x: CENTER + heart,  y: CENTER },
      south: { x: CENTER,         y: CENTER + body },
      west:  { x: CENTER - act,   y: CENTER }
    };
  }

  /**
   * Render the diamond shape and dots with smooth animation
   */
  function render(attrs) {
    const points = calculatePoints(attrs);

    // Update the diamond polygon
    const diamond = document.getElementById('radar-diamond');
    if (diamond) {
      const pointsStr = [
        `${points.north.x},${points.north.y}`,
        `${points.east.x},${points.east.y}`,
        `${points.south.x},${points.south.y}`,
        `${points.west.x},${points.west.y}`
      ].join(' ');
      diamond.setAttribute('points', pointsStr);
    }

    // Update endpoint dots
    setDot('dot-mind',  points.north);
    setDot('dot-heart', points.east);
    setDot('dot-body',  points.south);
    setDot('dot-act',   points.west);

    // Update stat values
    setText('stat-mind',  attrs.mind);
    setText('stat-heart', attrs.heart);
    setText('stat-body',  attrs.body);
    setText('stat-act',   attrs.act);
  }

  function setDot(id, pos) {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute('cx', pos.x);
      el.setAttribute('cy', pos.y);
    }
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /**
   * Animate from one set of attributes to another
   */
  function animateTo(fromAttrs, toAttrs, duration = 800) {
    const startTime = performance.now();
    const keys = ['mind', 'heart', 'body', 'act'];

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      const interpolated = {};
      for (const key of keys) {
        interpolated[key] = Math.round(fromAttrs[key] + (toAttrs[key] - fromAttrs[key]) * eased);
      }

      render(interpolated);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  /**
   * Initial render with entrance animation from zero
   */
  function animateEntrance(attrs, delay = 300) {
    const zeroAttrs = {
      mind: 0,
      heart: 0,
      body: 0,
      act: 0
    };

    render(zeroAttrs);
    setTimeout(() => animateTo(zeroAttrs, attrs, 1200), delay);
  }

  return {
    render,
    animateTo,
    animateEntrance,
    calculatePoints
  };
})();
