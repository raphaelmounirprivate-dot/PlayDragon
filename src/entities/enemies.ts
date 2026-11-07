import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';

export interface Enemy {
  group: Group;
  wings: [Mesh, Mesh];
  velocity: Vector3;
  phase: number;
}

const SPEED = 125;
const TURN_RATE = 1.3;
const WEAVE = 30;
const SIZE = 1.7;

/** One bat-like wing as a flat triangle fan, pivoting at the body. */
function createWingGeometry(side: number): BufferGeometry {
  const s = side;
  const points = [0, 0, 0, 9 * s, 2, 1, 7 * s, -1, 4, 0, 0, 0, 7 * s, -1, 4, 3 * s, -0.5, 4.5];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Gargoyles: small winged sentries that dive at the dragon before it reaches the castle. */
export class Enemies {
  readonly group = new Group();
  readonly items: Enemy[] = [];
  private readonly bodyGeometry = new SphereGeometry(2.2, 12, 8);
  private readonly eyeGeometry = new SphereGeometry(0.45, 8, 6);
  private readonly wingGeometries = [createWingGeometry(1), createWingGeometry(-1)];
  private readonly skin = new MeshStandardMaterial({ color: '#2b1a1e', roughness: 0.7, metalness: 0.2 });
  private readonly membrane = new MeshStandardMaterial({ color: '#3a1d1a', roughness: 0.8, side: DoubleSide, emissive: '#ff4a1a', emissiveIntensity: 0.25 });
  private readonly eyes = new MeshBasicMaterial({ color: new Color(6, 0.6, 0.3) });

  spawn(position: Vector3): void {
    const group = new Group();
    const body = new Mesh(this.bodyGeometry, this.skin);
    body.scale.set(1, 0.8, 1.6);
    const wings: [Mesh, Mesh] = [new Mesh(this.wingGeometries[0], this.membrane), new Mesh(this.wingGeometries[1], this.membrane)];
    wings[0].position.x = 1.2;
    wings[1].position.x = -1.2;
    group.add(body, ...wings);
    for (const side of [-1, 1]) {
      const eye = new Mesh(this.eyeGeometry, this.eyes);
      eye.position.set(0.8 * side, 0.6, -3);
      group.add(eye);
    }
    group.position.copy(position);
    group.scale.setScalar(SIZE);
    this.group.add(group);
    this.items.push({ group, wings, velocity: new Vector3(), phase: Math.random() * Math.PI * 2 });
  }

  /** Each gargoyle steers toward the dragon (limited turn rate, so it can be dodged) and weaves. */
  update(dt: number, time: number, target: Vector3): void {
    const desired = new Vector3();
    for (const enemy of this.items) {
      enemy.phase += dt * 14;
      desired.copy(target).sub(enemy.group.position).normalize().multiplyScalar(SPEED);
      desired.x += Math.sin(time * 2 + enemy.phase * 0.05) * WEAVE;
      desired.y += Math.cos(time * 1.6 + enemy.phase * 0.05) * WEAVE * 0.5;
      enemy.velocity.lerp(desired, Math.min(1, TURN_RATE * dt));
      enemy.group.position.addScaledVector(enemy.velocity, dt);
      enemy.group.lookAt(enemy.group.position.clone().sub(enemy.velocity));
      const flap = Math.sin(enemy.phase) * 0.9;
      enemy.wings[0].rotation.z = flap;
      enemy.wings[1].rotation.z = -flap;
    }
  }

  remove(enemy: Enemy): void {
    this.group.remove(enemy.group);
    this.items.splice(this.items.indexOf(enemy), 1);
  }

  clear(): void {
    for (const enemy of [...this.items]) this.remove(enemy);
  }
}
