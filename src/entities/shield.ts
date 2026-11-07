import { AdditiveBlending, Color, IcosahedronGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';

const RADIUS = 26;

/** Golden protective bubble around the dragon while the shield ability is active. */
export class Shield {
  readonly mesh: Mesh;
  private readonly material: MeshBasicMaterial;

  constructor() {
    this.material = new MeshBasicMaterial({
      color: new Color(1.6, 0.9, 0.3),
      transparent: true,
      opacity: 0.18,
      blending: AdditiveBlending,
      depthWrite: false,
      wireframe: true,
    });
    this.mesh = new Mesh(new IcosahedronGeometry(RADIUS, 2), this.material);
    this.mesh.visible = false;
  }

  update(position: Vector3, active: boolean, time: number): void {
    this.mesh.visible = active;
    if (!active) return;
    this.mesh.position.copy(position);
    this.mesh.rotation.set(time * 0.4, time * 0.7, 0);
    this.material.opacity = 0.14 + Math.sin(time * 6) * 0.05;
  }
}
