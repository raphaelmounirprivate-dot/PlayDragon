import { describe, expect, it } from 'vitest';
import { Abilities, definition } from '../src/logic/abilities';
import { GameState } from '../src/logic/gameState';

function playingWith(score: number): GameState {
  const state = new GameState();
  state.start();
  state.score = score;
  return state;
}

describe('Abilities', () => {
  it('spends points and starts a timed ability', () => {
    const abilities = new Abilities();
    const state = playingWith(1000);
    expect(abilities.activate('shield', state)).toBe(true);
    expect(state.score).toBe(1000 - definition('shield').cost);
    expect(abilities.isActive('shield')).toBe(true);
  });

  it('refuses when points are insufficient', () => {
    const abilities = new Abilities();
    const state = playingWith(definition('meteor').cost - 1);
    expect(abilities.activate('meteor', state)).toBe(false);
    expect(state.score).toBe(definition('meteor').cost - 1);
  });

  it('refuses during the cooldown, then allows again', () => {
    const abilities = new Abilities();
    const state = playingWith(5000);
    abilities.activate('heal', state);
    expect(abilities.activate('heal', state)).toBe(false);
    abilities.update(definition('heal').cooldown);
    expect(abilities.activate('heal', state)).toBe(true);
  });

  it('ends a timed ability after its duration', () => {
    const abilities = new Abilities();
    const state = playingWith(5000);
    abilities.activate('triple', state);
    abilities.update(definition('triple').duration);
    expect(abilities.isActive('triple')).toBe(false);
  });

  it('cannot be used outside a game', () => {
    const abilities = new Abilities();
    const state = new GameState();
    state.score = 5000;
    expect(abilities.activate('shield', state)).toBe(false);
  });

  it('does not keep instant abilities active', () => {
    const abilities = new Abilities();
    const state = playingWith(5000);
    abilities.activate('meteor', state);
    expect(abilities.isActive('meteor')).toBe(false);
    expect(abilities.cooldownRatio('meteor')).toBe(1);
  });
});
