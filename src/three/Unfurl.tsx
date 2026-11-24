import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { REDUCED_MOTION } from '../fx'
import { frond } from './geo'
import { mulberry32 } from './noise'

const TAU = Math.PI * 2

/**
 * Жайылатын папоротник. Пішіні plants.ts-тегі fernGeo-мен бірдей, бірақ әр төбе өз вайясының
 * жергілікті координаталарын да сақтайды (aLocal, aFrond) — шейдер вайяны ұшынан бастап «ұлу» тәрізді
 * спиральға орап қоя алады да, кейін түбінен ұшына қарай біртіндеп жазады.
 */
function unfurlFernGeo(seed = 1) {
  const rnd = mulberry32(seed)
  const parts: THREE.BufferGeometry[] = []
  const n = 13
  for (let i = 0; i < n; i++) {
    const inner = i % 3 === 0
    const length = (inner ? 0.7 : 0.95) + rnd() * 0.35
    const width = 0.15 + rnd() * 0.05
    const rise = (inner ? 1.7 : 1.0) + rnd() * 0.4
    const droop = (inner ? 1.3 : 1.05) + rnd() * 0.3
    const f = frond({ length, width, teeth: 10, zig: 0.38, rise, droop, color: '#1c5631', tip: '#6aa655' })
    const yaw = (i / n) * TAU + rnd() * 0.35

    const count = f.getAttribute('position').count
    const frondData = new Float32Array(count * 4)
    const order = new Float32Array(count)
    for (let k = 0; k < count; k++) {
      frondData.set([yaw, length, rise, droop], k * 4)
      // Ішкі (тік) вайялар кейінірек, сыртқылары ертерек жайылады
      order[k] = (inner ? 0.55 : 0) + (i / n) * 0.45
    }
    f.setAttribute('aLocal', f.getAttribute('position').clone())
    f.setAttribute('aFrond', new THREE.BufferAttribute(frondData, 4))
    f.setAttribute('aOrder', new THREE.BufferAttribute(order, 1))
    // position пен normal соңғы (жайылған) күйді сақтайды: шекаралық сфера мен жарықтандыруға керек
    f.rotateY(yaw)
    parts.push(f)
  }
  const merged = mergeGeometries(parts, false)
  merged.computeBoundingSphere()
  return merged
}

const UNFURL_PARS = /* glsl */ `
  attribute vec3 aLocal;
  attribute vec4 aFrond;
  attribute float aOrder;
  uniform float uUnfurl;
`

const UNFURL_VERTEX = /* glsl */ `
  vec3 transformed;
  {
    float L = aFrond.y;
    float rise = aFrond.z;
    float droop = aFrond.w;
    float u = clamp(uUnfurl - aOrder * 0.6, 0.0, 1.0);
    float e = u * u * (3.0 - 2.0 * u);
    vec3 p = aLocal;
    // x0-ге дейінгі бөлік жазылған, одан арғысы әлі спиральға оралған күйде
    float x0 = L * e * 1.03;
    if (p.x > x0) {
      vec2 T = normalize(vec2(1.0, rise - 2.0 * droop * x0 / L));
      vec2 N = vec2(-T.y, T.x);
      float y0 = rise * x0 - droop * x0 * x0 / L;
      float off = p.y - (rise * p.x - droop * p.x * p.x / L);
      float R0 = L * (0.05 + 0.075 * (1.0 - e));
      float th = (p.x - x0) / R0;
      float r = R0 * exp(-0.085 * th) - off;
      vec2 q = vec2(x0, y0) + N * R0 + T * (sin(th) * r) - N * (cos(th) * r);
      p.x = q.x;
      p.y = q.y;
      // Оралған бөліктегі жапырақшалар әлі жиналған
      p.z *= mix(0.3, 1.0, exp(-th * 0.6));
    }
    // Вайя жайыла жүріп өседі
    p *= 0.3 + 0.7 * e;
    float cy = cos(aFrond.x);
    float sy = sin(aFrond.x);
    transformed = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  }
`

const patch = (uniforms: { uUnfurl: { value: number } }) => (shader: { uniforms: Record<string, unknown>; vertexShader: string }) => {
  Object.assign(shader.uniforms, uniforms)
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${UNFURL_PARS}`)
    .replace('#include <begin_vertex>', UNFURL_VERTEX)
}

/** Барлық вайя толық жайылуына кететін уақыт (секунд). */
const DURATION = 3.4

/**
 * 9-слайдтың басты папоротнигі: `active` болған сайын вайялары ұлу тәрізді оралған күйден
 * бірінен соң бірі жайылып шығады (growth animation). Көлеңкесі де бірге жайылады.
 */
export function UnfurlFern({ active, scale = 1, seed = 1 }: { active: boolean; scale?: number; seed?: number }) {
  const geometry = useMemo(() => unfurlFernGeo(seed), [seed])
  const { material, depth, uniforms } = useMemo(() => {
    const u = { uUnfurl: { value: REDUCED_MOTION ? 2 : 0 } }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide })
    mat.onBeforeCompile = patch(u)
    mat.customProgramCacheKey = () => 'unfurl'
    const dep = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide })
    dep.onBeforeCompile = patch(u)
    dep.customProgramCacheKey = () => 'unfurl-depth'
    return { material: mat, depth: dep, uniforms: u }
  }, [])
  const progress = useRef(0)

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      depth.dispose()
    },
    [geometry, material, depth],
  )

  // Қайта таңдалған сайын анимация басынан басталады
  useEffect(() => {
    if (active) progress.current = -0.35
  }, [active])

  useFrame((_, delta) => {
    if (REDUCED_MOTION) return
    if (active) progress.current = Math.min(1.7, progress.current + (Math.min(delta, 0.05) * 1.6) / DURATION)
    uniforms.uUnfurl.value = Math.max(0, progress.current)
  })

  return <mesh geometry={geometry} material={material} customDepthMaterial={depth} scale={scale} castShadow receiveShadow frustumCulled={false} />
}
