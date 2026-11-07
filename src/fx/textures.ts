import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture } from 'three';
import { smoothstep, valueNoise } from '../core/noise';
import { createRandom } from '../core/random';

function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  return [canvas, context];
}

function toTexture(canvas: HTMLCanvasElement, srgb = true): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  if (srgb) texture.colorSpace = SRGBColorSpace;
  return texture;
}

function fbm(x: number, y: number): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < 5; i++) {
    sum += valueNoise(x * frequency, y * frequency) * amplitude;
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return sum / 0.97;
}

/** Billowing cumulus silhouette with a flat base, as a density map in [0, 1]. */
function cloudDensity(size: number, seed: number): Float32Array {
  const density = new Float32Array(size * size);
  const offsetX = seed * 17.31;
  const offsetY = seed * 5.77;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dx = (u - 0.5) / 0.46;
      const dy = (v - 0.62) / 0.36;
      const shape = 1 - Math.sqrt(dx * dx + dy * dy);
      const billow = fbm(u * 6 + offsetX, v * 6 + offsetY);
      const flatBase = 1 - smoothstep(0.7, 0.86, v);
      density[y * size + x] = smoothstep(0.02, 0.3, shape + (billow - 0.5) * 0.95) * flatBase;
    }
  }
  return density;
}

/**
 * Painterly cumulus backlit by a low sun: dark umber body,
 * molten gold where light grazes the upper crests.
 */
export function createCloudTexture(seed: number): Texture {
  const size = 256;
  const [canvas, context] = createCanvas(size, size);
  const density = cloudDensity(size, seed);
  const image = context.createImageData(size, size);
  const sample = (x: number, y: number) => (y < 0 ? 0 : density[y * size + x]);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = density[y * size + x];
      const occlusion = (sample(x, y - 5) + sample(x, y - 11) + sample(x, y - 20)) / 3;
      const light = 1 - occlusion;
      const rim = Math.pow(light, 2.5) * (0.4 + 0.6 * (1 - d));
      const index = (y * size + x) * 4;
      image.data[index] = Math.min(255, 62 + 120 * light + 190 * rim);
      image.data[index + 1] = Math.min(255, 26 + 52 * light + 150 * rim);
      image.data[index + 2] = Math.min(255, 22 + 22 * light + 90 * rim);
      image.data[index + 3] = 255 * d;
    }
  }
  context.putImageData(image, 0, 0);
  return toTexture(canvas);
}

/** Soft round glow used by fire, sparks, smoke and the sun haze. */
export function createGlowTexture(): Texture {
  const size = 128;
  const [canvas, context] = createCanvas(size, size);
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return toTexture(canvas);
}

/** Overlapping dark scales, used as bump and color detail on the dragon's hide. */
export function createScaleTexture(): Texture {
  const width = 256;
  const height = 256;
  const [canvas, context] = createCanvas(width, height);
  context.fillStyle = '#2a1d17';
  context.fillRect(0, 0, width, height);
  const scale = 16;
  for (let row = 0; row < height / (scale * 0.55) + 2; row++) {
    for (let col = 0; col < width / scale + 2; col++) {
      const x = col * scale + (row % 2) * scale * 0.5;
      const y = row * scale * 0.55;
      const gradient = context.createRadialGradient(x, y - scale * 0.3, 1, x, y, scale * 0.65);
      gradient.addColorStop(0, '#6b4a36');
      gradient.addColorStop(0.7, '#33241b');
      gradient.addColorStop(1, '#120c09');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, scale * 0.6, 0, Math.PI);
      context.fill();
    }
  }
  const texture = toTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

/** Weathered ashlar masonry for the castle. */
export function createStoneTexture(): Texture {
  const size = 256;
  const [canvas, context] = createCanvas(size, size);
  const random = createRandom(3);
  context.fillStyle = '#4a3a33';
  context.fillRect(0, 0, size, size);
  const rowHeight = 21;
  for (let row = 0; row * rowHeight < size; row++) {
    let x = row % 2 === 0 ? 0 : -18;
    while (x < size) {
      const width = 30 + random() * 26;
      const shade = 120 + Math.floor(random() * 50);
      context.fillStyle = `rgb(${shade},${Math.floor(shade * 0.84)},${Math.floor(shade * 0.72)})`;
      context.fillRect(x + 1.5, row * rowHeight + 1.5, width - 3, rowHeight - 3);
      x += width;
    }
  }
  const texture = toTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

/** Leathery wing membrane with dark veins and glints of ember light. */
export function createMembraneTexture(): Texture {
  const size = 512;
  const [canvas, context] = createCanvas(size, size);
  const random = createRandom(7);
  const base = context.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, '#3a2219');
  base.addColorStop(1, '#22130e');
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  context.strokeStyle = 'rgba(12,6,4,0.75)';
  for (let i = 0; i < 60; i++) {
    let x = random() * size;
    let y = random() * size;
    context.lineWidth = 0.6 + random() * 1.8;
    context.beginPath();
    context.moveTo(x, y);
    for (let s = 0; s < 8; s++) {
      x += (random() - 0.5) * 40;
      y += (random() - 0.3) * 40;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  for (let i = 0; i < 260; i++) {
    const alpha = 0.15 + random() * 0.5;
    context.fillStyle = `rgba(255,${140 + Math.floor(random() * 80)},70,${alpha})`;
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  return toTexture(canvas);
}
