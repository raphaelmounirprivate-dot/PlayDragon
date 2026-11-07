import {
  CatmullRomCurve3,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import { SIEGE_DISTANCE } from '../config';
import { createRandom } from '../core/random';
import { frameAt } from './pathFrame';

export interface Ring {
  mesh: Mesh;
  collected: boolean;
}

export interface Rock {
  mesh: Mesh;
  radius: number;
  hit: boolean;
}

const RING_RADIUS = 24;
const RING_SPACING = 340;
const ROCK_SPACING = 520;

/** Golden rings to fly through and floating rock crags to avoid along the route. */
export class Obstacles {
  readonly group = new Group();
  readonly rings: Ring[] = [];
  readonly rocks: Rock[] = [];

  constructor(curve: CatmullRomCurve3) {
    const random = createRandom(2024);
    const lastDistance = curve.getLength() - SIEGE_DISTANCE - 200;
    const ringMaterial = new MeshStandardMaterial({ color: '#ffcf6a', emissive: '#ffb347', emissiveIntensity: 2.6, metalness: 0.6, roughness: 0.3 });
    for (let d = 400; d < lastDistance; d += RING_SPACING) {
      const mesh = new Mesh(new TorusGeometry(RING_RADIUS, 2, 12, 64), ringMaterial);
      this.place(mesh, curve, d, (random() - 0.5) * 160, (random() - 0.5) * 80);
      this.rings.push({ mesh, collected: false });
      this.group.add(mesh);
    }

    const rockMaterial = new MeshStandardMaterial({ color: '#4a342c', roughness: 1, flatShading: true });
    for (let d = 700; d < lastDistance; d += ROCK_SPACING) {
      const radius = 14 + random() * 14;
      const mesh = new Mesh(new DodecahedronGeometry(radius, 1), rockMaterial);
      mesh.scale.set(1, 1.6 + random(), 1);
      mesh.rotation.set(random() * 3, random() * 3, random() * 3);
      this.place(mesh, curve, d, (random() - 0.5) * 200, (random() - 0.5) * 100);
      this.rocks.push({ mesh, radius: radius * 1.2, hit: false });
      this.group.add(mesh);
    }
  }

  reset(): void {
    for (const ring of this.rings) {
      ring.collected = false;
      ring.mesh.visible = true;
    }
    for (const rock of this.rocks) {
      rock.hit = false;
      rock.mesh.visible = true;
    }
  }

  update(time: number): void {
    for (const ring of this.rings) ring.mesh.rotation.z = time * 0.8;
  }

  isInsideRing(ring: Ring, point: Vector3): boolean {
    return ring.mesh.position.distanceTo(point) < RING_RADIUS;
  }

  private place(mesh: Mesh, curve: CatmullRomCurve3, distance: number, x: number, y: number): void {
    const frame = frameAt(curve, distance);
    mesh.position.copy(frame.point).addScaledVector(frame.right, x).addScaledVector(frame.up, y);
    mesh.lookAt(mesh.position.clone().add(frame.tangent));
  }
}
