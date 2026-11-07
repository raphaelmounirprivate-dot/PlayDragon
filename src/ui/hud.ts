import { BOOST_FACTOR } from '../config';
import { ABILITIES, AbilityId } from '../logic/abilities';

export interface AbilityView {
  id: AbilityId;
  ready: boolean;
  active: boolean;
  cooldownRatio: number;
}

const ABILITY_ICONS: Record<AbilityId, string> = {
  triple: '<circle cx="5" cy="15" r="2.6"/><circle cx="12" cy="8.5" r="3.2"/><circle cx="19" cy="15" r="2.6"/>',
  shield: '<path d="M12 2.5l7.5 3v5.5c0 5-3.6 8.7-7.5 10.5C8.1 19.7 4.5 16 4.5 11V5.5z"/>',
  heal: '<path d="M12 20.5S4.5 15.8 4.5 9.8A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6c0 6-7.5 10.7-7.5 10.7z"/>',
  meteor: '<circle cx="15.5" cy="8.5" r="4.5"/><path d="M12 13L4 21M9.5 9.5L5 14M14.5 14.5L10 19" stroke-width="2" stroke-linecap="round" fill="none"/>',
};

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

/** Everything drawn over the 3D view: menus, bars, score, banners. */
export class Hud {
  private readonly hud = element('hud');
  private readonly menu = element('menu');
  private readonly end = element('end');
  private readonly pause = element('pause');
  private readonly dragonHp = element('dragon-hp');
  private readonly castleMeter = element('castle-meter');
  private readonly castleHp = element('castle-hp');
  private readonly score = element('score');
  private readonly journey = element('journey-progress');
  private readonly crosshair = element('crosshair');
  private readonly banner = element('banner');
  private readonly flash = element('damage-flash');
  private readonly speed = element('speed');
  private readonly abilityButtons = new Map<AbilityId, HTMLButtonElement>();
  private bannerTimer = 0;

  /** Builds the bottom-left buttons; a click (or its hotkey) calls `onUse`. */
  createAbilityBar(onUse: (id: AbilityId) => void): void {
    const bar = element('abilities');
    for (const ability of ABILITIES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ability';
      button.tabIndex = -1; // never keep focus, or Space (fire) would also press the button
      button.title = `${ability.name} — ${ability.cost} points (touche ${ability.hotkey})`;
      button.innerHTML = `
        <span class="ability-key">${ability.hotkey}</span>
        <svg class="ability-icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" aria-hidden="true">${ABILITY_ICONS[ability.id]}</svg>
        <span class="ability-name">${ability.name}</span>
        <span class="ability-cost">${ability.cost}</span>
        <span class="ability-cooldown"></span>`;
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => onUse(ability.id));
      this.abilityButtons.set(ability.id, button);
      bar.appendChild(button);
    }
  }

  updateAbilities(views: AbilityView[]): void {
    for (const view of views) {
      const button = this.abilityButtons.get(view.id);
      if (!button) continue;
      button.classList.toggle('is-ready', view.ready);
      button.classList.toggle('is-active', view.active);
      button.style.setProperty('--cooldown', String(view.cooldownRatio));
    }
  }

  onStart(callback: () => void): void {
    element('start').addEventListener('click', callback);
    element('restart').addEventListener('click', callback);
  }

  showGame(): void {
    this.menu.classList.add('hidden');
    this.end.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.castleMeter.classList.add('hidden');
  }

  showSiege(): void {
    this.castleMeter.classList.remove('hidden');
    this.announce('Le château est en vue ! Q / D pour en faire le tour');
  }

  showEnd(victory: boolean, score: number, seconds: number): void {
    element('end-eyebrow').textContent = victory ? 'Victoire' : 'Défaite';
    element('end-title').innerHTML = victory ? 'Le château<br />est tombé' : 'Le dragon<br />est tombé';
    element('end-summary').textContent = victory
      ? `Il ne reste que des cendres. ${score} points en ${Math.round(seconds)} secondes.`
      : `Les défenses du château ont eu raison de toi. ${score} points.`;
    this.hud.classList.add('hidden');
    this.end.classList.remove('hidden');
  }

  setPaused(paused: boolean): void {
    this.pause.classList.toggle('hidden', !paused);
  }

  update(dt: number, values: { dragonHp: number; castleIntegrity: number; score: number; journey: number; speed: number }): void {
    this.dragonHp.style.width = `${values.dragonHp * 100}%`;
    this.speed.style.width = `${Math.min(1, values.speed / BOOST_FACTOR) * 100}%`;
    this.castleHp.style.width = `${values.castleIntegrity * 100}%`;
    this.score.textContent = String(values.score);
    this.journey.style.width = `${Math.min(1, values.journey) * 100}%`;
    this.bannerTimer -= dt;
    if (this.bannerTimer <= 0) this.banner.classList.remove('visible');
  }

  moveCrosshair(x: number, y: number): void {
    this.crosshair.style.left = `${((x + 1) / 2) * 100}%`;
    this.crosshair.style.top = `${((1 - y) / 2) * 100}%`;
  }

  announce(text: string): void {
    this.banner.textContent = text;
    this.banner.classList.add('visible');
    this.bannerTimer = 2.6;
  }

  flashDamage(): void {
    this.flash.classList.add('visible');
    requestAnimationFrame(() => requestAnimationFrame(() => this.flash.classList.remove('visible')));
  }
}
