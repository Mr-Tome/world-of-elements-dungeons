// Keyboard input for one or two players on the same keyboard.
//
// Player 1 (arrow side):  arrows move/turn, Right-Shift + Up = jump, Right-Shift + Down = duck,
//                         Right-Ctrl = melee, Enter = ranged, / = hero ability
// Player 2 (WASD side):   W/S move, A/D turn, Left-Shift + W = jump, Left-Shift + S = duck,
//                         Alt = melee, Tab = ranged, Q = hero ability
// In 1-player mode Player 1 may use either set of keys (so Alt and Tab work too).

export const BINDINGS = [
  {
    fwd: ['ArrowUp'], back: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    shift: ['ShiftRight'], melee: ['ControlRight'], ranged: ['Enter', 'NumpadEnter'], ability: ['Slash', 'Numpad0'],
  },
  {
    fwd: ['KeyW'], back: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    shift: ['ShiftLeft'], melee: ['AltLeft'], ranged: ['Tab'], ability: ['KeyQ'],
  },
];

const GAME_KEYS = new Set([
  ...BINDINGS.flatMap((b) => Object.values(b).flat()),
  'AltRight', 'ControlLeft', 'Space', 'Escape', 'KeyB', 'KeyI', 'KeyP',
]);

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.capture = false; // when true, game keys don't do their normal browser thing
    window.addEventListener('keydown', (e) => {
      if (this.capture && (GAME_KEYS.has(e.code) || e.altKey || e.ctrlKey)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      if (this.capture && GAME_KEYS.has(e.code)) e.preventDefault();
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => this.down.clear());
  }
  any(codes) { return codes.some((c) => this.down.has(c)); }
  hit(code) { return this.pressed.has(code); }
  anyHit(codes) { return codes.some((c) => this.pressed.has(c)); }
  endFrame() { this.pressed.clear(); }

  // Returns this frame's controls for a player
  player(index, numPlayers) {
    const sets = numPlayers === 1 ? BINDINGS : [BINDINGS[index]];
    const any = (k) => sets.some((b) => this.any(b[k]));
    const hit = (k) => sets.some((b) => this.anyHit(b[k]));
    // A player's own shift key goes with their own arrows/WASD (either shift in 1-player mode)
    const shiftWith = (k) => any('shift') && any(k);
    const jump = shiftWith('fwd');
    const duck = shiftWith('back');
    let move = (any('fwd') ? 1 : 0) - (any('back') ? 1 : 0);
    if (duck) move = 0;
    const turn = (any('left') ? 1 : 0) - (any('right') ? 1 : 0);
    return { move, turn, jump, duck, melee: any('melee'), ranged: any('ranged'), ability: hit('ability') };
  }
}

// Fullscreen + keyboard lock stops Alt+Tab, Tab and Ctrl+W from leaving the game (Chrome/Chromium).
export async function lockKeys(enable) {
  try {
    if (enable && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    if (navigator.keyboard && navigator.keyboard.lock && document.fullscreenElement) await navigator.keyboard.lock();
  } catch (e) {
    console.warn('Fullscreen / keyboard lock not available', e);
  }
}
