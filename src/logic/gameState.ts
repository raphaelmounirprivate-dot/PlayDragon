import { DRAGON_MAX_HP, PART_SCORE, RING_SCORE } from '../config';

export type Phase = 'menu' | 'voyage' | 'siege' | 'victory' | 'defeat';

/** Pure game rules: phases, health, score and castle damage. No rendering here. */
export class GameState {
  phase: Phase = 'menu';
  dragonHp = DRAGON_MAX_HP;
  score = 0;
  elapsed = 0;
  private readonly partHp = new Map<string, number>();
  private readonly partMaxHp = new Map<string, number>();

  start(): void {
    this.phase = 'voyage';
    this.dragonHp = DRAGON_MAX_HP;
    this.score = 0;
    this.elapsed = 0;
    for (const [id, max] of this.partMaxHp) this.partHp.set(id, max);
  }

  registerPart(id: string, hp: number): void {
    this.partMaxHp.set(id, hp);
    this.partHp.set(id, hp);
  }

  tick(dt: number): void {
    if (this.isPlaying()) this.elapsed += dt;
  }

  isPlaying(): boolean {
    return this.phase === 'voyage' || this.phase === 'siege';
  }

  beginSiege(): void {
    if (this.phase === 'voyage') this.phase = 'siege';
  }

  collectRing(): void {
    this.score += RING_SCORE;
  }

  damageDragon(amount: number): void {
    if (!this.isPlaying()) return;
    this.dragonHp = Math.max(0, this.dragonHp - amount);
    if (this.dragonHp === 0) this.phase = 'defeat';
  }

  heal(amount: number): void {
    if (this.isPlaying()) this.dragonHp = Math.min(DRAGON_MAX_HP, this.dragonHp + amount);
  }

  /** Returns true when this hit destroys the part. */
  damagePart(id: string, amount = 1): boolean {
    const hp = this.partHp.get(id);
    if (hp === undefined || hp <= 0 || this.phase !== 'siege') return false;
    const remaining = Math.max(0, hp - amount);
    this.partHp.set(id, remaining);
    if (remaining > 0) return false;
    this.score += PART_SCORE;
    if (this.castleIntegrity() === 0) this.phase = 'victory';
    return true;
  }

  isPartStanding(id: string): boolean {
    return (this.partHp.get(id) ?? 0) > 0;
  }

  /** Remaining castle health between 0 and 1. */
  castleIntegrity(): number {
    let current = 0;
    let max = 0;
    for (const [id, hpMax] of this.partMaxHp) {
      max += hpMax;
      current += this.partHp.get(id) ?? 0;
    }
    return max === 0 ? 1 : current / max;
  }
}
