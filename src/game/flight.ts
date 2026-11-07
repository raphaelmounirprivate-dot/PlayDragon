import { CatmullRomCurve3, MathUtils, Matrix4, PerspectiveCamera, Vector2, Vector3 } from 'three';
import { FLIGHT_SPEED, SIEGE_DISTANCE, STEER_LIMIT_X, STEER_LIMIT_Y, STEER_SPEED } from '../config';
import { Dragon } from '../entities/dragon';
import { frameAt } from '../world/pathFrame';
import { terrainHeight } from '../world/flightPath';

export type FlightMode = 'menu' | 'voyage' | 'siege' | 'end';

const SIEGE_STEER_FACTOR = 1.5;
const MIN_GROUND_CLEARANCE = 30;

/** Moves the dragon along the valley route and keeps the camera framing it like a painting. */
export class FlightController {
  readonly position = new Vector3();
  readonly forward = new Vector3(0, 0, -1);
  private distance = 0;
  private readonly offset = new Vector2();
  private bank = 0;
  private pitch = 0;
  private time = 0;
  private readonly siegeStart: number;
  private readonly orientation = new Matrix4();

  constructor(
    private readonly curve: CatmullRomCurve3,
    private readonly dragon: Dragon,
    private readonly camera: PerspectiveCamera,
    private readonly castleTarget: Vector3,
  ) {
    this.siegeStart = curve.getLength() - SIEGE_DISTANCE;
  }

  reset(): void {
    this.distance = 0;
    this.offset.set(0, 0);
    this.bank = 0;
    this.pitch = 0;
  }

  /** Fraction of the journey toward the castle, from 0 to 1. */
  journey(): number {
    return this.distance / this.siegeStart;
  }

  reachedCastle(): boolean {
    return this.distance >= this.siegeStart;
  }

  update(dt: number, steerX: number, steerY: number, mode: FlightMode): void {
    this.time += dt;
    if (mode === 'voyage') this.distance = Math.min(this.siegeStart, this.distance + FLIGHT_SPEED * dt);
    if (mode === 'voyage' || mode === 'siege') this.steer(dt, steerX, steerY, mode === 'siege' ? SIEGE_STEER_FACTOR : 1);

    const frame = frameAt(this.curve, this.distance);
    this.position.copy(frame.point).addScaledVector(frame.right, this.offset.x).addScaledVector(frame.up, this.offset.y);
    this.position.y = Math.max(this.position.y, terrainHeight(this.position.x, this.position.z) + MIN_GROUND_CLEARANCE);

    if (mode === 'siege' || (mode === 'end' && this.reachedCastle())) {
      this.forward.copy(this.castleTarget).sub(this.position).setY(0).normalize();
    } else {
      this.forward.copy(frame.tangent);
    }

    this.bank = MathUtils.damp(this.bank, -steerX * 0.55, 4, dt);
    this.pitch = MathUtils.damp(this.pitch, steerY * 0.22, 4, dt);
    this.orientDragon();
    this.dragon.update(dt, this.time, Math.max(0, steerY));
    this.updateCamera(dt, mode);
  }

  private steer(dt: number, steerX: number, steerY: number, factor: number): void {
    const limitX = STEER_LIMIT_X * factor;
    const limitY = STEER_LIMIT_Y * factor;
    this.offset.x = MathUtils.clamp(this.offset.x + steerX * STEER_SPEED * dt, -limitX, limitX);
    this.offset.y = MathUtils.clamp(this.offset.y + steerY * STEER_SPEED * 0.7 * dt, -limitY, limitY);
  }

  private orientDragon(): void {
    const root = this.dragon.root;
    root.position.copy(this.position);
    // Matrix4.lookAt aims +Z away from the target; the model faces -Z, so look toward the point ahead.
    const ahead = this.position.clone().add(this.forward);
    this.orientation.lookAt(this.position, ahead, new Vector3(0, 1, 0));
    root.quaternion.setFromRotationMatrix(this.orientation);
    root.rotateZ(this.bank);
    root.rotateX(this.pitch);
  }

  private updateCamera(dt: number, mode: FlightMode): void {
    const target = new Vector3();
    const lookAt = new Vector3();
    if (mode === 'menu') {
      const angle = Math.sin(this.time * 0.12) * 0.5;
      const side = new Vector3().crossVectors(this.forward, new Vector3(0, 1, 0)).normalize();
      target.copy(this.position).addScaledVector(this.forward, -58).addScaledVector(side, angle * 60).add(new Vector3(0, 14, 0));
      lookAt.copy(this.position).addScaledVector(this.forward, 80).add(new Vector3(0, 18, 0));
    } else {
      // Three-quarter rear view, slightly above: the dragon is silhouetted against the sun.
      const side = new Vector3().crossVectors(this.forward, new Vector3(0, 1, 0)).normalize();
      const siegeView = mode !== 'voyage';
      const height = siegeView ? 46 : 22;
      target.copy(this.position).addScaledVector(this.forward, siegeView ? -70 : -60).addScaledVector(side, 16).add(new Vector3(0, height, 0));
      lookAt.copy(this.position).addScaledVector(this.forward, 110).add(new Vector3(0, 6, 0));
      if (siegeView) lookAt.lerp(this.castleTarget, 0.45);
    }
    const smoothing = 1 - Math.exp(-4 * dt);
    this.camera.position.lerp(target, dt === 0 ? 1 : smoothing);
    this.camera.lookAt(lookAt);
  }
}
