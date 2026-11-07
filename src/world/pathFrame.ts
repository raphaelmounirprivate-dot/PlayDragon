import { CatmullRomCurve3, Vector3 } from 'three';

export interface PathFrame {
  point: Vector3;
  tangent: Vector3;
  right: Vector3;
  up: Vector3;
}

const WORLD_UP = new Vector3(0, 1, 0);

/** Position and orientation on the flight curve, `distance` units from its start. */
export function frameAt(curve: CatmullRomCurve3, distance: number): PathFrame {
  const u = Math.min(1, Math.max(0, distance / curve.getLength()));
  const point = curve.getPointAt(u);
  const tangent = curve.getTangentAt(u).normalize();
  const right = new Vector3().crossVectors(tangent, WORLD_UP).normalize();
  const up = new Vector3().crossVectors(right, tangent).normalize();
  return { point, tangent, right, up };
}
