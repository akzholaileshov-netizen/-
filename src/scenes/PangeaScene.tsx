import { Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { REDUCED_MOTION, fx } from '../fx'
import { useStage } from '../store/stage'
import { ramp, useAge } from '../three/anim'
import { Glow, Sun } from '../three/Atmos'
import { Label } from '../three/Kit'
import { Motes } from '../three/Motes'
import { noise3, smoothstep } from '../three/noise'
import { pangeaColor, pangeaField, pangeaMountains, type RGB } from '../three/pangea'
import { SceneRig } from '../three/SceneRig'

const SIZE = 11
const SEGMENTS = 170
/** Сібір трапптарының шартты орны: суперматериктің солтүстік-шығысы (x — шығыс, −z — солтүстік). */
const TRAPS: [number, number] = [2.3, -3.0]

/** Әр тақтаның жылжу қашықтығы (солтүстікке/оңтүстікке) және бүйірге ығысуы. */
const DRIFT = 0.55
const SLIDE = 0.2
/** Жарықтың екі жағындағы созылып, теңіз астына түсетін жолақтың ені. */
const BAND = 0.2

/**
 * Негізгі тектоникалық жарық: Тетис шығанағынан батысқа қарай суперматерикті екіге бөледі
 * (солтүстігі — Лавразия, оңтүстігі — Гондвана). Қайтарылатын мән — жарыққа дейінгі таңбалы қашықтық.
 */
function riftDistance(x: number, v: number) {
  const line = 0.5 + 0.22 * Math.sin(x * 0.8 + 0.4) + (noise3(x * 1.3, 4.1, 0.7) - 0.5) * 0.5
  return v - line + (noise3(x * 4.2, v * 4.2, 9.3) - 0.5) * 0.09
}

/** Екінші реттік жарықтар — кейін материктер бөлінетін жіктер. Қайтарылатын мән — ең жақын жарыққа дейінгі қашықтық. */
function crackDistance(x: number, v: number) {
  const jag = (noise3(x * 3.7, v * 3.7, 2.2) - 0.5) * 0.16
  const span = (t: number, a: number, b: number) => Math.max(0, a - t, t - b)
  // Оңтүстік Америка | Африка
  const a = Math.abs(x - (-0.55 + 0.28 * Math.sin(v * 1.3)) + jag) + span(v, -3.3, 0.2)
  // Солтүстік Америка | Еуразия
  const b = Math.abs(x - (-0.15 + 0.22 * Math.sin(v * 1.7 + 1)) + jag) + span(v, 0.95, 3.4)
  // Африка | Үндістан · Антарктида · Аустралия
  const c = Math.abs(v - (-2.05 + 0.25 * Math.sin(x * 1.1)) + jag) + span(x, 0.2, 3.6)
  return Math.min(a, b, c)
}

/** Пангеяның бедерлі картасы: биіктік өрісінен жасалған тор + vertex color + жарықтарға дейінгі қашықтықтар. */
function buildRelief() {
  const g = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
  g.rotateX(-Math.PI / 2)
  const pos = g.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
  const rift = new Float32Array(pos.count * 3)
  const rgb: RGB = [0, 0, 0]
  const c = new THREE.Color()
  const basalt = new THREE.Color('#241712')

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const f = pangeaField(x, -z)
    const nx = x * 0.45
    const nz = -z * 0.45
    let y: number
    if (f > 0) {
      y = 0.03 + smoothstep(0, 0.2, f) * 0.1 + pangeaMountains(f, nx, 0.7, nz) * 0.24 + (noise3(x * 3, 2, z * 3) - 0.5) * 0.03
    } else {
      y = -0.05 - smoothstep(0, -0.7, f) * 0.36
    }
    pos.setY(i, y)

    pangeaColor(f, nx, 0.7, nz, rgb)
    c.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace)
    // Трапптар аймағы — қарайған базальт жазығы
    const d = Math.hypot(x - TRAPS[0], z - TRAPS[1])
    if (f > 0) c.lerp(basalt, smoothstep(0.95, 0.35, d) * 0.85)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b

    // x — негізгі жарыққа дейінгі таңбалы қашықтық (+ солтүстік тақта), y — екінші реттік жарықтарға дейін, z — құрлық маскасы
    rift[i * 3] = riftDistance(x, -z)
    rift[i * 3 + 1] = crackDistance(x, -z)
    rift[i * 3 + 2] = smoothstep(-0.3, 0.02, f)
  }
  g.deleteAttribute('uv')
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.setAttribute('aRift', new THREE.BufferAttribute(rift, 3))
  g.computeVertexNormals()
  return g
}

/**
 * Бедер материалы: стандартты жарықтандыру + шейдердегі тақталар қозғалысы.
 * uSplit өскен сайын екі тақта екі жаққа жылжиды, жарық бойындағы жолақ созылып теңіз астына түседі (жаңа мұхит),
 * uCrack — жарықтардағы лаваның жарқырауы.
 */
function makeReliefMaterial() {
  const uniforms = { uSplit: { value: 0 }, uCrack: { value: 0 }, uTime: { value: 0 } }
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        attribute vec3 aRift;
        uniform float uSplit;
        varying vec3 vRift;
        varying float vSink;`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        {
          float ad = abs(aRift.x);
          float sgn = aRift.x < 0.0 ? -1.0 : 1.0;
          // Карта шетіне жақындағанда қозғалыс өшеді — тор жиектемеден шықпайды
          float inside = 1.0 - smoothstep(4.7, 5.45, max(abs(position.x), abs(position.z)));
          float move = smoothstep(0.0, ${BAND.toFixed(2)}, ad) * uSplit * inside;
          transformed.z -= sgn * move * ${DRIFT.toFixed(2)};
          transformed.x -= sgn * move * ${SLIDE.toFixed(2)};
          float sink = (1.0 - smoothstep(${(BAND * 0.35).toFixed(3)}, ${(BAND * 1.5).toFixed(3)}, ad)) * smoothstep(0.02, 0.4, uSplit);
          transformed.y = mix(transformed.y, min(transformed.y, -0.3), sink);
          vSink = sink;
          vRift = vec3(aRift.x + sgn * move * ${DRIFT.toFixed(2)}, aRift.y, aRift.z);
        }`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uSplit;
        uniform float uCrack;
        uniform float uTime;
        varying vec3 vRift;
        varying float vSink;`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        // Жаңа ашылған мұхит түбі
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012, 0.06, 0.085), vSink);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        {
          float flicker = 0.74 + 0.26 * sin(uTime * 2.6 + vRift.z * 5.0);
          // Негізгі жарық: бөлінген соң ортасында су астындағы жіңішке лава жолағы қалады (орта-мұхиттық жота)
          float mainLine = exp(-abs(vRift.x) * 34.0 / (1.0 + uSplit * 0.8)) * vRift.z * mix(1.0, 0.5, uSplit);
          // Екінші реттік жарықтар тек құрлықта, жіңішке
          float cracks = exp(-vRift.y * 60.0) * step(0.5, vRift.z) * (1.0 - vSink);
          float glow = uCrack * (mainLine * 1.25 + cracks * 0.8) * flicker;
          totalEmissiveRadiance += vec3(1.0, 0.3, 0.05) * glow * 3.2 + vec3(1.0, 0.85, 0.5) * glow * glow * 1.4;
        }`,
      )
  }
  return { material, uniforms }
}

const VENTS: [number, number, number][] = [
  [0, 0, 1],
  [0.34, 0.18, 0.7],
  [-0.3, 0.26, 0.8],
  [0.12, -0.34, 0.6],
  [-0.36, -0.2, 0.55],
]

/** Бір айналымның кезеңдері (секунд): біртұтас → жарықтар → бөліну → бөлінген күйі → қайта бірігу. */
const T = { cracks: 3, drift: 6.5, apart: 17.5, rewind: 25, end: 28.5 }

/**
 * 3-слайд: Пангея суперматеригі, Панталасса мен Тетис, Сібір трапптарының атқылауы.
 * Анимация: біртұтас материкте лавалы тектоникалық жарықтар пайда болады, содан кейін ол баяу екіге —
 * Лавразия мен Гондванаға — бөлінеді; арасында жаңа теңіз ашылады. Біраздан соң бәрі қайта бірігіп, айналым қайталанады.
 */
export default function PangeaScene() {
  const quality = useStage((s) => s.quality)
  const relief = useMemo(buildRelief, [])
  const { material, uniforms } = useMemo(makeReliefMaterial, [])
  const light = useRef<THREE.PointLight>(null)
  const lava = useRef<THREE.MeshStandardMaterial>(null)
  const traps = useRef<THREE.Group>(null)
  const sparks = useRef<THREE.Group>(null)
  const riftLight = useRef<THREE.PointLight>(null)
  const [apart, setApart] = useState(REDUCED_MOTION)
  const age = useAge()

  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pulse = 0.7 + 0.3 * Math.sin(t * 2.1) + 0.12 * Math.sin(t * 6.3)
    if (light.current) light.current.intensity = 14 * pulse
    if (lava.current) lava.current.emissiveIntensity = 2.6 * pulse

    let split: number
    let crack: number
    if (REDUCED_MOTION) {
      // Қозғалыссыз нұсқа: бөлінудің орта сәті тұрақты көрсетіледі
      split = 0.45
      crack = 0.8
    } else {
      const a = age.current % T.end
      const back = ramp(a, T.rewind, T.end)
      split = ramp(a, T.drift, T.apart) * (1 - back)
      crack = ramp(a, T.cracks, T.drift) * (1 - ramp(a, T.apart + 3, T.rewind) * 0.55) * (1 - back)
      // Жер қыртысы жарылған сәттегі жеңіл дүмпу
      const jolt = a - T.cracks
      fx.shake = jolt > 0 && jolt < 2.2 ? 0.1 * Math.sin((jolt / 2.2) * Math.PI) : 0
    }
    uniforms.uSplit.value = split
    uniforms.uCrack.value = crack
    uniforms.uTime.value = t

    // Трапптар солтүстік тақтамен (Лавразиямен) бірге жылжиды
    if (traps.current) traps.current.position.set(TRAPS[0] - split * SLIDE, 0.14, TRAPS[1] - split * DRIFT)
    if (sparks.current) sparks.current.visible = crack > 0.25
    if (riftLight.current) riftLight.current.intensity = crack * 9 * pulse
    if (split > 0.6 !== apart && !REDUCED_MOTION) setApart(split > 0.6)
  })

  return (
    <>
      <SceneRig position={[0, 12, 12.6]} target={[0, -0.4, 0.3]} background="#03070a" autoRotate={0.2} azimuth={0.5} polar={[0.3, 1.25]} zoom={[0.7, 1.3]} />

      <hemisphereLight args={['#cfe9f0', '#0b1a14', 0.75]} />
      <Sun position={[6, 9, 5]} color="#fff0d8" intensity={2.6} extent={8} />
      <Stars radius={110} depth={50} count={Math.round(2200 * quality)} factor={4} saturation={0} fade speed={REDUCED_MOTION ? 0 : 0.5} />

      {/* Тақталар шейдерде жылжиды, сондықтан бедер өзі көлеңке түсірмейді (көлеңке ескі орнында қалып қояр еді) */}
      <mesh geometry={relief} material={material} receiveShadow />

      {/* Мұхит: үстіңгі беті y = 0 деңгейінде жатқан мөлдір көлем */}
      <mesh position={[0, -0.36, 0]}>
        <boxGeometry args={[SIZE, 0.72, SIZE]} />
        <meshStandardMaterial color="#0f6078" transparent opacity={0.62} roughness={0.12} metalness={0.15} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.8, 0]}>
        <boxGeometry args={[SIZE + 0.35, 0.14, SIZE + 0.35]} />
        <meshStandardMaterial color="#c79a45" roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.74, 0]}>
        <boxGeometry args={[SIZE + 0.02, 0.06, SIZE + 0.02]} />
        <meshStandardMaterial color="#04161c" roughness={0.8} />
      </mesh>

      {/* Негізгі жарық бойындағы ұшқындар мен лава жарығы */}
      <pointLight ref={riftLight} position={[-0.6, 0.6, -0.5]} color="#ff5a2a" intensity={0} distance={7} />
      <group ref={sparks} visible={false}>
        <Motes kind="spark" count={150} box={[6.4, 0.9, 0.9]} position={[-0.2, 0.55, -0.5]} color="#ff7a3a" color2="#ffd890" size={0.035} velocity={[0.04, 0.42, 0]} seed={4} />
      </group>

      {/* Сібір трапптары: лава жарықтары, шұғыла, ұшқындар */}
      <group ref={traps} position={[TRAPS[0], 0.14, TRAPS[1]]}>
        {VENTS.map(([x, z, s], i) => (
          <group key={i} position={[x, 0, z]} scale={s}>
            <mesh position={[0, 0.1, 0]}>
              <coneGeometry args={[0.2, 0.26, 7]} />
              <meshStandardMaterial color="#1c1310" roughness={1} flatShading />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <sphereGeometry args={[0.06, 8, 6]} />
              <meshStandardMaterial ref={i === 0 ? lava : undefined} color="#ff6a2a" emissive="#ff3a0c" emissiveIntensity={2.6} toneMapped={false} />
            </mesh>
          </group>
        ))}
        <pointLight ref={light} position={[0, 0.7, 0]} color="#ff4d2e" intensity={14} distance={6} />
        <Glow color="#ff4d2e" scale={2.6} opacity={0.8} position={[0, 0.25, 0]} />
        <Motes kind="spark" count={110} box={[1.3, 1.8, 1.3]} position={[0, 1.0, 0]} color="#ff9a4a" color2="#ffd9a0" size={0.04} velocity={[0.05, 0.4, 0]} wobble={0.08} seed={8} />
        <Label position={[0, 0.86, 0]} tone="lava">
          Сібір трапптары
        </Label>
      </group>

      {apart ? (
        <>
          <Label position={[0.4, 0.55, -2.3 - DRIFT]}>Лавразия</Label>
          <Label position={[0.3, 0.55, 1.9 + DRIFT]}>Гондвана</Label>
        </>
      ) : (
        <Label position={[-0.7, 0.55, 0.3]}>Пангея</Label>
      )}
      <Label position={[-4.1, 0.3, 4.0]} tone="jungle">
        Панталасса мұхиты
      </Label>
      <Label position={[3.7, 0.3, -0.55]} tone="jungle">
        Тетис
      </Label>
    </>
  )
}
