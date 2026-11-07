import { describe, expect, it } from 'vitest';
import { GameState } from '../src/logic/gameState';
import { DRAGON_MAX_HP, ENEMY_SCORE, PART_SCORE, RING_SCORE } from '../src/config';

function siegeWithParts(): GameState {
  const state = new GameState();
  state.registerPart('tower', 2);
  state.registerPart('keep', 3);
  state.start();
  state.beginSiege();
  return state;
}

describe('GameState', () => {
  it('starts a voyage with full health and no score', () => {
    const state = new GameState();
    state.start();
    expect(state.phase).toBe('voyage');
    expect(state.dragonHp).toBe(DRAGON_MAX_HP);
    expect(state.score).toBe(0);
  });

  it('adds score when a ring is collected', () => {
    const state = new GameState();
    state.start();
    state.collectRing();
    expect(state.score).toBe(RING_SCORE);
  });

  it('ends in defeat when the dragon runs out of health', () => {
    const state = new GameState();
    state.start();
    state.damageDragon(DRAGON_MAX_HP + 50);
    expect(state.dragonHp).toBe(0);
    expect(state.phase).toBe('defeat');
  });

  it('rewards each enemy shot down, only during a game', () => {
    const state = new GameState();
    state.killEnemy();
    expect(state.score).toBe(0);
    state.start();
    state.killEnemy();
    state.killEnemy();
    expect(state.score).toBe(ENEMY_SCORE * 2);
  });

  it('heals without exceeding maximum health', () => {
    const state = new GameState();
    state.start();
    state.damageDragon(30);
    state.heal(20);
    expect(state.dragonHp).toBe(DRAGON_MAX_HP - 10);
    state.heal(100);
    expect(state.dragonHp).toBe(DRAGON_MAX_HP);
  });

  it('ignores castle damage outside the siege', () => {
    const state = new GameState();
    state.registerPart('tower', 1);
    state.start();
    expect(state.damagePart('tower')).toBe(false);
    expect(state.castleIntegrity()).toBe(1);
  });

  it('destroys a part when its health reaches zero', () => {
    const state = siegeWithParts();
    expect(state.damagePart('tower')).toBe(false);
    expect(state.damagePart('tower')).toBe(true);
    expect(state.isPartStanding('tower')).toBe(false);
    expect(state.score).toBe(PART_SCORE);
    expect(state.castleIntegrity()).toBeCloseTo(3 / 5);
  });

  it('wins when every castle part is destroyed', () => {
    const state = siegeWithParts();
    state.damagePart('tower', 2);
    state.damagePart('keep', 3);
    expect(state.phase).toBe('victory');
    expect(state.castleIntegrity()).toBe(0);
  });

  it('restores the castle on restart', () => {
    const state = siegeWithParts();
    state.damagePart('tower', 2);
    state.start();
    expect(state.castleIntegrity()).toBe(1);
    expect(state.isPartStanding('tower')).toBe(true);
  });
});
