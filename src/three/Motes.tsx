import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { REDUCED_MOTION } from '../fx'
import { useStage } from '../store/stage'
import type { V3 } from './geo'
import { mulberry32 } from './noise'

/**
 * Бөлшек түрлері:
 *  dust — жұмсақ жарқыраған тозаң, шаң;      spark — жылдамдық бағытына созылған ұшқын;
 *  ash — аунап түсетін күл қиқымы;            fog — ірі, бұлыңғыр тұман шоғыры;
 *  rain — жаңбыр сызықтары;                   petal — қалықтап түсетін күлте;
 *  butterfly — қанатын қаққан көбелек.
 */
export type MoteKind = 'dust' | 'spark' | 'ash' | 'fog' | 'rain' | 'petal' | 'butterfly'

interface Preset {
  shape: 0 | 1 | 2 | 3
  size: number
  stretch: number
  spin: number
  tumble: number
  flap: number
  wobble: number
  twinkle: number
  opacity: number
  additive: boolean
}

const PRESETS: Record<MoteKind, Preset> = {
  dust: { shape: 0, size: 0.06, stretch: 0, spin: 0, tumble: 0, flap: 0, wobble: 0.15, twinkle: 0.6, opacity: 0.8, additive: true },
  spark: { shape: 2, size: 0.05, stretch: 3.2, spin: 0, tumble: 0, flap: 0, wobble: 0.12, twinkle: 0.85, opacity: 1, additive: true },
  ash: { shape: 1, size: 0.075, stretch: 0, spin: 1.4, tumble: 1, flap: 0, wobble: 0.35, twinkle: 0.2, opacity: 0.75, additive: false },
  fog: { shape: 0, size: 7, stretch: 0, spin: 0.04, tumble: 0, flap: 0, wobble: 0.6, twinkle: 0, opacity: 0.07, additive: true },
  rain: { shape: 2, size: 0.022, stretch: 22, spin: 0, tumble: 0, flap: 0, wobble: 0, twinkle: 0.3, opacity: 0.4, additive: true },
  petal: { shape: 1, size: 0.09, stretch: 0, spin: 0.9, tumble: 1, flap: 0, wobble: 0.45, twinkle: 0, opacity: 0.9, additive: false },
  butterfly: { shape: 3, size: 0.2, stretch: 0, spin: 0, tumble: 0, flap: 11, wobble: 0.9, twinkle: 0, opacity: 0.95, additive: false },
}

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uStretch;
  uniform float uSpin;
  uniform float uTumble;
  uniform float uFlap;
  uniform float uWobble;
  uniform float uTwinkle;
  uniform vec3 uBox;
  uniform vec3 uVel;
  attribute vec3 aOffset;
  attribute vec4 aSeed;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vMix;

  void main() {
    float ph = aSeed.w * 6.2831;

    // Қорап ішінде шексіз қозғалыс: шеттен шыққан бөлшек қарсы беттен қайта кіреді
    vec3 p = aOffset + uVel * uTime * (0.65 + 0.7 * aSeed.x);
    p = mod(p + uBox * 0.5, uBox) - uBox * 0.5;
    p.x += sin(uTime * (0.5 + aSeed.y) + ph) * uWobble;
    p.y += sin(uTime * (0.4 + aSeed.z * 0.6) + ph * 1.7) * uWobble * 0.6;
    p.z += cos(uTime * (0.45 + aSeed.x * 0.5) + ph * 0.6) * uWobble;

    vec3 e = abs(p) / (uBox * 0.5);
    float edge = (1.0 - smoothstep(0.78, 1.0, e.x)) * (1.0 - smoothstep(0.78, 1.0, e.y)) * (1.0 - smoothstep(0.78, 1.0, e.z));
    float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (1.5 + aSeed.y * 4.0) + ph * 9.0));
    vAlpha = edge * tw;
    vMix = aSeed.z;
    vUv = uv;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec2 c = position.xy;
    float size = uSize * (0.55 + 0.9 * aSeed.y);

    // Көбелек: қанаттар тік осьті айнала қағылады
    if (uFlap > 0.0) c.x *= 0.1 + 0.9 * abs(cos(uTime * uFlap * (0.8 + 0.4 * aSeed.x) + ph));
    // Күл мен күлте: аунап бара жатқандай көрінеді
    if (uTumble > 0.0) c.y *= 0.25 + 0.75 * abs(sin(uTime * (1.0 + aSeed.z * 2.0) + ph));

    vec2 o;
    if (uStretch > 0.0) {
      // Ұшқын, жаңбыр: қозғалыс бағытына созылған жолақ
      vec2 dir = (modelViewMatrix * vec4(uVel, 0.0)).xy;
      dir = dir / max(length(dir), 1e-4);
      o = vec2(-dir.y, dir.x) * c.x * size + dir * c.y * size * uStretch;
    } else {
      float a = uSpin * uTime * (0.5 + aSeed.x) + ph * step(0.0001, uSpin) + sin(uTime * 1.3 + ph) * 0.5 * step(0.0001, uFlap);
      float cs = cos(a);
      float sn = sin(a);
      o = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs) * size;
    }
    mv.xy += o;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uOpacity;
  uniform int uShape;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vMix;

  void main() {
    vec2 q = vUv - 0.5;
    vec3 col = mix(uColor, uColor2, vMix);
    float a;
    if (uShape == 0) {
      a = smoothstep(0.5, 0.05, length(q));
    } else if (uShape == 1) {
      float r = length(q) * (1.0 + 0.22 * sin(atan(q.y, q.x) * 5.0 + vMix * 20.0));
      a = smoothstep(0.46, 0.34, r);
    } else if (uShape == 2) {
      a = smoothstep(0.5, 0.0, abs(q.x)) * smoothstep(0.5, 0.12, abs(q.y));
    } else {
      vec2 w = vec2(abs(q.x), q.y);
      float upper = length((w - vec2(0.24, 0.11)) * vec2(1.0, 1.25));
      float lower = length((w - vec2(0.17, -0.2)) * vec2(1.3, 1.35));
      a = max(smoothstep(0.26, 0.22, upper), smoothstep(0.2, 0.16, lower));
      float body = smoothstep(0.04, 0.02, abs(q.x)) * smoothstep(0.34, 0.28, abs(q.y));
      col = mix(col, vec3(0.05, 0.035, 0.02), max(body, smoothstep(0.2, 0.26, upper) * a * 0.6));
      a = max(a, body);
    }
    a *= vAlpha * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

interface MotesProps {
  kind?: MoteKind
  /** Ең жоғары сапа деңгейіндегі бөлшектер саны. */
  count: number
  /** Бөлшектер қозғалатын қораптың өлшемі. */
  box: V3
  position?: V3
  color: string
  /** Екінші түс: әр бөлшек екеуінің аралығындағы реңкке боялады. */
  color2?: string
  /** Бөлшектің шамамен диаметрі (сахна бірлігімен). */
  size?: number
  velocity?: V3
  wobble?: number
  twinkle?: number
  opacity?: number
  blending?: 'add' | 'normal'
  seed?: number
  /** Сыртқы реттегіш (0…1): сахна бөлшектердің айқындығын кадр сайын өзгерте алады (мыс., күлдің қоюлануы). */
  level?: RefObject<number>
}

/**
 * Жеңіл бөлшектер жүйесі: бір InstancedMesh (бір draw call), қозғалыс толығымен GPU-да (шейдерде) есептеледі,
 * процессорда кадр сайын тек уақыт жаңартылады. FPS төмендесе, салынатын дана саны азайтылады.
 */
export function Motes({ kind = 'dust', count, box, position = [0, 0, 0], color, color2, velocity = [0, 0, 0], seed = 1, blending, level, ...over }: MotesProps) {
  const quality = useStage((s) => s.quality)
  const mesh = useRef<THREE.InstancedMesh>(null)
  const preset = PRESETS[kind]
  const [bx, by, bz] = box
  const [vx, vy, vz] = velocity
  const size = over.size ?? preset.size
  const wobble = over.wobble ?? preset.wobble
  const twinkle = over.twinkle ?? preset.twinkle
  const opacity = over.opacity ?? preset.opacity
  const additive = blending ? blending === 'add' : preset.additive

  const geometry = useMemo(() => {
    const rnd = mulberry32(seed * 7919)
    const offsets = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      offsets[i * 3] = (rnd() - 0.5) * bx
      offsets[i * 3 + 1] = (rnd() - 0.5) * by
      offsets[i * 3 + 2] = (rnd() - 0.5) * bz
      for (let k = 0; k < 4; k++) seeds[i * 4 + k] = rnd()
    }
    const g = new THREE.PlaneGeometry(1, 1)
    g.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3))
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4))
    return g
  }, [count, bx, by, bz, seed])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: 0.06 },
          uStretch: { value: 0 },
          uSpin: { value: 0 },
          uTumble: { value: 0 },
          uFlap: { value: 0 },
          uWobble: { value: 0 },
          uTwinkle: { value: 0 },
          uBox: { value: new THREE.Vector3(1, 1, 1) },
          uVel: { value: new THREE.Vector3() },
          uColor: { value: new THREE.Color() },
          uColor2: { value: new THREE.Color() },
          uOpacity: { value: 1 },
          uShape: { value: 0 },
        },
      }),
    [],
  )

  useEffect(() => {
    const u = material.uniforms
    u.uSize.value = size
    u.uStretch.value = preset.stretch
    u.uSpin.value = preset.spin
    u.uTumble.value = preset.tumble
    u.uFlap.value = preset.flap
    u.uWobble.value = wobble
    u.uTwinkle.value = twinkle
    u.uBox.value.set(bx, by, bz)
    u.uVel.value.set(vx, vy, vz)
    u.uColor.value.set(color)
    u.uColor2.value.set(color2 ?? color)
    u.uOpacity.value = opacity
    u.uShape.value = preset.shape
    material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending
    material.needsUpdate = true
  }, [material, preset, size, wobble, twinkle, opacity, additive, bx, by, bz, vx, vy, vz, color, color2])

  // Сапа төмендесе немесе «қозғалысты азайту» қосулы болса, бөлшектер сирейді
  useEffect(() => {
    if (mesh.current) mesh.current.count = Math.max(1, Math.ceil(count * quality * (REDUCED_MOTION ? 0.5 : 1)))
  }, [count, quality])

  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    if (level) material.uniforms.uOpacity.value = opacity * level.current
  })

  return <instancedMesh ref={mesh} args={[geometry, material, count]} position={position} frustumCulled={false} />
}
