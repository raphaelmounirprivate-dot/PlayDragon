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
  private bannerTimer = 0;

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

  update(dt: number, values: { dragonHp: number; castleIntegrity: number; score: number; journey: number }): void {
    this.dragonHp.style.width = `${values.dragonHp * 100}%`;
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
