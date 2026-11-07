import { BufferAttribute, Color, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { PATH_LENGTH } from '../config';
import { smoothstep, valueNoise } from '../core/noise';
import { riverX, terrainHeight } from './flightPath';

const WIDTH = 7000;
const DEPTH = PATH_LENGTH + 2600;
const CENTER_Z = -PATH_LENGTH / 2 + 300;

const meadow = new Color('#3d4a2a');
const forest = new Color('#24301f');
const rock = new Color('#5a4038');
const ridge = new Color('#8a5a44');
const snowlit = new Color('#c98e68');

function colorAt(x: number, z: number, height: number, slope: number): Color {
  const variation = valueNoise(x * 0.02, z * 0.02);
  const color = meadow.clone().lerp(forest, smoothstep(0.3, 0.7, variation));
  color.lerp(rock, smoothstep(40, 160, height) * 0.8 + slope * 0.5);
  color.lerp(ridge, smoothstep(220, 420, height));
  color.lerp(snowlit, smoothstep(480, 640, height) * 0.7);
  return color;
}

/** Mountains and valley as one large displaced plane with painted vertex colors. */
export function createTerrain(): Mesh {
  const geometry = new PlaneGeometry(WIDTH, DEPTH, 320, 620);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, CENTER_Z);

  const positions = geometry.attributes.position as BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + riverX(positions.getZ(i)) * 0.5;
    const z = positions.getZ(i);
    positions.setX(i, x);
    positions.setY(i, terrainHeight(x, z));
  }
  geometry.computeVertexNormals();

  const normals = geometry.attributes.normal as BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const slope = 1 - normals.getY(i);
    const color = colorAt(positions.getX(i), positions.getZ(i), positions.getY(i), slope);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));

  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}
