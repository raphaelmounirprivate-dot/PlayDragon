import { Vector2 } from 'three';

// Keys are read by the character they produce (event.key), so the letters printed on an
// AZERTY keyboard (Z Q S D) work as-is; W/A remain as fallback for QWERTY keyboards.
const UP = ['z', 'w', 'ArrowUp'];
const DOWN = ['s', 'ArrowDown'];
const LEFT = ['q', 'a', 'ArrowLeft'];
const RIGHT = ['d', 'ArrowRight'];
const FIRE = ' ';

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
