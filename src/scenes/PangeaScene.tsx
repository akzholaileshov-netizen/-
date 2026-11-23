import { Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStage } from '../store/stage'
import { Glow, Sun } from '../three/Atmos'
import { Label } from '../three/Kit'
import { noise3, smoothstep } from '../three/noise'
import { pangeaColor, pangeaField, pangeaMountains, type RGB } from '../three/pangea'
import { Particles } from '../three/Particles'
import { SceneRig } from '../three/SceneRig'

const SIZE = 11
const SEGMENTS = 170
/** Сібір трапптарының шартты орны: суперматериктің солтүстік-шығысы (x — шығыс, −z — солтүстік). */
const TRAPS: [number, number] = [2.3, -3.0]

/** Пангеяның бедерлі картасы: биіктік өрісінен жасалған тор + vertex color. */
function buildRelief() {
  const g = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
  g.rotateX(-Math.PI / 2)
  const pos = g.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
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
  }
  g.deleteAttribute('uv')
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

const VENTS: [number, number, number][] = [
  [0, 0, 1],
  [0.34, 0.18, 0.7],
  [-0.3, 0.26, 0.8],
  [0.12, -0.34, 0.6],
  [-0.36, -0.2, 0.55],
]

/** 3-слайд: Пангея суперматеригі, Панталасса мен Тетис, Сібір трапптарының атқылауы. */
export default function PangeaScene() {
  const quality = useStage((s) => s.quality)
  const relief = useMemo(buildRelief, [])
  const light = useRef<THREE.PointLight>(null)
  const lava = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pulse = 0.7 + 0.3 * Math.sin(t * 2.1) + 0.12 * Math.sin(t * 6.3)
    if (light.current) light.current.intensity = 14 * pulse
    if (lava.current) lava.current.emissiveIntensity = 2.6 * pulse
  })

  return (
    <>
      <SceneRig position={[0, 12, 12.6]} target={[0, -0.4, 0.3]} background="#03070a" autoRotate={0.2} azimuth={0.5} polar={[0.3, 1.25]} zoom={[0.7, 1.3]} />

      <hemisphereLight args={['#cfe9f0', '#0b1a14', 0.75]} />
      <Sun position={[6, 9, 5]} color="#fff0d8" intensity={2.6} extent={8} />
      <Stars radius={110} depth={50} count={Math.round(2200 * quality)} factor={4} saturation={0} fade speed={0.5} />

      <mesh geometry={relief} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.9} />
      </mesh>

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

      {/* Сібір трапптары: лава жарықтары, шұғыла, ұшқындар */}
      <group position={[TRAPS[0], 0.14, TRAPS[1]]}>
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
        <Particles count={110} box={[1.3, 1.8, 1.3]} position={[0, 1.0, 0]} color="#ff9a4a" size={0.045} velocity={[0.05, 0.35, 0]} wobble={0.08} seed={8} />
      </group>

      <Label position={[-0.7, 0.55, 0.3]}>Пангея</Label>
      <Label position={[-4.1, 0.3, 4.0]} tone="jungle">
        Панталасса мұхиты
      </Label>
      <Label position={[3.7, 0.3, -0.55]} tone="jungle">
        Тетис
      </Label>
      <Label position={[TRAPS[0], 1.0, TRAPS[1]]} tone="lava">
        Сібір трапптары
      </Label>
    </>
  )
}
