/**
 * Create a fresh input state with all flags false.
 */
export function createInputState() {
  return {
    thrust: false,
    rotateLeft: false,
    rotateRight: false,
    brake: false,
    fire: false,
  };
}

const KEY_MAP = {
  w: 'thrust',
  arrowup: 'thrust',
  a: 'rotateLeft',
  arrowleft: 'rotateLeft',
  d: 'rotateRight',
  arrowright: 'rotateRight',
  s: 'brake',
  arrowdown: 'brake',
  ' ': 'fire',
};

function resolveKey(key) {
  return KEY_MAP[key.toLowerCase()] || null;
}

/**
 * Handle a keydown event — set the corresponding input flag to true.
 */
export function handleKeyDown(state, key) {
  const flag = resolveKey(key);
  if (flag) state[flag] = true;
}

/**
 * Handle a keyup event — clear the corresponding input flag.
 */
export function handleKeyUp(state, key) {
  const flag = resolveKey(key);
  if (flag) state[flag] = false;
}

/**
 * Returns true if the key is the restart key (Space).
 */
export function isRestartKey(key) {
  return key === ' ';
}

/**
 * Copy input flags onto ship control booleans.
 */
export function applyInput(inputState, ship) {
  ship.thrust = inputState.thrust;
  ship.rotatingLeft = inputState.rotateLeft;
  ship.rotatingRight = inputState.rotateRight;
  ship.braking = inputState.brake;
  ship.fire = inputState.fire;
}
