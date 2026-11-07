import { Color, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';

export interface Projectile {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
}

/** A set of glowing projectiles (dragon fireballs or castle bolts) that leave a trail. */
export class Projectiles {
  readonly group = new Group();
  readonly items: Projectile[] = [];
  private readonly geometry: SphereGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly trail: (position: Vector3, velocity: Vector3) => void;

  constructor(radius: number, color: Color, trail: (position: Vector3, velocity: Vector3) => void) {
    this.geometry = new SphereGeometry(radius, 16, 12);
    this.material = new MeshBasicMaterial({ color });
    this.trail = trail;
  }

  spawn(position: Vector3, velocity: Vector3, life: number): void {
    const mesh = new Mesh(this.geometry, this.material);
    mesh.position.copy(position);
    this.group.add(mesh);
    this.items.push({ mesh, velocity: velocity.clone(), life });
  }

  update(dt: number): void {
    for (const item of [...this.items]) {
      item.life -= dt;
      if (item.life <= 0) {
        this.remove(item);
        continue;
      }
      item.mesh.position.addScaledVector(item.velocity, dt);
      this.trail(item.mesh.position, item.velocity);
    }
  }

  remove(item: Projectile): void {
    this.group.remove(item.mesh);
    this.items.splice(this.items.indexOf(item), 1);
  }

  clear(): void {
    for (const item of [...this.items]) this.remove(item);
  }
}
