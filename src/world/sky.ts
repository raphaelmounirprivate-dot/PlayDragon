import { BackSide, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import { SUN_DIRECTION } from '../config';

const vertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = clip.xyww;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 sunDirection;
  uniform float time;
  varying vec3 vDirection;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float sum = 0.0; float amp = 0.5;
    for (int i = 0; i < 6; i++) { sum += noise(p) * amp; p = p * 2.02 + vec2(1.7, 9.2); amp *= 0.5; }
    return sum;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float height = dir.y;
    float sunAmount = max(dot(dir, sunDirection), 0.0);

    vec3 zenith = vec3(0.16, 0.07, 0.08);
    vec3 upper = vec3(0.55, 0.20, 0.09);
    vec3 horizon = vec3(1.15, 0.46, 0.14);
    vec3 below = vec3(0.45, 0.16, 0.08);

    vec3 color = mix(horizon, upper, smoothstep(0.0, 0.22, height));
    color = mix(color, zenith, smoothstep(0.22, 0.8, height));
    color = mix(color, below, smoothstep(0.0, -0.2, height));

    // Warm glow around the low sun
    color += vec3(1.7, 0.95, 0.35) * pow(sunAmount, 14.0) * 0.9;
    color += vec3(1.1, 0.45, 0.12) * pow(sunAmount, 3.0) * 0.45;

    // Painterly cloud masses: dark umber bodies, molten gold where the sun hits their edges
    vec2 uv = dir.xz / max(height + 0.1, 0.04);
    float cloud = fbm(uv * vec2(0.8, 1.9) + vec2(time * 0.004, 0.0));
    float cover = smoothstep(0.42, 0.66, cloud) * smoothstep(-0.02, 0.05, height) * (1.0 - smoothstep(0.55, 0.95, height));
    float rim = smoothstep(0.5, 0.72, cloud) - smoothstep(0.72, 0.9, cloud);
    vec3 shadowCloud = mix(vec3(0.20, 0.07, 0.05), vec3(0.75, 0.30, 0.10), pow(sunAmount, 2.0));
    vec3 litCloud = shadowCloud + vec3(1.5, 0.8, 0.3) * rim * pow(sunAmount, 12.0);
    litCloud += vec3(0.6, 0.25, 0.08) * (1.0 - smoothstep(0.55, 0.8, cloud));
    color = mix(color, litCloud, cover * 0.9);

    // Sun disc, kept very bright so the bloom pass turns it into a halo
    float disc = smoothstep(0.9975, 0.9984, sunAmount);
    color += vec3(7.0, 5.0, 2.6) * disc;

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class Sky {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;

  constructor() {
    this.material = new ShaderMaterial({
      uniforms: { sunDirection: { value: SUN_DIRECTION.clone() }, time: { value: 0 } },
      vertexShader,
      fragmentShader,
      side: BackSide,
      depthWrite: false,
    });
    this.mesh = new Mesh(new SphereGeometry(1000, 48, 24), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  update(cameraPosition: Vector3, time: number): void {
    this.mesh.position.copy(cameraPosition);
    this.material.uniforms.time.value = time;
  }
}
