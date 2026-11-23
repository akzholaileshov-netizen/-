import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PERIODS } from '../data/slides'
import { Glow, Sun } from '../three/Atmos'
import { ammoniteGeo, merge, paint } from '../three/geo'
import { Label } from '../three/Kit'
import { fbm, mulberry32, noise3 } from '../three/noise'
import { Particles } from '../three/Particles'
import { SceneRig } from '../three/SceneRig'

const RADIUS = 2.15
/** 1 млн жыл = 0.02 сахна бірлігі: қабат қалыңдығы кезең ұзақтығына пропорционал. */
const UNIT = 0.02
const GAP = 0.16
const BASE_H = 0.34

/** Қабат жиегінің кедір-бұдырлығы; көрші қабаттар мен қазбалар бірдей функцияны қолданады. */
const rimRadius = (angle: number, y: number) =>
  RADIUS * (1 + (fbm(Math.cos(angle) * 1.4 + 5, y * 0.9, Math.sin(angle) * 1.4 - 2, 3) - 0.5) * 0.14)

function layerGeo(y0: number, height: number, color: string, seed: number) {
  const g = new THREE.CylinderGeometry(RADIUS, RADIUS, height, 44, Math.max(2, Math.round(height / 0.25)))
  g.translate(0, y0 + height / 2, 0)
  const pos = g.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const r = Math.hypot(x, z)
    if (r < 0.01) continue
    const k = rimRadius(Math.atan2(z, x), pos.getY(i)) / RADIUS
    pos.setX(i, x * k)
    pos.setZ(i, z * k)
  }
  const base = new THREE.Color(color)
  const rnd = mulberry32(seed)
  let shade = 0
  const flat = g.toNonIndexed()
  paint(flat, (p, c, i) => {
    if (i % 3 === 0) shade = (rnd() - 0.5) * 0.05
    // Көлденең жолақтар — шөгінді қабаттардың белгісі
    c.copy(base).offsetHSL(0, 0, Math.sin(p.y * 16 + seed) * 0.035 + (noise3(p.x * 2, p.y * 6, p.z * 2) - 0.5) * 0.08 + shade)
  })
  return merge([flat], true)
}

interface Layer {
  name: string
  label: string
  y0: number
  height: number
  geo: THREE.BufferGeometry
}

function buildColumn() {
  let y = 0
  const base = layerGeo(y, BASE_H, '#2b2622', 7)
  y += BASE_H + GAP
  const layers: Layer[] = PERIODS.map((p, i) => {
    const height = (p.from - p.to) * UNIT
    const layer: Layer = {
      name: p.name,
      label: `${p.name} · ≈${p.from - p.to} млн жыл`,
      y0: y,
      height,
      geo: layerGeo(y, height, ['#a44a2e', '#2f6a45', '#d6c08a'][i], 11 + i * 5),
    }
    y += height + GAP
    return layer
  })

  // Қабаттардың бүйіріне «жабысқан» аммониттер
  const rnd = mulberry32(77)
  const fossils = layers.flatMap((layer, li) =>
    Array.from({ length: 3 }, (_, k) => {
      const angle = (k / 3) * Math.PI * 2 + li * 0.9 + rnd() * 0.6
      const fy = layer.y0 + layer.height * (0.3 + rnd() * 0.4)
      const r = rimRadius(angle, fy) + 0.02
      return {
        position: [Math.cos(angle) * r, fy, Math.sin(angle) * r] as [number, number, number],
        rotation: [0, Math.PI / 2 - angle, rnd() * 6] as [number, number, number],
        scale: Math.min(0.2 + rnd() * 0.16, layer.height * 0.36),
      }
    }),
  )
  return { base, layers, fossils, top: y - GAP }
}

/** 2-слайд: мезозойдың «қабатты бағанасы» — триас, юра және бор шөгінділері. */
export default function StrataScene() {
  const column = useRef<THREE.Group>(null)
  const orbit = useRef<THREE.Group>(null)
  const { base, layers, fossils, top } = useMemo(buildColumn, [])
  const ammonite = useMemo(() => ammoniteGeo('#d6b97a', '#8a6a3c'), [])
  const mid = top / 2

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (column.current) column.current.position.y = Math.sin(t * 0.6) * 0.06
    if (orbit.current) {
      orbit.current.rotation.y -= dt * 0.16
      orbit.current.children.forEach((child, i) => {
        child.rotation.z += dt * (0.3 + i * 0.1)
        child.position.y = mid + Math.sin(t * 0.7 + i * 2.1) * 0.9
      })
    }
  })

  return (
    <>
      <SceneRig position={[7.4, mid + 2.2, 9]} target={[0, mid, 0]} background="#060a07" fog={0.018} autoRotate={0.35} polar={[0.7, 1.75]} />

      <hemisphereLight args={['#bfe8d0', '#1a0d08', 0.7]} />
      <Sun position={[5, 9, 6]} color="#fff0d6" intensity={2.8} extent={7} />
      <pointLight position={[0, -1.4, 0]} color="#ff4d2e" intensity={45} distance={9} />
      <Glow color="#ff4d2e" scale={9} opacity={0.5} position={[0, -1.3, 0]} />

      <group ref={column}>
        <mesh geometry={base} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.95} />
        </mesh>
        {layers.map((layer) => (
          <group key={layer.name}>
            <mesh geometry={layer.geo} castShadow receiveShadow>
              <meshStandardMaterial vertexColors roughness={0.92} />
            </mesh>
            <Label position={[0, layer.y0 + layer.height / 2, 0]}>{layer.label}</Label>
          </group>
        ))}
        {fossils.map((f, i) => (
          <mesh key={i} geometry={ammonite} position={f.position} rotation={f.rotation} scale={f.scale} castShadow>
            <meshStandardMaterial vertexColors roughness={0.55} metalness={0.15} />
          </mesh>
        ))}
        {/* Кезеңдер арасындағы шекараларды белгілейтін алтын сақиналар */}
        {layers.map((layer) => (
          <mesh key={layer.name} position={[0, layer.y0 - GAP / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[RADIUS * 1.12, 0.012, 6, 120]} />
            <meshBasicMaterial color="#e2c07a" transparent opacity={0.55} />
          </mesh>
        ))}
      </group>

      {/* Бағананы айнала қалқып жүрген аммониттер — мезозой теңіздерінің жетекші қазбалары */}
      <group ref={orbit}>
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2
          return (
            <mesh
              key={i}
              geometry={ammonite}
              position={[Math.cos(angle) * 4, mid, Math.sin(angle) * 4]}
              rotation={[0.4, -angle, i]}
              scale={0.42 + i * 0.08}
            >
              <meshStandardMaterial vertexColors roughness={0.5} metalness={0.2} />
            </mesh>
          )
        })}
      </group>

      <Particles count={380} box={[14, 9, 14]} position={[0, mid, 0]} color="#e9cf96" size={0.045} wobble={0.25} twinkle={0.8} velocity={[0, 0.06, 0]} seed={5} />
    </>
  )
}
