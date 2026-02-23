import './ai.js';
import { getStrategy } from './ai-core.js';
import {
  checkBulletAsteroidCollisions,
  createBullet,
  FIRE_COOLDOWN,
  isBulletExpired,
  updateBullet,
} from './bullet.js';
import { createCamera, getViewportBounds } from './camera.js';
import {
  checkShipAsteroidCollision,
  clearSpawnZone,
  processBulletShipCollisions,
} from './game.js';
import { buildObservation } from './observation.js';
import { computeReward, DEFAULT_REWARD_WEIGHTS } from './reward.js';
import { createShip, SHIP_SIZE, updateShip } from './ship.js';
import { createSimulation, updateSimulation } from './simulation.js';

const DT = 1 / 60;
const VIEWPORT_W = 1920;
const VIEWPORT_H = 1080;
const ENV_BASE_ASTEROID_COUNT = 40;

/** Action index → control flag mapping (10 discrete move actions). */
export const ACTION_MAP = [
  { thrust: true, rotL: false, rotR: false, brake: false }, // 0: thrust-straight
  { thrust: true, rotL: true, rotR: false, brake: false }, // 1: thrust-left
  { thrust: true, rotL: false, rotR: true, brake: false }, // 2: thrust-right
  { thrust: false, rotL: false, rotR: false, brake: false }, // 3: coast-straight
  { thrust: false, rotL: true, rotR: false, brake: false }, // 4: coast-left
  { thrust: false, rotL: false, rotR: true, brake: false }, // 5: coast-right
  { thrust: false, rotL: false, rotR: false, brake: true }, // 6: brake-straight
  { thrust: false, rotL: true, rotR: false, brake: true }, // 7: brake-left
  { thrust: false, rotL: false, rotR: true, brake: true }, // 8: brake-right
  { thrust: false, rotL: false, rotR: false, brake: false }, // 9: no-op
];

function getDefaultConfig() {
  return {
    shipHP: 1,
    maxTicks: 3600,
    asteroidDensity: 1.0,
    enemyPolicy: 'predictive',
    enemyShoots: true,
    spawnDistance: 500,
    spawnFacing: true,
    frameSkip: 1,
    rewardWeights: DEFAULT_REWARD_WEIGHTS,
    campCheckTicks: 0,
    campMinClosing: 100,
  };
}

/**
 * Gym-style training environment wrapping headless game simulation.
 * Usage: env.reset(config) → observation, then env.step(move, fire) → { observation, reward, done, info }
 */
export class GameEnv {
  constructor() {
    this._initialized = false;
  }

  /**
   * Initialize a new episode.
   * @param {Object} [config] - episode configuration overrides
   * @returns {Float32Array} initial observation
   */
  reset(config = {}) {
    this._config = { ...getDefaultConfig(), ...config };
    const c = this._config;

    // Agent ship at viewport center, heading up (-PI/2)
    const centerX = VIEWPORT_W / 2;
    const centerY = VIEWPORT_H / 2;
    this._agent = createShip({
      x: centerX,
      y: centerY,
      heading: -Math.PI / 2,
      owner: 'player',
    });

    // Opponent at spawnDistance in random direction
    const spawnAngle = Math.random() * 2 * Math.PI;
    const opponentX = centerX + Math.cos(spawnAngle) * c.spawnDistance;
    const opponentY = centerY + Math.sin(spawnAngle) * c.spawnDistance;
    this._opponent = createShip({
      x: opponentX,
      y: opponentY,
      heading: Math.random() * 2 * Math.PI,
      owner: 'enemy',
    });

    // If spawnFacing: both ships face each other
    if (c.spawnFacing) {
      this._agent.heading = Math.atan2(
        this._opponent.y - this._agent.y,
        this._opponent.x - this._agent.x,
      );
      this._opponent.heading = Math.atan2(
        this._agent.y - this._opponent.y,
        this._agent.x - this._opponent.x,
      );
    } else {
      this._agent.heading = -Math.PI / 2;
      // opponent heading stays random (set above)
    }

    // HP system (internal to GameEnv)
    this._agentHP = c.shipHP;
    this._opponentHP = c.shipHP;

    // Camera following agent
    this._camera = createCamera(this._agent.x, this._agent.y, 0);

    // Asteroid simulation
    const viewportBounds = getViewportBounds(
      this._camera,
      VIEWPORT_W,
      VIEWPORT_H,
    );
    const targetCount = Math.round(ENV_BASE_ASTEROID_COUNT * c.asteroidDensity);
    this._sim = createSimulation(viewportBounds, targetCount, true);

    // Clear spawn zones around both ships
    this._sim.asteroids = clearSpawnZone(this._sim.asteroids, [
      this._agent,
      this._opponent,
    ]);

    // Opponent strategy
    if (c.enemyPolicy === 'static') {
      this._strategy = null;
      this._strategyState = null;
    } else {
      this._strategy = getStrategy(c.enemyPolicy);
      this._strategyState = this._strategy.createState(this._config);
      // Apply per-episode AI tuning overrides (training speed optimization)
      if (c.aiHoldTime != null) this._strategyState.holdTime = c.aiHoldTime;
      if (c.aiSimSteps != null) this._strategyState.simSteps = c.aiSimSteps;
    }

    // Bullets
    this._bullets = [];

    // Death cause tracking
    this._agentDeathCause = null;
    this._opponentDeathCause = null;

    // Counters
    this._tick = 0;
    this._hitsLanded = 0;
    this._hitsTaken = 0;
    this._asteroidsHit = 0;

    // Camp detection: track agent position for periodic movement checks
    this._campCheckX = this._agent.x;
    this._campCheckY = this._agent.y;
    this._nextCampCheck = this._config.campCheckTicks || 0;

    // Initial reward state snapshot
    this._prevRewardState = this._buildRewardState();

    this._initialized = true;

    return buildObservation(this._agent, this._opponent, this._sim.asteroids);
  }

  /**
   * Advance simulation by one tick.
   * @param {number} moveAction - integer 0–9
   * @param {number} fireAction - 0 or 1
   * @returns {{ observation: Float32Array, reward: number, done: boolean, info: Object }}
   */
  step(moveAction, fireAction) {
    if (!this._initialized) {
      throw new Error('Must call reset() before step()');
    }

    // Validate actions
    if (!Number.isInteger(moveAction) || moveAction < 0 || moveAction > 9) {
      throw new Error(
        `Invalid moveAction: ${moveAction}. Must be integer 0–9.`,
      );
    }
    if (fireAction !== 0 && fireAction !== 1) {
      throw new Error(`Invalid fireAction: ${fireAction}. Must be 0 or 1.`);
    }

    // 1. Apply agent action from ACTION_MAP (held for all sub-ticks)
    const action = ACTION_MAP[moveAction];
    this._agent.thrust = action.thrust;
    this._agent.rotatingLeft = action.rotL;
    this._agent.rotatingRight = action.rotR;
    this._agent.braking = action.brake;
    this._agent.fire = fireAction === 1;

    let totalReward = 0;
    let done = false;
    let winner = null;
    const frameSkip = this._config.frameSkip;

    for (let frame = 0; frame < frameSkip; frame++) {
      // 2. Apply opponent AI (if strategy exists and opponent alive)
      if (this._strategy && this._opponent.alive) {
        this._strategy.update(
          this._strategyState,
          this._opponent,
          this._agent,
          this._sim.asteroids,
          DT,
        );
        // Suppress fire if enemyShoots is false
        if (!this._config.enemyShoots) {
          this._opponent.fire = false;
        }
      }

      // 3. Update ships
      updateShip(this._agent, DT);
      updateShip(this._opponent, DT);

      // 4. Bullet firing
      this._tryFire(this._agent);
      this._tryFire(this._opponent);

      // 5. Update camera to follow agent
      this._camera.x = this._agent.x;
      this._camera.y = this._agent.y;

      // 6. Compute viewport → spawn bounds for asteroid simulation
      const viewportBounds = getViewportBounds(
        this._camera,
        VIEWPORT_W,
        VIEWPORT_H,
      );

      // 7. Update asteroid simulation
      updateSimulation(
        this._sim,
        DT,
        viewportBounds,
        this._agent.vx,
        this._agent.vy,
      );

      // 8. Update bullets: move, expire, asteroid collisions
      for (const bullet of this._bullets) {
        updateBullet(bullet, DT);
      }
      this._bullets = this._bullets.filter((b) => !isBulletExpired(b));
      this._bullets = checkBulletAsteroidCollisions(
        this._bullets,
        this._sim.asteroids,
      );

      // 9. Bullet-ship collisions → decrement HP (NOT alive yet)
      const {
        bullets: survivingBullets,
        playerHit,
        enemyHit,
      } = processBulletShipCollisions(
        this._bullets,
        this._agent,
        this._opponent,
      );
      this._bullets = survivingBullets;

      if (playerHit) {
        this._agentHP -= 1;
        this._hitsTaken += 1;
        if (this._agentHP <= 0 && this._agentDeathCause === null) {
          this._agentDeathCause = 'bullet';
        }
      }
      if (enemyHit) {
        this._opponentHP -= 1;
        this._hitsLanded += 1;
        if (this._opponentHP <= 0 && this._opponentDeathCause === null) {
          this._opponentDeathCause = 'bullet';
        }
      }

      // 10. Ship-asteroid collisions → decrement HP (NOT alive yet)
      if (this._agent.alive) {
        const agentAsteroid = checkShipAsteroidCollision(
          this._agent,
          this._sim.asteroids,
        );
        if (agentAsteroid) {
          this._agentHP -= 1;
          this._asteroidsHit += 1;
          if (this._agentHP <= 0 && this._agentDeathCause === null) {
            this._agentDeathCause = 'asteroid';
          }
        }
      }
      if (this._opponent.alive) {
        const opponentAsteroid = checkShipAsteroidCollision(
          this._opponent,
          this._sim.asteroids,
        );
        if (opponentAsteroid) {
          this._opponentHP -= 1;
          if (this._opponentHP <= 0 && this._opponentDeathCause === null) {
            this._opponentDeathCause = 'asteroid';
          }
        }
      }

      // 11. Build current reward state snapshot (alive=true, HP may be 0)
      const currentRewardState = this._buildRewardState();

      // 12. Compute reward (accumulated across sub-ticks)
      totalReward += computeReward(
        this._prevRewardState,
        currentRewardState,
        { moveAction, fireAction },
        this._config,
      );

      // 13. Set alive=false for ships with HP <= 0 (AFTER reward snapshot)
      if (this._agentHP <= 0) {
        this._agent.alive = false;
      }
      if (this._opponentHP <= 0) {
        this._opponent.alive = false;
      }

      // 14. Update prevRewardState
      this._prevRewardState = currentRewardState;

      // 15. Increment tick
      this._tick += 1;

      // 16. Determine done/winner
      if (this._agentHP <= 0 && this._opponentHP <= 0) {
        done = true;
        winner = 'draw_mutual';
      } else if (this._agentHP <= 0) {
        done = true;
        winner = 'opponent';
      } else if (this._opponentHP <= 0) {
        done = true;
        winner = 'agent';
      }

      if (this._tick >= this._config.maxTicks) {
        done = true;
        if (winner === null) {
          winner = 'timeout';
        }
      }

      // Camp check: agent must move campMinClosing px every campCheckTicks
      const campTicks = this._config.campCheckTicks;
      if (campTicks > 0 && this._tick >= this._nextCampCheck && !done) {
        const mdx = this._agent.x - this._campCheckX;
        const mdy = this._agent.y - this._campCheckY;
        const displacement = Math.sqrt(mdx * mdx + mdy * mdy);
        const minClosing = this._config.campMinClosing || 100;
        if (displacement < minClosing) {
          done = true;
          winner = 'opponent';
        } else {
          // Passed — reset checkpoint for next interval
          this._campCheckX = this._agent.x;
          this._campCheckY = this._agent.y;
          this._nextCampCheck = this._tick + campTicks;
        }
      }

      if (done) break;
    }

    // 17. Build observation + info (once, after all sub-ticks)
    const observation = buildObservation(
      this._agent,
      this._opponent,
      this._sim.asteroids,
    );
    const info = {
      winner,
      ticksElapsed: this._tick,
      hitsLanded: this._hitsLanded,
      hitsTaken: this._hitsTaken,
      asteroidsHit: this._asteroidsHit,
      agentDeathCause: this._agentDeathCause,
      opponentDeathCause: this._opponentDeathCause,
    };

    return { observation, reward: totalReward, done, info };
  }

  /**
   * Attempt to fire a bullet from a ship.
   * Inline implementation (logic mirrors simulate.js tryFireBullet).
   */
  _tryFire(ship) {
    ship.fireCooldown = Math.max(ship.fireCooldown - DT, 0);
    if (ship.fire && ship.fireCooldown <= 0 && ship.alive) {
      const noseX = ship.x + Math.cos(ship.heading) * SHIP_SIZE;
      const noseY = ship.y + Math.sin(ship.heading) * SHIP_SIZE;
      this._bullets.push(
        createBullet(noseX, noseY, ship.heading, ship.vx, ship.vy, ship.owner),
      );
      ship.fireCooldown = FIRE_COOLDOWN;
    }
  }

  /**
   * Build a reward state snapshot for computeReward.
   */
  _buildRewardState() {
    return {
      ship: {
        x: this._agent.x,
        y: this._agent.y,
        heading: this._agent.heading,
        vx: this._agent.vx,
        vy: this._agent.vy,
        alive: this._agent.alive,
      },
      target: {
        x: this._opponent.x,
        y: this._opponent.y,
        heading: this._opponent.heading,
        vx: this._opponent.vx,
        vy: this._opponent.vy,
        alive: this._opponent.alive,
      },
      asteroids: this._sim.asteroids,
      shipHP: this._agentHP,
      targetHP: this._opponentHP,
      tick: this._tick,
    };
  }
}
