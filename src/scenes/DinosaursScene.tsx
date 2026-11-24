import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { REDUCED_MOTION } from '../fx'
import { useStage } from '../store/stage'
import { Glow, Sun } from '../three/Atmos'
import { Diplodocus, Human, TRex, Triceratops } from '../three/Dinosaurs'
import { merge, paint, type V3 } from '../three/geo'
import { Label, Labels } from '../three/Kit'
import { Motes } from '../three/Motes'
import { fbm, mulberry32 } from '../three/noise'
import { SceneRig } from '../three/SceneRig'

const PLATFORM = 5.7
const CAMERA: V3 = [7.3, 2.9, 9.1]

/**
 * Модельдің масштабы және 1,8 м адамның сол масштабтағы биіктігі.
 * Мысалы: тираннозавр моделі 6.8 бірлік ≈ 12 м → 1 бірлік ≈ 1.76 м.
 */
const SHOWCASE = [
  { scale: 0.78, offset: 0.2, human: (1.8 / (12 / 6.8)) * 0.78 },
  { scale: 0.56, offset: 0.45, human: (1.8 / (25 / 12.8)) * 0.56 },
  { scale: 0.92, offset: 0.17, human: (1.8 / (8.5 / 6.04)) * 0.92 },
]

/* ---------- Карусель ---------- */

/** Камераның бастапқы бағыты: карусельдің «алдыңғы» орны осы жаққа қарайды. */
const FRONT = Math.atan2(CAMERA[0], CAMERA[2])
const STEP = (Math.PI * 2) / SHOWCASE.length
/** Карусель шеңберінің радиусы және оның орталығының алаң ортасынан артқа шегінуі. */
const RING = 3.2
const BACK = 2.3
/** Кезегін күтіп тұрған (таңдалмаған) динозаврдың кішірейтілген масштабы. */
const SMALL = 0.33

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

interface SlotProps {
  index: number
  active: boolean
  /** Карусельдің ағымдағы бұрылу бұрышы. */
  turn: RefObject<number>
  children: ReactNode
}

/**
 * Карусельдегі бір орын. Таңдалмаған динозавр кішірейіп, артқы шеңберде тұрады; таңдалғаны шеңберден
 * алға — алаңның ортасына — секіре шығып, толық өлшеміне дейін үлкейеді де, баяу айнала бастайды.
 */
function Slot({ index, active, turn, children }: SlotProps) {
  const group = useRef<THREE.Group>(null)
  const k = useRef(active ? 1 : 0)
  const spin = useRef(0)

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    k.current = THREE.MathUtils.damp(k.current, active ? 1 : 0, active ? 3.2 : 5, dt)
    const e = k.current * k.current * (3 - 2 * k.current)

    const a = FRONT + index * STEP + turn.current
    const x = -Math.sin(FRONT) * BACK + Math.sin(a) * RING
    const z = -Math.cos(FRONT) * BACK + Math.cos(a) * RING
    g.position.set(x * (1 - e), Math.sin(k.current * Math.PI) * 0.35, z * (1 - e))
    g.scale.setScalar(THREE.MathUtils.lerp(SMALL, 1, e))

    // Сахна ортасында баяу айналады; орнына қайтқанда ең қысқа жолмен бастапқы бағытына бұрылады
    if (active) spin.current += dt * (REDUCED_MOTION ? 0.06 : 0.3) * e
    else spin.current = wrap(spin.current) * Math.exp(-4 * dt)
    // Шеңберде жанама бойымен (карусель бағытына) қарап тұрады
    g.rotation.y = wrap(a) * (1 - e) + spin.current
  })

  return (
    <group ref={group}>
      <Labels shown={active}>{children}</Labels>
    </group>
  )
}

function platformGeo() {
  const g = new THREE.CylinderGeometry(PLATFORM, PLATFORM * 1.08, 0.9, 56, 2)
  g.translate(0, -0.45, 0)
  const pos = g.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    if (Math.hypot(x, z) < 0.01 || y > -0.01) continue
    const k = 1 + (fbm(x * 0.6, y * 2, z * 0.6, 3) - 0.5) * 0.16
    pos.setXYZ(i, x * k, y, z * k)
  }
  const base = new THREE.Color('#241c17')
  const rnd = mulberry32(5)
  let shade = 0
  const flat = g.toNonIndexed()
  paint(flat, (_p, c, i) => {
    if (i % 3 === 0) shade = (rnd() - 0.5) * 0.05
    c.copy(base).offsetHSL(0, 0, shade)
  })
  return merge([flat], true)
}

/** Масштабты көрсететін адам сұлбасы мен жазуы. */
function ScaleHuman({ height }: { height: number }) {
  return (
    <group position={[1.1, 0, 2.5]}>
      <Human height={height} rotation={[0, -0.5, 0]} />
      <Label position={[0, height + 0.32, 0]}>Адам · 1,8 м</Label>
    </group>
  )
}

/**
 * 7-слайд: үш динозаврдың карусельі. Панельдегі тезисті таңдағанда карусель бұрылып, таңдалған динозавр
 * алға шығады да баяу айналады; кеудесі тыныс алады, көзі жарқырап, жыпылықтайды (Dinosaurs.tsx).
 */
export default function DinosaursScene() {
  const focus = useStage((s) => s.focus)
  const platform = useMemo(platformGeo, [])
  const [trex, diplo, trike] = SHOWCASE
  const turn = useRef(-focus * STEP)
  const disc = useRef<THREE.Mesh>(null)
  const beam = useRef<THREE.Sprite>(null)

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    // Карусель таңдалған орын алға келетіндей ең қысқа жолмен бұрылады
    turn.current += wrap(-focus * STEP - turn.current) * (1 - Math.exp(-2.6 * dt))
    if (disc.current) disc.current.rotation.z -= dt * 0.3
    if (beam.current) beam.current.material.opacity = 0.2 + 0.05 * Math.sin(clock.elapsedTime * 1.5)
  })

  return (
    <>
      <SceneRig position={CAMERA} target={[0, 1.55, 0]} background="#070504" fog={0.02} autoRotate={0.3} azimuth={0.55} polar={[0.8, 1.55]} />

      <hemisphereLight args={['#8fd8b0', '#1a0d08', 0.5]} />
      <Sun position={[5, 11, 6]} color="#fff0d8" intensity={2.7} extent={9} />
      <directionalLight position={[-6, 4, -7]} color="#ff5a2e" intensity={2.0} />
      {/* Таңдалған динозаврға түскен сахна жарығы */}
      <spotLight position={[1.5, 10, 2]} angle={0.42} penumbra={0.9} intensity={160} distance={22} color="#fff2d8" />
      <Glow ref={beam} color="#ffe2b0" scale={[9, 13]} opacity={0.2} position={[0, 5.2, 0]} />

      <mesh geometry={platform} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      {[PLATFORM * 0.93, PLATFORM * 0.66].map((r, i) => (
        <mesh key={r} position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, i === 0 ? 0.022 : 0.01, 6, 160]} />
          <meshStandardMaterial color="#e2c07a" emissive="#c79a45" emissiveIntensity={i === 0 ? 1.4 : 0.7} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      {/* Орталық айналмалы табан: үзік-үзік жарық сақина */}
      <mesh ref={disc} position={[0, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.55, 2.62, 96, 1, 0, Math.PI * 1.7]} />
        <meshBasicMaterial color="#ffd98a" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      {/* Алаңның астындағы лава шұғыласы */}
      <Glow color="#ff4d2e" scale={[30, 12]} opacity={0.42} position={[0, -4.4, 0]} />
      <pointLight position={[0, -3, 0]} color="#ff4d2e" intensity={50} distance={14} />

      <Slot index={0} active={focus === 0} turn={turn}>
        <TRex position={[trex.offset, 0, 0]} scale={trex.scale} />
        <ScaleHuman height={trex.human} />
      </Slot>
      <Slot index={1} active={focus === 1} turn={turn}>
        <Diplodocus position={[diplo.offset, 0, 0]} scale={diplo.scale} />
        <ScaleHuman height={diplo.human} />
      </Slot>
      <Slot index={2} active={focus === 2} turn={turn}>
        <Triceratops position={[trike.offset, 0, 0]} scale={trike.scale} />
        <ScaleHuman height={trike.human} />
      </Slot>

      <Motes kind="spark" count={220} box={[18, 9, 18]} position={[0, 3.2, 0]} color="#ff8a4a" color2="#ffd08a" size={0.045} velocity={[0.02, 0.5, 0]} wobble={0.3} twinkle={0.7} seed={17} />
      <Motes count={160} box={[9, 7, 9]} position={[0, 3.6, 0]} color="#ffe6b8" size={0.04} velocity={[0, 0.05, 0]} wobble={0.25} twinkle={0.9} opacity={0.6} seed={18} />
    </>
  )
}
