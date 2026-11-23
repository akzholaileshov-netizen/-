import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { merge, place, tube, type TubeSpec, type V3 } from './geo'

/**
 * Динозаврлардың процедуралық модельдері.
 * Барлығы +X бағытына қарайды, табаны y = 0 деңгейінде.
 * Дене бөліктері — омыртқа қисығы бойымен созылған «түтіктер» (geo.ts → tube),
 * құйрық пен мойын жеке топтарда, сондықтан оларды бөлек қозғалтуға болады.
 */

type GroupProps = ThreeElements['group']

interface Skin {
  color: string
  belly: string
  stripe?: string
}

interface Limb {
  points: V3[]
  radii: number[]
}

const mirror = (pts: V3[]): V3[] => pts.map(([x, y, z]) => [x, y, -z])
const rel = (pts: V3[], o: V3): V3[] => pts.map(([x, y, z]) => [x - o[0], y - o[1], z - o[2]])
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

/** Оң және сол жақтағы симметриялы қос бөлік. */
const pair = (limb: Limb, extra: Partial<TubeSpec>) => [
  tube({ ...extra, points: limb.points, radii: limb.radii }),
  tube({ ...extra, points: mirror(limb.points), radii: limb.radii }),
]

function Skinned({ geo, roughness = 0.82 }: { geo: THREE.BufferGeometry; roughness?: number }) {
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={roughness} metalness={0.03} />
    </mesh>
  )
}

function Eyes({ p, r, color = '#ffb347' }: { p: V3; r: number; color?: string }) {
  return (
    <>
      {[1, -1].map((side) => (
        <mesh key={side} position={[p[0], p[1], p[2] * side]}>
          <sphereGeometry args={[r, 10, 8]} />
          <meshStandardMaterial color="#120a04" emissive={color} emissiveIntensity={0.9} roughness={0.25} />
        </mesh>
      ))}
    </>
  )
}

/* ================================================================== */
/*  Тероподтар: тираннозавр және эораптор                              */
/* ================================================================== */

interface TheropodSpec {
  skin: Skin
  torso: Limb & { sx: number }
  tail: Limb & { pivot: V3 }
  neck: Limb & { pivot: V3 }
  skull: Limb & { sx: number }
  jaw: Limb & { pivot: V3; sx: number; sy: number }
  leg: Limb
  arm: Limb
  eye: { p: V3; r: number }
  teeth?: { from: V3; to: V3; count: number; size: number }
  /** Ауыздың ашылу амплитудасы (радиан). */
  roar: number
}

const TREX: TheropodSpec = {
  skin: { color: '#5b6638', belly: '#cdb884', stripe: '#2b331c' },
  torso: {
    points: [
      [-1.0, 1.8, 0],
      [-0.4, 1.85, 0],
      [0.25, 1.9, 0],
      [0.85, 2.0, 0],
      [1.3, 2.15, 0],
      [1.55, 2.32, 0],
    ],
    radii: [0.4, 0.6, 0.67, 0.6, 0.47, 0.36],
    sx: 0.82,
  },
  tail: {
    pivot: [-0.5, 1.83, 0],
    points: [
      [-0.2, 1.84, 0],
      [-0.9, 1.82, 0],
      [-1.7, 1.78, 0],
      [-2.5, 1.74, 0],
      [-3.2, 1.72, 0],
      [-3.65, 1.72, 0],
    ],
    radii: [0.5, 0.46, 0.32, 0.18, 0.07, 0.012],
  },
  neck: {
    pivot: [1.25, 2.15, 0],
    points: [
      [1.15, 2.1, 0],
      [1.5, 2.4, 0],
      [1.75, 2.68, 0],
      [1.92, 2.8, 0],
    ],
    radii: [0.44, 0.39, 0.34, 0.32],
  },
  skull: {
    points: [
      [1.6, 2.8, 0],
      [1.78, 2.86, 0],
      [2.05, 2.92, 0],
      [2.45, 2.88, 0],
      [2.82, 2.78, 0],
      [3.06, 2.7, 0],
      [3.16, 2.66, 0],
    ],
    radii: [0.1, 0.3, 0.37, 0.33, 0.26, 0.19, 0.06],
    sx: 0.74,
  },
  jaw: {
    pivot: [1.85, 2.6, 0],
    points: [
      [1.8, 2.56, 0],
      [2.3, 2.44, 0],
      [2.8, 2.4, 0],
      [3.0, 2.4, 0],
      [3.07, 2.41, 0],
    ],
    radii: [0.11, 0.14, 0.11, 0.07, 0.02],
    sx: 1.45,
    sy: 0.8,
  },
  leg: {
    points: [
      [0.0, 1.75, 0.42],
      [0.35, 1.25, 0.47],
      [0.6, 0.9, 0.5],
      [0.25, 0.5, 0.5],
      [0.1, 0.2, 0.5],
      [0.38, 0.09, 0.5],
      [0.74, 0.06, 0.5],
    ],
    radii: [0.36, 0.31, 0.2, 0.13, 0.11, 0.11, 0.045],
  },
  arm: {
    points: [
      [1.22, 1.95, 0.36],
      [1.38, 1.7, 0.42],
      [1.58, 1.62, 0.42],
      [1.68, 1.66, 0.42],
    ],
    radii: [0.09, 0.07, 0.05, 0.02],
  },
  eye: { p: [2.14, 3.08, 0.2], r: 0.05 },
  teeth: { from: [2.3, 2.6, 0.2], to: [3.04, 2.56, 0.1], count: 8, size: 0.12 },
  roar: 0.42,
}

const EORAPTOR: TheropodSpec = {
  skin: { color: '#8a5a34', belly: '#e3c99a', stripe: '#4a2c18' },
  torso: {
    points: [
      [-0.6, 1.2, 0],
      [-0.2, 1.22, 0],
      [0.3, 1.25, 0],
      [0.75, 1.32, 0],
      [1.05, 1.45, 0],
    ],
    radii: [0.2, 0.3, 0.32, 0.27, 0.2],
    sx: 0.8,
  },
  tail: {
    pivot: [-0.35, 1.22, 0],
    points: [
      [-0.2, 1.22, 0],
      [-0.8, 1.2, 0],
      [-1.6, 1.15, 0],
      [-2.4, 1.12, 0],
      [-3.0, 1.12, 0],
    ],
    radii: [0.26, 0.2, 0.12, 0.06, 0.012],
  },
  neck: {
    pivot: [0.95, 1.4, 0],
    points: [
      [0.9, 1.38, 0],
      [1.2, 1.65, 0],
      [1.4, 1.92, 0],
      [1.5, 2.02, 0],
    ],
    radii: [0.2, 0.14, 0.12, 0.115],
  },
  skull: {
    points: [
      [1.36, 2.0, 0],
      [1.52, 2.07, 0],
      [1.8, 2.05, 0],
      [2.05, 2.0, 0],
      [2.16, 1.98, 0],
    ],
    radii: [0.05, 0.14, 0.12, 0.08, 0.02],
    sx: 0.76,
  },
  jaw: {
    pivot: [1.5, 1.97, 0],
    points: [
      [1.48, 1.96, 0],
      [1.8, 1.92, 0],
      [2.05, 1.91, 0],
      [2.12, 1.92, 0],
    ],
    radii: [0.045, 0.055, 0.04, 0.012],
    sx: 1.3,
    sy: 0.8,
  },
  leg: {
    points: [
      [0.0, 1.15, 0.2],
      [0.2, 0.82, 0.24],
      [0.38, 0.6, 0.26],
      [0.15, 0.34, 0.26],
      [0.05, 0.13, 0.26],
      [0.22, 0.06, 0.26],
      [0.44, 0.035, 0.26],
    ],
    radii: [0.2, 0.15, 0.09, 0.06, 0.05, 0.05, 0.02],
  },
  arm: {
    points: [
      [0.85, 1.25, 0.18],
      [0.98, 1.0, 0.24],
      [1.15, 0.9, 0.24],
      [1.25, 0.88, 0.24],
    ],
    radii: [0.05, 0.04, 0.03, 0.012],
  },
  eye: { p: [1.62, 2.13, 0.085], r: 0.026 },
  roar: 0.2,
}

function buildTheropod(s: TheropodSpec) {
  const { color, belly, stripe } = s.skin
  const plain = { color, belly }
  let teeth: THREE.BufferGeometry | null = null
  if (s.teeth) {
    const { from, to, count, size } = s.teeth
    const cones: THREE.BufferGeometry[] = []
    for (let i = 0; i < count; i++) {
      const k = i / (count - 1)
      for (const side of [1, -1]) {
        const cone = new THREE.ConeGeometry(size * 0.28, size * (0.8 + (i % 2) * 0.35), 5)
        cones.push(
          place(cone, {
            p: sub(
              [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k - size * 0.4, (from[2] + (to[2] - from[2]) * k) * side],
              s.neck.pivot,
            ),
            r: [Math.PI, 0, 0],
          }),
        )
      }
    }
    teeth = merge(cones)
  }
  return {
    torso: tube({ ...s.torso, color, belly, stripe, stripes: 5, radial: 16 }),
    tail: tube({ points: rel(s.tail.points, s.tail.pivot), radii: s.tail.radii, sx: s.torso.sx, color, belly, stripe, stripes: 8, radial: 14 }),
    neck: tube({ points: rel(s.neck.points, s.neck.pivot), radii: s.neck.radii, sx: 0.88, ...plain }),
    skull: tube({ points: rel(s.skull.points, s.neck.pivot), radii: s.skull.radii, sx: s.skull.sx, ...plain, radial: 14 }),
    jaw: tube({ points: rel(s.jaw.points, s.jaw.pivot), radii: s.jaw.radii, sx: s.jaw.sx, sy: s.jaw.sy, color: belly, belly }),
    legs: pair(s.leg, { ...plain, sx: 0.9 }),
    arms: pair(s.arm, { color, radial: 8 }),
    teeth,
  }
}

function Theropod({ spec, ...props }: GroupProps & { spec: TheropodSpec }) {
  const body = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const jaw = useRef<THREE.Group>(null)
  const g = useMemo(() => buildTheropod(spec), [spec])
  const phase = useMemo(() => Math.random() * 10, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    if (body.current) {
      body.current.position.y = Math.sin(t * 1.3) * 0.015
      body.current.rotation.z = Math.sin(t * 0.65) * 0.012
    }
    if (tail.current) {
      tail.current.rotation.y = Math.sin(t * 0.8) * 0.16
      tail.current.rotation.z = Math.sin(t * 0.55) * 0.03
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.37) * 0.2
      head.current.rotation.z = Math.sin(t * 0.5) * 0.05
    }
    if (jaw.current) {
      // Анда-санда ақырады
      jaw.current.rotation.z = -spec.roar * Math.pow(Math.max(0, Math.sin(t * 0.7)), 5) - 0.03
    }
  })

  return (
    <group {...props}>
      <group ref={body}>
        <Skinned geo={g.torso} />
        <group ref={tail} position={spec.tail.pivot}>
          <Skinned geo={g.tail} />
        </group>
        <group ref={head} position={spec.neck.pivot}>
          <Skinned geo={g.neck} />
          <Skinned geo={g.skull} />
          <group ref={jaw} position={sub(spec.jaw.pivot, spec.neck.pivot)}>
            <Skinned geo={g.jaw} />
          </group>
          {g.teeth && (
            <mesh geometry={g.teeth}>
              <meshStandardMaterial color="#f1e8d0" roughness={0.4} />
            </mesh>
          )}
          <Eyes p={sub(spec.eye.p, spec.neck.pivot)} r={spec.eye.r} />
        </group>
        {g.arms.map((geo, i) => (
          <Skinned key={i} geo={geo} />
        ))}
      </group>
      {g.legs.map((geo, i) => (
        <Skinned key={i} geo={geo} />
      ))}
    </group>
  )
}

/** Тираннозавр: модель ұзындығы ≈ 6.8 бірлік (нақты ұзындығы ~12 м). */
export function TRex(props: GroupProps) {
  return <Theropod spec={TREX} {...props} />
}

/** Эораптор: ерте триастық шағын динозавр (нақты ұзындығы ~1 м). */
export function Eoraptor(props: GroupProps) {
  return <Theropod spec={EORAPTOR} {...props} />
}

/* ================================================================== */
/*  Диплодок                                                           */
/* ================================================================== */

const DIPLO_SKIN = { color: '#6f7458', belly: '#cfc49c', stripe: '#474b38' }
const DIPLO_TAIL_PIVOT: V3 = [-1.2, 2.15, 0]
const DIPLO_NECK_PIVOT: V3 = [1.3, 2.15, 0]

function buildDiplodocus() {
  const { color, belly, stripe } = DIPLO_SKIN
  const hind = (x: number): Limb => ({
    points: [
      [x, 2.0, 0.5],
      [x + 0.08, 1.2, 0.52],
      [x - 0.02, 0.5, 0.52],
      [x, 0.1, 0.52],
      [x + 0.02, 0.0, 0.52],
    ],
    radii: [0.42, 0.3, 0.22, 0.25, 0.23],
  })
  const front = (x: number): Limb => ({
    points: [
      [x, 1.95, 0.45],
      [x + 0.05, 1.1, 0.47],
      [x, 0.45, 0.47],
      [x, 0.1, 0.47],
      [x + 0.02, 0.0, 0.47],
    ],
    radii: [0.34, 0.24, 0.19, 0.22, 0.2],
  })
  return {
    torso: tube({
      points: [
        [-1.6, 2.05, 0],
        [-0.9, 2.2, 0],
        [0.1, 2.25, 0],
        [1.0, 2.15, 0],
        [1.6, 2.15, 0],
      ],
      radii: [0.5, 0.74, 0.82, 0.7, 0.5],
      sx: 0.9,
      radial: 18,
      color,
      belly,
      stripe,
      stripes: 4,
    }),
    tail: tube({
      points: rel(
        [
          [-1.0, 2.15, 0],
          [-1.9, 2.0, 0],
          [-3.0, 1.75, 0],
          [-4.2, 1.5, 0],
          [-5.4, 1.3, 0],
          [-6.4, 1.2, 0],
          [-7.2, 1.18, 0],
        ],
        DIPLO_TAIL_PIVOT,
      ),
      radii: [0.6, 0.45, 0.28, 0.16, 0.08, 0.04, 0.012],
      sx: 0.85,
      radial: 14,
      color,
      belly,
      stripe,
      stripes: 12,
    }),
    neck: tube({
      points: rel(
        [
          [1.2, 2.12, 0],
          [2.0, 2.4, 0],
          [3.0, 2.85, 0],
          [4.0, 3.3, 0],
          [4.7, 3.55, 0],
          [5.02, 3.62, 0],
          [5.32, 3.54, 0],
          [5.52, 3.43, 0],
          [5.6, 3.38, 0],
        ],
        DIPLO_NECK_PIVOT,
      ),
      radii: [0.55, 0.37, 0.26, 0.2, 0.17, 0.19, 0.16, 0.1, 0.03],
      sx: 0.9,
      radial: 14,
      segments: 64,
      color,
      belly,
      stripe,
      stripes: 10,
    }),
    legs: [...pair(hind(-0.95), { color, belly }), ...pair(front(1.05), { color, belly })],
  }
}

/** Диплодок: модель ұзындығы ≈ 12.8 бірлік (нақты ұзындығы ~25 м). */
export function Diplodocus(props: GroupProps) {
  const body = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const neck = useRef<THREE.Group>(null)
  const g = useMemo(buildDiplodocus, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (body.current) body.current.position.y = Math.sin(t * 0.9) * 0.02
    if (tail.current) {
      tail.current.rotation.y = Math.sin(t * 0.5) * 0.22
      tail.current.rotation.z = Math.sin(t * 0.37) * 0.04
    }
    if (neck.current) {
      neck.current.rotation.y = Math.sin(t * 0.28) * 0.24
      neck.current.rotation.z = Math.sin(t * 0.4) * 0.07 + 0.04
    }
  })

  return (
    <group {...props}>
      <group ref={body}>
        <Skinned geo={g.torso} />
        <group ref={tail} position={DIPLO_TAIL_PIVOT}>
          <Skinned geo={g.tail} />
        </group>
        <group ref={neck} position={DIPLO_NECK_PIVOT}>
          <Skinned geo={g.neck} />
          <Eyes p={sub([5.14, 3.7, 0.135], DIPLO_NECK_PIVOT)} r={0.04} color="#ffd27a" />
        </group>
      </group>
      {g.legs.map((geo, i) => (
        <Skinned key={i} geo={geo} />
      ))}
    </group>
  )
}

/* ================================================================== */
/*  Трицератопс                                                        */
/* ================================================================== */

const TRIKE_SKIN = { color: '#7a5d3e', belly: '#d8c08e', stripe: '#4d3823' }
const TRIKE_TAIL_PIVOT: V3 = [-1.0, 1.5, 0]
const TRIKE_HEAD_PIVOT: V3 = [1.2, 1.45, 0]

function buildTriceratops() {
  const { color, belly, stripe } = TRIKE_SKIN
  const leg = (x: number, top: number, r: number): Limb => ({
    points: [
      [x, top, 0.5],
      [x + 0.05, top * 0.58, 0.54],
      [x, 0.3, 0.54],
      [x, 0.08, 0.54],
      [x + 0.03, 0.0, 0.54],
    ],
    radii: [r, r * 0.72, r * 0.54, r * 0.6, r * 0.54],
  })
  const horn = (z: number) =>
    tube({
      points: rel(
        [
          [1.74, 1.72, z],
          [2.12, 2.04, z * 1.25],
          [2.6, 2.24, z * 1.4],
        ],
        TRIKE_HEAD_PIVOT,
      ),
      radii: [0.105, 0.07, 0.01],
      radial: 9,
      color: '#efe4c8',
      belly: '#bda57a',
    })
  return {
    torso: tube({
      points: [
        [-1.3, 1.45, 0],
        [-0.7, 1.6, 0],
        [0.1, 1.62, 0],
        [0.8, 1.5, 0],
        [1.3, 1.42, 0],
      ],
      radii: [0.45, 0.7, 0.8, 0.68, 0.5],
      sx: 0.95,
      radial: 18,
      color,
      belly,
      stripe,
      stripes: 4,
    }),
    tail: tube({
      points: rel(
        [
          [-0.9, 1.5, 0],
          [-1.6, 1.3, 0],
          [-2.3, 1.05, 0],
          [-2.9, 0.9, 0],
          [-3.2, 0.86, 0],
        ],
        TRIKE_TAIL_PIVOT,
      ),
      radii: [0.55, 0.36, 0.18, 0.07, 0.012],
      sx: 0.85,
      color,
      belly,
      stripe,
      stripes: 6,
    }),
    head: tube({
      points: rel(
        [
          [1.1, 1.45, 0],
          [1.6, 1.42, 0],
          [2.1, 1.25, 0],
          [2.5, 1.05, 0],
          [2.75, 0.9, 0],
          [2.84, 0.8, 0],
        ],
        TRIKE_HEAD_PIVOT,
      ),
      radii: [0.5, 0.45, 0.34, 0.22, 0.12, 0.02],
      sx: 0.85,
      radial: 16,
      color,
      belly,
    }),
    horns: [horn(0.24), horn(-0.24)],
    noseHorn: tube({
      points: rel(
        [
          [2.38, 1.3, 0],
          [2.5, 1.5, 0],
          [2.57, 1.66, 0],
        ],
        TRIKE_HEAD_PIVOT,
      ),
      radii: [0.085, 0.05, 0.008],
      radial: 9,
      color: '#efe4c8',
    }),
    legs: [...pair(leg(-0.85, 1.4, 0.42), { color, belly }), ...pair(leg(0.8, 1.3, 0.36), { color, belly })],
  }
}

/** Трицератопс: модель ұзындығы ≈ 6 бірлік (нақты ұзындығы ~8–9 м). */
export function Triceratops(props: GroupProps) {
  const body = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const g = useMemo(buildTriceratops, [])
  const frillAt = sub([1.32, 1.98, 0], TRIKE_HEAD_PIVOT)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (body.current) body.current.position.y = Math.sin(t * 1.1) * 0.015
    if (tail.current) tail.current.rotation.y = Math.sin(t * 0.9) * 0.2
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.4) * 0.16
      head.current.rotation.z = Math.sin(t * 0.55) * 0.07 - 0.03
    }
  })

  return (
    <group {...props}>
      <group ref={body}>
        <Skinned geo={g.torso} />
        <group ref={tail} position={TRIKE_TAIL_PIVOT}>
          <Skinned geo={g.tail} />
        </group>
        <group ref={head} position={TRIKE_HEAD_PIVOT}>
          <Skinned geo={g.head} />
          {/* Сүйекті «жаға» */}
          <group position={frillAt} rotation={[0, 0, 0.5]}>
            <mesh scale={[0.13, 0.92, 1.05]} castShadow>
              <sphereGeometry args={[1, 24, 16]} />
              <meshStandardMaterial color={TRIKE_SKIN.color} roughness={0.8} />
            </mesh>
            <mesh position={[0.07, 0.08, 0]} scale={[0.1, 0.6, 0.72]}>
              <sphereGeometry args={[1, 20, 12]} />
              <meshStandardMaterial color="#b0482e" roughness={0.75} />
            </mesh>
          </group>
          {g.horns.map((geo, i) => (
            <Skinned key={i} geo={geo} roughness={0.5} />
          ))}
          <Skinned geo={g.noseHorn} roughness={0.5} />
          <Eyes p={sub([1.92, 1.56, 0.355], TRIKE_HEAD_PIVOT)} r={0.045} />
        </group>
      </group>
      {g.legs.map((geo, i) => (
        <Skinned key={i} geo={geo} />
      ))}
    </group>
  )
}

/* ================================================================== */
/*  Масштаб үшін адам сұлбасы (биіктігі 1,8 м)                         */
/* ================================================================== */

export function Human({ height = 1, ...props }: GroupProps & { height?: number }) {
  const s = height / 1.8
  return (
    <group {...props}>
      <group scale={s}>
        {[0.1, -0.1].map((z) => (
          <mesh key={z} position={[0, 0.46, z]} castShadow>
            <capsuleGeometry args={[0.08, 0.74, 4, 8]} />
            <meshStandardMaterial color="#e9cf96" emissive="#c79a45" emissiveIntensity={0.7} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 1.2, 0]} castShadow>
          <capsuleGeometry args={[0.17, 0.4, 4, 10]} />
          <meshStandardMaterial color="#e9cf96" emissive="#c79a45" emissiveIntensity={0.7} roughness={0.5} />
        </mesh>
        {[0.25, -0.25].map((z) => (
          <mesh key={z} position={[0, 1.12, z]} rotation={[z > 0 ? -0.12 : 0.12, 0, 0]}>
            <capsuleGeometry args={[0.055, 0.52, 4, 8]} />
            <meshStandardMaterial color="#e9cf96" emissive="#c79a45" emissiveIntensity={0.7} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 1.675, 0]} castShadow>
          <sphereGeometry args={[0.125, 14, 10]} />
          <meshStandardMaterial color="#e9cf96" emissive="#c79a45" emissiveIntensity={0.7} roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}
