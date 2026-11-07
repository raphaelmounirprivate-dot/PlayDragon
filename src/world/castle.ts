import {
  Box3,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import { Effects } from '../fx/particles';
import { createStoneTexture } from '../fx/textures';
import { terrainHeight } from './flightPath';

export interface CastlePart {
  id: string;
  hp: number;
  group: Group;
  bounds: Box3;
  top: Vector3;
  shake: number;
  baseX: number;
}

interface Debris {
  mesh: Mesh;
  velocity: Vector3;
  spin: Vector3;
  resting: boolean;
}

interface TowerSpec {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  hp: number;
}

const TOWERS: TowerSpec[] = [
  { id: 'tour-nord-ouest', x: -62, z: -62, radius: 13, height: 72, hp: 3 },
  { id: 'tour-nord-est', x: 62, z: -62, radius: 13, height: 72, hp: 3 },
  { id: 'tour-sud-ouest', x: -62, z: 62, radius: 13, height: 66, hp: 3 },
  { id: 'tour-sud-est', x: 62, z: 62, radius: 13, height: 66, hp: 3 },
  { id: 'porte-ouest', x: -17, z: 64, radius: 9, height: 54, hp: 2 },
  { id: 'porte-est', x: 17, z: 64, radius: 9, height: 54, hp: 2 },
];
const KEEP = { id: 'donjon', hp: 6 };
const WALL_HEIGHT = 38;

/** The fortress waiting at the end of the valley; each tower and the keep can be destroyed. */
export class Castle {
  readonly group = new Group();
  readonly parts: CastlePart[] = [];
  private readonly walls = new Group();
  private readonly debris: Debris[] = [];
  private readonly ruins: Vector3[] = [];
  private readonly stone: MeshStandardMaterial;
  private readonly roof = new MeshStandardMaterial({ color: '#2d2a36', roughness: 0.6, metalness: 0.2 });
  private readonly windowLight = new MeshStandardMaterial({ color: '#000000', emissive: new Color('#ffb050'), emissiveIntensity: 5 });
  private readonly banner = new MeshStandardMaterial({ color: '#6e1414', roughness: 0.8, side: DoubleSide });

  constructor(position: Vector3) {
    const texture = createStoneTexture();
    texture.repeat.set(4, 3);
    this.stone = new MeshStandardMaterial({ map: texture, color: '#d9c2ae', roughness: 0.92, metalness: 0 });
    this.group.position.copy(position);

    for (const spec of TOWERS) this.addPart(spec.id, spec.hp, this.createTower(spec));
    this.addPart(KEEP.id, KEEP.hp, this.createKeep());
    this.createWalls();
    this.group.add(this.walls);
    this.group.updateMatrixWorld(true);
    for (const part of this.parts) this.measure(part);
  }

  reset(): void {
    for (const part of this.parts) {
      part.group.visible = true;
      part.shake = 0;
    }
    this.walls.visible = true;
    for (const piece of this.debris) this.group.remove(piece.mesh);
    this.debris.length = 0;
    this.ruins.length = 0;
  }

  partAt(point: Vector3): CastlePart | undefined {
    return this.parts.find((part) => part.group.visible && part.bounds.containsPoint(point));
  }

  standingParts(): CastlePart[] {
    return this.parts.filter((part) => part.group.visible);
  }

  hit(part: CastlePart): void {
    part.shake = 0.4;
  }

  destroy(part: CastlePart, effects: Effects): void {
    part.group.visible = false;
    const center = part.bounds.getCenter(new Vector3());
    effects.explosion(center, 2.4);
    effects.explosion(part.top, 1.6);
    this.scatterDebris(part.bounds, 26);
    this.ruins.push(new Vector3(center.x, part.bounds.min.y + 8, center.z));
  }

  /** Final collapse once every part has fallen: the curtain walls crumble too. */
  collapseWalls(effects: Effects): void {
    if (!this.walls.visible) return;
    this.walls.visible = false;
    const bounds = new Box3().setFromObject(this.walls);
    this.scatterDebris(bounds, 60);
    for (let i = 0; i < 6; i++) {
      const point = new Vector3(
        bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
        bounds.min.y + 20,
        bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z),
      );
      effects.explosion(point, 1.8);
      this.ruins.push(point);
    }
  }

  update(dt: number, time: number, effects: Effects): void {
    for (const part of this.parts) {
      part.shake = Math.max(0, part.shake - dt);
      part.group.position.x = part.baseX + Math.sin(time * 60) * part.shake * 2;
    }
    for (const ruin of this.ruins) if (Math.random() < 0.6) effects.burning(ruin, 1.4);
    this.updateDebris(dt);
  }

  private addPart(id: string, hp: number, group: Group): void {
    this.group.add(group);
    this.parts.push({ id, hp, group, bounds: new Box3(), top: new Vector3(), shake: 0, baseX: group.position.x });
  }

  private measure(part: CastlePart): void {
    part.bounds.setFromObject(part.group).expandByScalar(6);
    const center = part.bounds.getCenter(new Vector3());
    part.top.set(center.x, part.bounds.max.y - 10, center.z);
  }

  private createTower(spec: TowerSpec): Group {
    const tower = new Group();
    tower.position.set(spec.x, 0, spec.z);
    const base = this.groundOffset(spec.x, spec.z);
    const shaft = new Mesh(new CylinderGeometry(spec.radius, spec.radius * 1.12, spec.height + base, 20), this.stone);
    shaft.position.y = (spec.height - base) / 2;
    const corbel = new Mesh(new CylinderGeometry(spec.radius * 1.2, spec.radius, 5, 20), this.stone);
    corbel.position.y = spec.height + 2.5;
    const roof = new Mesh(new ConeGeometry(spec.radius * 1.35, spec.height * 0.55, 20), this.roof);
    roof.position.y = spec.height + 5 + spec.height * 0.275;
    tower.add(shaft, corbel, roof, this.createBanner(spec.height + 5 + spec.height * 0.55));
    for (let i = 0; i < 3; i++) {
      const window = new Mesh(new BoxGeometry(2, 4.5, 1), this.windowLight);
      const angle = Math.PI / 2 + (i - 1) * 0.9;
      window.position.set(Math.cos(angle) * spec.radius, spec.height * (0.45 + i * 0.17), Math.sin(angle) * spec.radius);
      window.lookAt(window.position.x * 2, window.position.y, window.position.z * 2);
      tower.add(window);
    }
    return tower;
  }

  private createKeep(): Group {
    const keep = new Group();
    keep.position.set(0, 0, -12);
    const body = new Mesh(new BoxGeometry(46, 96, 42), this.stone);
    body.position.y = 40;
    const turret = new Mesh(new CylinderGeometry(11, 11, 34, 18), this.stone);
    turret.position.set(0, 104, 0);
    const roof = new Mesh(new ConeGeometry(15, 46, 18), this.roof);
    roof.position.set(0, 144, 0);
    keep.add(body, turret, roof, this.createBanner(167));
    this.addCrenellations(keep, 46, 42, 88);
    for (let floor = 0; floor < 3; floor++) {
      for (const x of [-12, 0, 12]) {
        const window = new Mesh(new BoxGeometry(3, 6, 1), this.windowLight);
        window.position.set(x, 34 + floor * 18, 21.2);
        keep.add(window);
      }
    }
    return keep;
  }

  private createWalls(): void {
    const segments: Array<[number, number, number, number]> = [
      [-62, -62, 62, -62],
      [-62, -62, -62, 62],
      [62, -62, 62, 62],
      [-62, 62, -17, 64],
      [17, 64, 62, 62],
    ];
    for (const [x1, z1, x2, z2] of segments) {
      const length = Math.hypot(x2 - x1, z2 - z1);
      const wall = new Group();
      wall.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
      wall.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      const base = this.groundOffset(wall.position.x, wall.position.z);
      const body = new Mesh(new BoxGeometry(length, WALL_HEIGHT + base, 8), this.stone);
      body.position.y = (WALL_HEIGHT - base) / 2;
      wall.add(body);
      this.addCrenellations(wall, length, 8, WALL_HEIGHT);
      this.walls.add(wall);
    }
    const gate = new Mesh(new BoxGeometry(20, 26, 2), new MeshStandardMaterial({ color: '#2a1a12', roughness: 1 }));
    gate.position.set(0, 13, 66);
    this.walls.add(gate);
  }

  private addCrenellations(parent: Object3D, width: number, depth: number, y: number): void {
    const merlons = Math.floor(width / 6);
    const mesh = new InstancedMesh(new BoxGeometry(3.2, 4.5, depth + 0.6), this.stone, merlons);
    const dummy = new Object3D();
    for (let i = 0; i < merlons; i++) {
      dummy.position.set(-width / 2 + 3 + i * 6, y + 2.2, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    parent.add(mesh);
  }

  private createBanner(y: number): Group {
    const banner = new Group();
    const pole = new Mesh(new CylinderGeometry(0.4, 0.4, 14, 6), this.roof);
    pole.position.y = y + 7;
    const cloth = new Mesh(new BoxGeometry(9, 5, 0.2), this.banner);
    cloth.position.set(4.6, y + 11.5, 0);
    banner.add(pole, cloth);
    return banner;
  }

  /** How far the ground drops below the castle base at a local position (so towers reach the hillside). */
  private groundOffset(x: number, z: number): number {
    const world = this.group.position;
    return Math.max(0, world.y - terrainHeight(world.x + x, world.z + z)) + 6;
  }

  private scatterDebris(bounds: Box3, count: number): void {
    const center = bounds.getCenter(new Vector3());
    for (let i = 0; i < count; i++) {
      const size = 3 + Math.random() * 6;
      const mesh = new Mesh(new BoxGeometry(size, size * 0.7, size * 0.9), this.stone);
      mesh.position
        .set(
          bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
          bounds.min.y + Math.random() * (bounds.max.y - bounds.min.y),
          bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z),
        )
        .sub(this.group.position);
      const outward = mesh.position.clone().add(this.group.position).sub(center).setY(0).normalize();
      const velocity = outward.multiplyScalar(20 + Math.random() * 50).setY(10 + Math.random() * 40);
      const spin = new Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.debris.push({ mesh, velocity, spin, resting: false });
      this.group.add(mesh);
    }
  }

  private updateDebris(dt: number): void {
    const world = new Vector3();
    for (const piece of this.debris) {
      if (piece.resting) continue;
      piece.velocity.y -= 90 * dt;
      piece.mesh.position.addScaledVector(piece.velocity, dt);
      piece.mesh.rotation.x += piece.spin.x * dt;
      piece.mesh.rotation.y += piece.spin.y * dt;
      piece.mesh.rotation.z += piece.spin.z * dt;
      world.copy(piece.mesh.position).add(this.group.position);
      const ground = terrainHeight(world.x, world.z) - this.group.position.y + 2;
      if (piece.mesh.position.y <= ground) {
        piece.mesh.position.y = ground;
        piece.resting = true;
      }
    }
  }
}
