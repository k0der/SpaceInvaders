/**
 * AI Debug Logger — structured console telemetry for diagnosing AI behavior.
 *
 * Toggled via settings checkbox or window.aiDebug.enable()/disable().
 * Zero cost when disabled — all functions are no-ops.
 */

/** Rate limit interval for periodic logs (seconds). */
const LOG_INTERVAL = 0.5;

/**
 * Format ship control flags as a compact 4-character string.
 * T=thrust, L=left, R=right, B=brake, _=inactive.
 */
export function fmtAction(ship) {
  return (
    (ship.thrust ? 'T' : '_') +
    (ship.rotatingLeft ? 'L' : '_') +
    (ship.rotatingRight ? 'R' : '_') +
    (ship.braking ? 'B' : '_')
  );
}

/**
 * Create a debug logger instance.
 */
export function createDebugLogger() {
  let enabled = false;
  let lastLogTime = -Infinity;
  let lastAction = '';

  function enable() {
    enabled = true;
  }

  function disable() {
    enabled = false;
  }

  function isEnabled() {
    return enabled;
  }

  /**
   * Log AI frame telemetry. Rate-limited to LOG_INTERVAL, but always
   * logs immediately on action change.
   */
  function logAIFrame(elapsed, enemy, player, debugInfo) {
    if (!enabled) return;

    const action = fmtAction(enemy);
    const actionChanged = action !== lastAction && lastAction !== '';
    const timeSinceLastLog = elapsed - lastLogTime;

    if (!actionChanged && timeSinceLastLog < LOG_INTERVAL && lastLogTime >= 0) {
      return;
    }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
    const spd = Math.round(
      Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy),
    );

    if (actionChanged) {
      console.log(
        `[AI ${elapsed.toFixed(2)}s] CHANGE ${lastAction} → ${action} dist=${dist}`,
      );
    } else {
      let msg = `[AI ${elapsed.toFixed(2)}s] dist=${dist} action=${action} spd=${spd} hdg=${enemy.heading.toFixed(2)} pos=(${Math.round(enemy.x)},${Math.round(enemy.y)})`;

      if (debugInfo?.candidates) {
        const scores = debugInfo.candidates
          .map((c) => `${c.name}:${Math.round(c.score)}`)
          .join(' ');
        msg += ` | ${scores}`;
      }

      console.log(msg);
    }

    lastAction = action;
    lastLogTime = elapsed;
  }

  /**
   * Log an immediate event (fire, collision, etc.).
   */
  function logEvent(elapsed, type, data) {
    if (!enabled) return;

    const parts = Object.entries(data)
      .map(([k, v]) => {
        if (typeof v === 'number') {
          return `${k}=${Number.isInteger(v) ? v : v.toFixed(2)}`;
        }
        return `${k}=${v}`;
      })
      .join(' ');

    console.log(`[${type} ${elapsed.toFixed(2)}s] ${parts}`);
  }

  return {
    enable,
    disable,
    isEnabled,
    logAIFrame,
    logEvent,
  };
}
