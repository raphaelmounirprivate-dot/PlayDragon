import { BufferAttribute, BufferGeometry, Curve, Vector3 } from 'three';

const WORLD_UP = new Vector3(0, 1, 0);
const tangent = new Vector3();
const side = new Vector3();
const up = new Vector3();
const point = new Vector3();

/** Tube whose radius varies along the curve: dragon body, tail, horns and limbs. */
export function createTaperedTube(segments: number, radialSegments: number): BufferGeometry {
  const ring = radialSegments + 1;
  const vertexCount = (segments + 1) * ring;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertexCount * 3), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(vertexCount * 3), 3));

  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];
  for (let s = 0; s <= segments; s++) {
    for (let r = 0; r <= radialSegments; r++) {
      uvs.set([r / radialSegments, (s / segments) * 6], (s * ring + r) * 2);
      if (s < segments && r < radialSegments) {
        const a = s * ring + r;
        indices.push(a, a + ring, a + 1, a + 1, a + ring, a + ring + 1);
      }
    }
  }
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.userData = { segments, radialSegments };
  return geometry;
}

/** Rewrites the tube vertices to follow `curve` with radius `radiusAt(t)`. */
export function shapeTaperedTube(
  geometry: BufferGeometry,
  curve: Curve<Vector3>,
  radiusAt: (t: number) => number,
  flatten = 1,
): void {
  const positions = geometry.attributes.position as BufferAttribute;
  const { segments, radialSegments } = geometry.userData as { segments: number; radialSegments: number };

  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    curve.getPoint(t, point);
    curve.getTangent(t, tangent).normalize();
    side.crossVectors(tangent, WORLD_UP);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    up.crossVectors(side, tangent).normalize();
    const radius = radiusAt(t);
    for (let r = 0; r <= radialSegments; r++) {
      const angle = (r / radialSegments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      positions.setXYZ(
        s * (radialSegments + 1) + r,
        point.x + (side.x * cos + up.x * sin * flatten) * radius,
        point.y + (side.y * cos + up.y * sin * flatten) * radius,
        point.z + (side.z * cos + up.z * sin * flatten) * radius,
      );
    }
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

/** Piecewise-linear profile through [t, value] keys, eased for an organic silhouette. */
export function profile(keys: Array<[number, number]>): (t: number) => number {
  return (t: number) => {
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i];
      const [t0, v0] = keys[i - 1];
      if (t <= t1) {
        const k = (t - t0) / (t1 - t0);
        const eased = k * k * (3 - 2 * k);
        return v0 + (v1 - v0) * eased;
      }
    }
    return keys[keys.length - 1][1];
  };
}
