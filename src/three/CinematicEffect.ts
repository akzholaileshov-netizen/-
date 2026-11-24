import { BlendFunction, Effect } from 'postprocessing'
import * as THREE from 'three'
import { REDUCED_MOTION, fx } from '../fx'

const FRAGMENT = /* glsl */ `
  uniform float uHaze;
  uniform float uWarp;
  uniform vec3 uShock;

  float cineHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float cineNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(cineHash(i), cineHash(i + vec2(1.0, 0.0)), f.x),
      mix(cineHash(i + vec2(0.0, 1.0)), cineHash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void mainUv(inout vec2 uv) {
    // Ыстық ауаның дірілі: жоғары көтерілген толқындар, көкжиек тұсында күштірек
    if (uHaze > 0.001) {
      float band = smoothstep(0.02, 0.3, uv.y) * smoothstep(0.92, 0.4, uv.y);
      float n1 = cineNoise(vec2(uv.x * 46.0, uv.y * 24.0 - time * 1.7));
      float n2 = cineNoise(vec2(uv.x * 19.0 + 4.0, uv.y * 11.0 - time * 0.9));
      uv.x += (n1 - 0.5) * 0.0052 * uHaze * band;
      uv.y += (n2 - 0.5) * 0.0038 * uHaze * band;
    }

    // Соққы толқыны: орталықтан тараған сақина кескінді сындырады
    if (uShock.z > 0.0) {
      vec2 d = uv - uShock.xy;
      d.x *= aspect;
      float r = length(d);
      float ring = smoothstep(0.1, 0.0, abs(r - uShock.z * 0.95));
      vec2 dir = d / max(r, 1e-4);
      dir.x /= aspect;
      uv -= dir * ring * 0.035 * (1.0 - uShock.z);
    }

    // Ұшу кезіндегі жылдамдық әсері: кескін шеттері созылады
    if (uWarp > 0.001) {
      vec2 c = uv - 0.5;
      uv = 0.5 + c * (1.0 - uWarp * 0.32 * dot(c, c));
    }
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    outputColor = inputColor;
  }
`

const projected = new THREE.Vector3()

/**
 * Сахналар басқаратын экрандық әсерлер (fx.ts арқылы): ыстық ауаның дірілі,
 * соққы толқыны және камера ұшқандағы созылу. Бір шейдерде — қосымша рендер өтуінсіз.
 */
export class CinematicEffect extends Effect {
  camera: THREE.Camera | null = null

  constructor() {
    super('CinematicEffect', FRAGMENT, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uHaze', new THREE.Uniform(0)],
        ['uWarp', new THREE.Uniform(0)],
        ['uShock', new THREE.Uniform(new THREE.Vector3(0.5, 0.5, -1))],
      ]),
    })
  }

  override update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime = 0.016) {
    const haze = this.uniforms.get('uHaze')!
    const warp = this.uniforms.get('uWarp')!
    const shock = this.uniforms.get('uShock')!.value as THREE.Vector3

    // Сахна ауысқанда діріл кенет өшпей, баяу сөнеді
    const target = REDUCED_MOTION ? 0 : fx.haze
    haze.value += (target - haze.value) * Math.min(1, deltaTime * 3)
    warp.value = REDUCED_MOTION ? 0 : fx.warp

    if (fx.shock >= 0 && fx.shock < 1 && this.camera && !REDUCED_MOTION) {
      projected.copy(fx.shockAt).project(this.camera)
      shock.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5, Math.max(fx.shock, 0.0001))
    } else {
      shock.z = -1
    }
  }
}
