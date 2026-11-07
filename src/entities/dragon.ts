import {
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  Group,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { smoothstep } from '../core/noise';
import { createScaleTexture } from '../fx/textures';
import { createTaperedTube, profile, shapeTaperedTube } from './tube';
import { Wing } from './wing';

const MODEL_SCALE = 0.6;
const SPIKE_COUNT = 34;
const Y_AXIS = new Vector3(0, 1, 0);
const WORLD_UP = new Vector3(0, 1, 0);

// Spine from the head (index 0) to the tail tip; the dragon faces -Z.
const SPINE_REST = [
  [0, 7.5, -22], [0, 6.2, -17.5], [0, 4.2, -12.5], [0, 2.2, -7.5], [0, 1.2, -2.5], [0, 0.8, 3],
  [0, 0.8, 9], [0, 1.2, 16], [0, 0.6, 24], [0, -0.4, 32], [0, 0, 40], [0, 1, 48], [0, 0.6, 56],
].map(([x, y, z]) => new Vector3(x, y, z));
const FIRST_TAIL_POINT = 7;

const bodyRadius = profile([[0, 1.05], [0.1, 1.45], [0.2, 2.5], [0.28, 3.2], [0.38, 2.6], [0.52, 1.5], [0.72, 0.75], [0.92, 0.3], [1, 0.08]]);
const spikeHeight = profile([[0, 0.7], [0.15, 1.3], [0.3, 1.9], [0.5, 1.1], [0.85, 0.7], [1, 0.5]]);

function hideMaterial(): MeshStandardMaterial {
  const scales = createScaleTexture();
  scales.repeat.set(3, 3);
  return new MeshStandardMaterial({ map: scales, color: '#6e5f57', bumpMap: scales, bumpScale: 2.5, roughness: 0.5, metalness: 0.2 });
}

function hornMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: '#2c211b', roughness: 0.35, metalness: 0.25 });
}

function staticTube(points: number[][], radius: Array<[number, number]>, material: MeshStandardMaterial): Mesh {
  const geometry = createTaperedTube(20, 8);
  shapeTaperedTube(geometry, new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z))), profile(radius));
  return new Mesh(geometry, material);
}

function createHead(hide: MeshStandardMaterial, horn: MeshStandardMaterial): { head: Group; jaw: Group } {
  const head = new Group();
  const skull = new Mesh(new SphereGeometry(1.6, 24, 16), hide);
  skull.scale.set(1.05, 0.85, 1.4);
  skull.position.set(0, 0.3, -0.6);
  const snout = staticTube([[0, 0.3, -1.5], [0, 0.1, -3.5], [0, -0.2, -5.6]], [[0, 1.2], [0.6, 0.85], [1, 0.45]], hide);
  // The jaw hinges just under the skull so it can open to breathe fire.
  const jaw = new Group();
  jaw.position.set(0, -0.6, -1);
  jaw.add(staticTube([[0, 0, 0], [0, -0.5, -2.2], [0, -0.5, -4]], [[0, 0.95], [1, 0.3]], hide));
  const throat = new Mesh(new SphereGeometry(0.6, 10, 8), new MeshBasicMaterial({ color: new Color(4, 1.4, 0.3) }));
  throat.position.set(0, -0.35, -2.4);
  jaw.add(throat);
  head.add(skull, snout, jaw);

  for (const side of [-1, 1]) {
    const mainHorn = staticTube(
      [[0.7 * side, 1, 0], [1.5 * side, 2.4, 1.6], [2.1 * side, 3.3, 3.8], [2.2 * side, 3.6, 5.8]],
      [[0, 0.5], [0.6, 0.28], [1, 0.03]],
      horn,
    );
    const smallHorn = staticTube([[1.1 * side, 0.2, 0.2], [2.2 * side, 0.6, 1.6], [2.9 * side, 0.7, 2.8]], [[0, 0.3], [1, 0.02]], horn);
    const brow = staticTube([[0.5 * side, 1.05, -2.2], [0.95 * side, 1.15, -1.2], [1.2 * side, 1.1, -0.2]], [[0, 0.2], [0.5, 0.35], [1, 0.15]], horn);
    const eye = new Mesh(new SphereGeometry(0.28, 12, 8), new MeshBasicMaterial({ color: new Color(6, 2.6, 0.5) }));
    eye.position.set(0.95 * side, 0.65, -1.6);
    head.add(mainHorn, smallHorn, brow, eye);
  }
  return { head, jaw };
}

function createLegs(hide: MeshStandardMaterial, horn: MeshStandardMaterial): Group {
  const legs = new Group();
  for (const side of [-1, 1]) {
    legs.add(
      staticTube([[2 * side, 0, 7], [2.8 * side, -2.6, 9], [2.6 * side, -3.6, 13], [2.2 * side, -3.4, 16.5]], [[0, 1.4], [0.5, 0.9], [1, 0.4]], hide),
      staticTube([[1.6 * side, 0.4, -4], [2.2 * side, -1.8, -3], [1.9 * side, -2.6, -0.4]], [[0, 0.85], [1, 0.32]], hide),
    );
    for (const toe of [-0.5, 0, 0.5]) {
      const claw = new Mesh(new ConeGeometry(0.22, 1.4, 5), horn);
      claw.position.set(2.2 * side + toe, -3.4, 17.2);
      claw.rotation.x = Math.PI / 2;
      legs.add(claw);
    }
  }
  return legs;
}

/** How the dragon is moving, used to articulate its body. All values are roughly in [-1, 1]. */
export interface DragonMotion {
  /** Lateral speed: > 0 when moving to its right. */
  turn: number;
  /** Vertical speed: > 0 when climbing, < 0 when diving. */
  climb: number;
  /** Extra effort (boost), 0 to 1. */
  effort: number;
}

const STILL: DragonMotion = { turn: 0, climb: 0, effort: 0 };
const JAW_OPEN_TIME = 0.28;

/** The dragon: procedural body, horned head, spiked spine and flapping membrane wings. */
export class Dragon {
  readonly root = new Group();
  private readonly model = new Group();
  private readonly body: Mesh;
  private readonly spikes: InstancedMesh;
  private readonly head: Group;
  private readonly jaw: Group;
  private readonly legs: Group;
  private readonly tailBlade: Mesh;
  private readonly wings: Wing[];
  private readonly spine = SPINE_REST.map((p) => p.clone());
  private readonly curve = new CatmullRomCurve3(this.spine);
  private flapPhase = 0;
  private neckTurn = 0;
  private neckClimb = 0;
  private tailTurn = 0;
  private tailClimb = 0;
  private fold = 0;
  private glide = 0;
  private jawTimer = 0;

  constructor() {
    const hide = hideMaterial();
    const horn = hornMaterial();
    this.body = new Mesh(createTaperedTube(140, 18), hide);
    this.body.frustumCulled = false;
    this.spikes = new InstancedMesh(new ConeGeometry(0.42, 2.2, 5), horn, SPIKE_COUNT);
    this.spikes.frustumCulled = false;
    const { head, jaw } = createHead(hide, horn);
    this.head = head;
    this.jaw = jaw;
    this.legs = createLegs(hide, horn);
    this.tailBlade = new Mesh(new ConeGeometry(1.8, 5, 4), horn);
    this.tailBlade.scale.set(1, 1, 0.25);
    this.wings = [new Wing(1, horn), new Wing(-1, horn)];

    this.model.add(this.body, this.spikes, this.head, this.tailBlade, this.legs, ...this.wings.map((w) => w.group));
    this.model.scale.setScalar(MODEL_SCALE);
    this.root.add(this.model);
    this.update(0, 0, STILL);
  }

  update(dt: number, time: number, motion: DragonMotion): void {
    // The neck reacts first, the tail follows with a delay: the body flows through turns.
    this.neckTurn = MathUtils.damp(this.neckTurn, motion.turn, 6, dt);
    this.neckClimb = MathUtils.damp(this.neckClimb, motion.climb, 6, dt);
    this.tailTurn = MathUtils.damp(this.tailTurn, motion.turn, 1.8, dt);
    this.tailClimb = MathUtils.damp(this.tailClimb, motion.climb, 1.8, dt);

    this.animateWings(dt, time, motion);
    this.bendSpine(time);
    shapeTaperedTube(this.body.geometry, this.curve, bodyRadius);
    this.placeSpikes();
    this.placeHead();
    this.placeTailBlade();

    this.legs.rotation.x = this.fold * 0.35;
    this.jawTimer = Math.max(0, this.jawTimer - dt);
    this.jaw.rotation.x = MathUtils.damp(this.jaw.rotation.x, this.jawTimer > 0 ? -0.5 : 0, 14, dt);
  }

  /** Opens the jaw briefly, as the dragon breathes fire. */
  openJaw(): void {
    this.jawTimer = JAW_OPEN_TIME;
  }

  mouthPosition(target: Vector3): Vector3 {
    return this.head.localToWorld(target.set(0, -0.3, -6));
  }

  /**
   * Flapping alternates with glides while cruising; climbing or boosting means strong fast beats,
   * diving folds the wings back.
   */
  private animateWings(dt: number, time: number, motion: DragonMotion): void {
    const climbing = Math.max(0, motion.climb);
    const diving = Math.max(0, -motion.climb);
    const glideWave = smoothstep(0.55, 0.85, Math.sin(time * 0.45) * 0.5 + 0.5);
    this.glide = MathUtils.damp(this.glide, glideWave * (1 - motion.effort) * (1 - climbing), 2, dt);
    this.fold = MathUtils.damp(this.fold, Math.min(0.85, diving * 1.3), 4, dt);

    const beat = (1 - this.glide * 0.85) * (1 - this.fold * 0.8);
    this.flapPhase += dt * (3.2 + motion.effort * 2.6 + climbing * 2.2) * (1 - this.glide * 0.6);
    const flap = Math.sin(this.flapPhase) * 0.72 * beat + 0.12 + this.glide * 0.12 - this.fold * 0.2;
    const sweep = Math.cos(this.flapPhase) * 0.16 * beat;
    // The wing on the inside of the turn dips a little more.
    this.wings[0].update(flap - this.neckTurn * 0.12, sweep, this.fold);
    this.wings[1].update(flap + this.neckTurn * 0.12, sweep, this.fold);
    this.model.position.y = -Math.sin(this.flapPhase) * 0.9 * beat;
  }

  private bendSpine(time: number): void {
    for (let i = 0; i < FIRST_TAIL_POINT - 2; i++) {
      const weight = (FIRST_TAIL_POINT - 2 - i) / (FIRST_TAIL_POINT - 2);
      this.spine[i].x = this.neckTurn * 5 * weight * weight;
      this.spine[i].y = SPINE_REST[i].y + this.neckClimb * 2.2 * weight + Math.sin(time * 1.1) * 0.35 * weight;
    }
    const tailPoints = this.spine.length - FIRST_TAIL_POINT;
    for (let i = FIRST_TAIL_POINT; i < this.spine.length; i++) {
      const weight = (i - FIRST_TAIL_POINT + 1) / tailPoints;
      const sway = Math.sin(time * 1.7 - i * 0.6) * 3.2 * weight * (1 - Math.min(1, Math.abs(this.tailTurn)) * 0.6);
      this.spine[i].x = sway - this.tailTurn * 10 * Math.pow(weight, 1.4);
      this.spine[i].y = SPINE_REST[i].y + Math.sin(this.flapPhase - i * 0.5) * 0.9 * weight - this.tailClimb * 5 * weight;
    }
  }

  private placeSpikes(): void {
    const point = new Vector3();
    const tangent = new Vector3();
    const up = new Vector3();
    const side = new Vector3();
    const quaternion = new Quaternion();
    const matrix = new Matrix4();
    const scale = new Vector3();
    for (let i = 0; i < SPIKE_COUNT; i++) {
      const t = 0.03 + (i / (SPIKE_COUNT - 1)) * 0.93;
      this.curve.getPoint(t, point);
      this.curve.getTangent(t, tangent).normalize();
      side.crossVectors(tangent, WORLD_UP).normalize();
      up.crossVectors(side, tangent).normalize();
      point.addScaledVector(up, bodyRadius(t) * 0.92);
      quaternion.setFromUnitVectors(Y_AXIS, up.addScaledVector(tangent, 0.75).normalize());
      const height = spikeHeight(t);
      scale.set(height * 0.9, height, height * 0.9);
      point.addScaledVector(up, height * 0.8);
      this.spikes.setMatrixAt(i, matrix.compose(point, quaternion, scale));
    }
    this.spikes.instanceMatrix.needsUpdate = true;
  }

  private placeHead(): void {
    const forward = this.curve.getTangent(0).negate().normalize();
    this.head.position.copy(this.spine[0]);
    this.head.quaternion.setFromUnitVectors(new Vector3(0, 0, -1), forward);
  }

  private placeTailBlade(): void {
    const tangent = this.curve.getTangent(1).normalize();
    this.tailBlade.position.copy(this.spine[this.spine.length - 1]).addScaledVector(tangent, 1.5);
    this.tailBlade.quaternion.setFromUnitVectors(Y_AXIS, tangent);
  }
}
