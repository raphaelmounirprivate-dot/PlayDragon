import { Color, Vector3 } from 'three';
import { BOLT_SPEED, FIREBALL_COOLDOWN, FIREBALL_SPEED } from '../config';
import { Projectiles } from '../entities/projectiles';
import { Effects, randomDirection } from '../fx/particles';
import { Castle } from '../world/castle';
import { terrainHeight } from '../world/flightPath';
import { Rock } from '../world/obstacles';

const DRAGON_HIT_RADIUS = 9;
const BOLT_INTERVAL_MIN = 3.5;
const BOLT_INTERVAL_MAX = 7;

export interface CombatEvents {
  onCastleHit(partId: string): boolean;
  onDragonHit(): void;
}

/** Dragon fireballs, castle defence bolts and every collision between them and the world. */
export class Combat {
  readonly fireballs: Projectiles;
  readonly bolts: Projectiles;
  private cooldown = 0;
  private readonly boltTimers = new Map<string, number>();

  constructor(
    private readonly effects: Effects,
    private readonly castle: Castle,
    private readonly rocks: Rock[],
  ) {
    this.fireballs = new Projectiles(2.4, new Color(6, 3, 0.9), (position, velocity) => this.fireTrail(position, velocity));
    this.bolts = new Projectiles(1.8, new Color(1.6, 2.6, 6), (position) => this.boltTrail(position));
  }

  reset(): void {
    this.fireballs.clear();
    this.bolts.clear();
    this.cooldown = 0;
    this.boltTimers.clear();
  }

  tryFire(from: Vector3, target: Vector3, dt: number, wantsToFire: boolean): void {
    this.cooldown -= dt;
    if (!wantsToFire || this.cooldown > 0) return;
    this.cooldown = FIREBALL_COOLDOWN;
    const velocity = target.clone().sub(from).normalize().multiplyScalar(FIREBALL_SPEED);
    this.fireballs.spawn(from, velocity, 3);
    for (let i = 0; i < 12; i++) {
      this.effects.fire.emit({
        position: from,
        velocity: velocity.clone().multiplyScalar(0.15).add(randomDirection().multiplyScalar(14)),
        life: 0.35,
        size: 7,
        endSize: 14,
        color: new Color(3, 1.6, 0.5),
        endColor: new Color(0.7, 0.12, 0.02),
      });
    }
  }

  update(dt: number, dragonPosition: Vector3, siege: boolean, events: CombatEvents): void {
    this.fireballs.update(dt);
    this.bolts.update(dt);
    this.resolveFireballs(siege, events);
    this.resolveBolts(dragonPosition, events);
    if (siege) this.fireBolts(dt, dragonPosition);
  }

  private resolveFireballs(siege: boolean, events: CombatEvents): void {
    for (const fireball of [...this.fireballs.items]) {
      const position = fireball.mesh.position;
      const part = siege ? this.castle.partAt(position) : undefined;
      if (part) {
        const destroyed = events.onCastleHit(part.id);
        if (destroyed) this.castle.destroy(part, this.effects);
        else this.castle.hit(part);
        this.effects.explosion(position, 1.2);
        this.fireballs.remove(fireball);
        continue;
      }
      const rock = this.rocks.find((r) => !r.hit && r.mesh.position.distanceTo(position) < r.radius + 4);
      if (rock) {
        rock.hit = true;
        rock.mesh.visible = false;
        this.effects.explosion(rock.mesh.position, 1.4);
        this.fireballs.remove(fireball);
        continue;
      }
      if (position.y < terrainHeight(position.x, position.z)) {
        this.effects.explosion(position, 0.8);
        this.fireballs.remove(fireball);
      }
    }
  }

  private resolveBolts(dragonPosition: Vector3, events: CombatEvents): void {
    for (const bolt of [...this.bolts.items]) {
      if (bolt.mesh.position.distanceTo(dragonPosition) < DRAGON_HIT_RADIUS) {
        events.onDragonHit();
        this.burst(bolt.mesh.position, new Color(1.2, 2, 5));
        this.bolts.remove(bolt);
      }
    }
  }

  private fireBolts(dt: number, dragonPosition: Vector3): void {
    for (const part of this.castle.standingParts()) {
      const timer = (this.boltTimers.get(part.id) ?? Math.random() * BOLT_INTERVAL_MAX) - dt;
      if (timer > 0) {
        this.boltTimers.set(part.id, timer);
        continue;
      }
      this.boltTimers.set(part.id, BOLT_INTERVAL_MIN + Math.random() * (BOLT_INTERVAL_MAX - BOLT_INTERVAL_MIN));
      const aim = dragonPosition.clone().add(randomDirection().multiplyScalar(8));
      const velocity = aim.sub(part.top).normalize().multiplyScalar(BOLT_SPEED);
      this.bolts.spawn(part.top, velocity, 5);
    }
  }

  private fireTrail(position: Vector3, velocity: Vector3): void {
    this.effects.fire.emit({
      position,
      velocity: velocity.clone().multiplyScalar(-0.05).add(randomDirection().multiplyScalar(6)),
      life: 0.45,
      size: 9,
      endSize: 3,
      color: new Color(3.4, 1.7, 0.55),
      endColor: new Color(0.9, 0.15, 0.02),
    });
    if (Math.random() < 0.3) {
      this.effects.smoke.emit({
        position,
        velocity: randomDirection().multiplyScalar(4),
        life: 1.2,
        size: 6,
        endSize: 18,
        color: new Color(0.2, 0.1, 0.08),
        endColor: new Color(0.3, 0.2, 0.16),
      });
    }
  }

  private boltTrail(position: Vector3): void {
    this.effects.fire.emit({
      position,
      velocity: randomDirection().multiplyScalar(3),
      life: 0.35,
      size: 6,
      endSize: 2,
      color: new Color(0.8, 1.4, 4),
      endColor: new Color(0.1, 0.2, 0.8),
    });
  }

  private burst(position: Vector3, color: Color): void {
    for (let i = 0; i < 30; i++) {
      this.effects.fire.emit({
        position,
        velocity: randomDirection().multiplyScalar(40 + Math.random() * 40),
        life: 0.5,
        size: 6,
        endSize: 1,
        color,
        drag: 3,
      });
    }
  }
}
