import { BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import { PATH_LENGTH } from '../config';
import { riverX } from './flightPath';

const HALF_WIDTH = 26;
const WATER_LEVEL = 9;

/** A glowing ribbon of water that mirrors the sunset, winding toward the castle. */
export function createRiver(): Mesh {
  const vertices: number[] = [];
  const indices: number[] = [];
  const step = 20;
  let row = 0;
  for (let z = 1200; z >= -PATH_LENGTH - 400; z -= step, row++) {
    const width = HALF_WIDTH * (0.75 + 0.25 * Math.sin(z * 0.01));
    const center = riverX(z);
    vertices.push(center - width, WATER_LEVEL, z, center + width, WATER_LEVEL, z);
    if (row > 0) {
      const a = (row - 1) * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new MeshStandardMaterial({
    color: '#ffd29a',
    emissive: '#ff9a4a',
    emissiveIntensity: 0.9,
    metalness: 0.9,
    roughness: 0.12,
  });
  return new Mesh(geometry, material);
}
