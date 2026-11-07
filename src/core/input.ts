import { Vector2 } from 'three';

// Letters are read by the character they produce (event.key), so the AZERTY layout works as
// printed: Z Q S D to steer, E to speed up, A to brake.
const UP = ['z', 'w', 'ArrowUp'];
const DOWN = ['s', 'ArrowDown'];
const LEFT = ['q', 'ArrowLeft'];
const RIGHT = ['d', 'ArrowRight'];
const FASTER = ['e', 'Shift'];
const SLOWER = ['a'];
const FIRE = ' ';
// Digits are read by physical key (event.code): on AZERTY the top row types & é " ' without Shift.
const ABILITY_CODES = [
  ['Digit1', 'Numpad1'],
  ['Digit2', 'Numpad2'],
  ['Digit3', 'Numpad3'],
  ['Digit4', 'Numpad4'],
];

function normalize(event: KeyboardEvent): string {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

/** Keyboard + mouse state, read by the game each frame. */
export class Input {
  readonly pointer = new Vector2();
  private pointerDown = false;
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', (event) => {
      const key = normalize(event);
      if (!this.keys.has(key)) this.pressed.add(key);
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(key);
      if (key === FIRE || key.startsWith('Arrow')) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => this.keys.delete(normalize(event)));
    window.addEventListener('blur', () => this.keys.clear());
    target.addEventListener('pointermove', (event) => {
      this.pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    });
    target.addEventListener('pointerdown', () => (this.pointerDown = true));
    window.addEventListener('pointerup', () => (this.pointerDown = false));
  }

  /** -1 (left) to 1 (right). */
  horizontal(): number {
    return this.axis(RIGHT, LEFT);
  }

  /** -1 (down) to 1 (up). */
  vertical(): number {
    return this.axis(UP, DOWN);
  }

  /** -1 (brake) to 1 (accelerate). */
  throttle(): number {
    return this.axis(FASTER, SLOWER);
  }

  /** Index (0-3) of the ability hotkey pressed this frame, or -1. */
  consumeAbilityKey(): number {
    return ABILITY_CODES.findIndex((codes) => codes.map((code) => this.consume(code)).some(Boolean));
  }

  isFiring(): boolean {
    return this.pointerDown || this.keys.has(FIRE);
  }

  /** True once per key press. */
  consume(key: string): boolean {
    const wasPressed = this.pressed.has(key);
    this.pressed.delete(key);
    return wasPressed;
  }

  private axis(positive: string[], negative: string[]): number {
    const isDown = (keys: string[]) => keys.some((key) => this.keys.has(key));
    return (isDown(positive) ? 1 : 0) - (isDown(negative) ? 1 : 0);
  }
}
