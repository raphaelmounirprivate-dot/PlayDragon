import { CatmullRomCurve3, Vector3 } from 'three';
import { FLIGHT_ALTITUDE, PATH_LENGTH } from '../config';
import { ridgedNoise, smoothstep } from '../core/noise';

const CASTLE_HILL_HEIGHT = 160;
const DESCENT = 140;

/** Lateral position of the river (and of the dragon's route) at depth z. */
export function riverX(z: number): number {
  return 260 * Math.sin(z * 0.0011) + 110 * Math.sin(z * 0.0029 + 1.3);
}

export function castlePosition(): Vector3 {
  const z = -PATH_LENGTH;
  return new Vector3(riverX(z) + 40, CASTLE_HILL_HEIGHT, z);
}

/** Terrain height: a river valley carved through ridged mountains, with a hill for the castle. */
export function terrainHeight(x: number, z: number): number {
  const distanceToRiver = Math.abs(x - riverX(z));
  const mountains = ridgedNoise(x * 0.0014, z * 0.0014) * 540 + ridgedNoise(x * 0.006, z * 0.006, 3) * 50;
  const valleyMask = smoothstep(70, 620, distanceToRiver);
  const valleyFloor = 6 + smoothstep(20, 70, distanceToRiver) * 14;
  const height = valleyFloor + (mountains + 30) * valleyMask;

  const castle = castlePosition();
  const distanceToCastle = Math.hypot(x - castle.x, z - castle.z);
  const hill = (1 - smoothstep(60, 380, distanceToCastle)) * CASTLE_HILL_HEIGHT;
  return Math.max(height, hill);
}

/** The smooth curve the dragon follows, high above the river. */
export function createFlightCurve(): CatmullRomCurve3 {
  const points: Vector3[] = [];
  for (let z = 200; z >= -PATH_LENGTH; z -= 200) {
    const descent = smoothstep(-PATH_LENGTH + 1800, -PATH_LENGTH + 500, z) * DESCENT;
    points.push(new Vector3(riverX(z), FLIGHT_ALTITUDE - descent, z));
  }
  return new CatmullRomCurve3(points);
}
