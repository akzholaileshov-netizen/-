import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { tube, type V3 } from './geo'

/**
 * Теңіз жорғалаушылары мен ұшатын жануарлардың процедуралық модельдері.
 * Барлығы +X бағытына қарайды; центрі шамамен дененің ортасында.
 */

type GroupProps = ThreeElements['group']

const mirror = (pts: V3[]): V3[] => pts.map(([x, y, z]) => [x, y, -z])

function Skinned({ geo, roughness = 0.55 }: { geo: THREE.BufferGeometry; roughness?: number }) {
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial vertexColors roughness={roughness} metalness={0.05} />
    </mesh>
  )
}

function Eye({ p, r }: { p: V3; r: number }) {
  return (
    <>
      {[1, -1].map((side) => (
        <mesh key={side} position={[p[0], p[1], p[2] * side]}>
          <sphereGeometry args={[r, 10, 8]} />
          <meshStandardMaterial color="#0a0a0a" emissive="#ffe2a0" emissiveIntensity={0.35} roughness={0.15} />
        </mesh>
      ))}
    </>
  )
}

/* ================================================================== */
/*  Ихтиозавр                                                          */
/* ================================================================== */

const ICHTHYO = { color: '#2f4a5c', belly: '#d5e0dc', stripe: '#1c2f3c' }

function buildIchthyosaur() {
  const { color, belly, stripe } = ICHTHYO
  const flipper = (x: number, len: number): V3[] => [
    [x, -0.2, 0.3],
    [x - len * 0.45, -0.42, 0.3 + len * 0.55],
    [x - len, -0.62, 0.3 + len],
  ]
  return {
    body: tube({
      points: [
        [-1.75, 0, 0],
        [-1.2, 0.02, 0],
        [-0.3, 0.05, 0],
        [0.5, 0.05, 0],
        [1.1, 0.02, 0],
        [1.5, 0, 0],
        [2.1, -0.02, 0],
        [2.6, -0.03, 0],
        [2.76, -0.03, 0],
      ],
      radii: [0.1, 0.28, 0.48, 0.46, 0.31, 0.17, 0.075, 0.04, 0.01],
      sx: 0.76,
      radial: 16,
      segments: 60,
      color,
      belly,
      stripe,
      stripes: 6,
    }),
    // Тік орналасқан жарты ай тәрізді құйрық қанаты (пивотқа қатысты)
    tail: [
      tube({
        points: [
          [0.15, 0, 0],
          [-0.3, 0.35, 0],
          [-0.6, 0.78, 0],
        ],
        radii: [0.11, 0.09, 0.012],
        sx: 0.28,
        color,
      }),
      tube({
        points: [
          [0.15, 0, 0],
          [-0.38, -0.42, 0],
          [-0.78, -0.9, 0],
        ],
        radii: [0.11, 0.1, 0.012],
        sx: 0.28,
        color,
      }),
    ],
    dorsal: tube({
      points: [
        [0.05, 0.4, 0],
        [-0.18, 0.74, 0],
        [-0.42, 0.98, 0],
      ],
      radii: [0.17, 0.1, 0.01],
      sx: 0.22,
      color,
    }),
    flippers: [
      tube({ points: flipper(0.8, 0.62), radii: [0.1, 0.14, 0.02], sy: 0.28, color }),
      tube({ points: mirror(flipper(0.8, 0.62)), radii: [0.1, 0.14, 0.02], sy: 0.28, color }),
      tube({ points: flipper(-0.75, 0.36), radii: [0.07, 0.09, 0.015], sy: 0.28, color }),
      tube({ points: mirror(flipper(-0.75, 0.36)), radii: [0.07, 0.09, 0.015], sy: 0.28, color }),
    ],
  }
}

export function Ichthyosaur(props: GroupProps) {
  const body = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const g = useMemo(buildIchthyosaur, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (body.current) body.current.rotation.y = Math.sin(t * 3.2) * 0.06
    if (tail.current) tail.current.rotation.y = Math.sin(t * 3.2 - 1.1) * 0.5
  })

  return (
    <group {...props}>
      <group ref={body}>
        <Skinned geo={g.body} />
        <Skinned geo={g.dorsal} />
        {g.flippers.map((geo, i) => (
          <Skinned key={i} geo={geo} />
        ))}
        <group ref={tail} position={[-1.7, 0, 0]}>
          {g.tail.map((geo, i) => (
            <Skinned key={i} geo={geo} />
          ))}
        </group>
        <Eye p={[1.32, 0.1, 0.19]} r={0.075} />
      </group>
    </group>
  )
}

/* ================================================================== */
/*  Плезиозавр                                                         */
/* ================================================================== */

const PLESIO = { color: '#3d5a4a', belly: '#dfe3c8', stripe: '#263a30' }
const PLESIO_NECK_PIVOT: V3 = [0.9, 0.05, 0]

function buildPlesiosaur() {
  const { color, belly, stripe } = PLESIO
  // Ескек тәрізді аяқ: түбірі (0,0,0), +Z бағытына созылған
  const paddle = (len: number, sweep: number) =>
    tube({
      points: [
        [0, 0, 0],
        [-sweep * 0.4, -0.08, len * 0.5],
        [-sweep, -0.18, len],
      ],
      radii: [0.13, 0.21, 0.025],
      sy: 0.24,
      color,
      belly,
    })
  return {
    body: tube({
      points: [
        [-1.75, 0, 0],
        [-1.0, 0, 0],
        [-0.3, 0.02, 0],
        [0.4, 0.02, 0],
        [0.95, 0.05, 0],
        [1.3, 0.1, 0],
      ],
      radii: [0.03, 0.26, 0.56, 0.56, 0.37, 0.24],
      sx: 1.2,
      sy: 0.82,
      radial: 18,
      color,
      belly,
      stripe,
      stripes: 5,
    }),
    neck: tube({
      points: [
        [0, 0, 0],
        [0.6, 0.1, 0],
        [1.3, 0.3, 0],
        [2.0, 0.45, 0],
        [2.3, 0.5, 0],
        [2.55, 0.48, 0],
        [2.7, 0.45, 0],
      ],
      radii: [0.33, 0.21, 0.15, 0.13, 0.155, 0.11, 0.025],
      radial: 12,
      segments: 48,
      color,
      belly,
      stripe,
      stripes: 9,
    }),
    front: paddle(1.25, 0.55),
    hind: paddle(1.05, 0.6),
  }
}

export function Plesiosaur(props: GroupProps) {
  const neck = useRef<THREE.Group>(null)
  const paddles = useRef<(THREE.Group | null)[]>([])
  const g = useMemo(buildPlesiosaur, [])

  // [x, z-бағыты, фаза, геометрия]
  const slots: [number, 1 | -1, number, THREE.BufferGeometry][] = [
    [0.55, 1, 0, g.front],
    [0.55, -1, 0, g.front],
    [-0.55, 1, 1.6, g.hind],
    [-0.55, -1, 1.6, g.hind],
  ]

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (neck.current) {
      neck.current.rotation.y = Math.sin(t * 0.6) * 0.3
      neck.current.rotation.z = Math.sin(t * 0.45) * 0.1
    }
    paddles.current.forEach((p, i) => {
      if (!p) return
      const phase = slots[i][2]
      // «Су астында ұшу»: ескектер жоғары-төмен сермеледі
      p.rotation.x = Math.sin(t * 1.7 + phase) * 0.42
      p.rotation.y = Math.cos(t * 1.7 + phase) * 0.15
    })
  })

  return (
    <group {...props}>
      <Skinned geo={g.body} />
      <group ref={neck} position={PLESIO_NECK_PIVOT}>
        <Skinned geo={g.neck} />
        <Eye p={[2.38, 0.57, 0.105]} r={0.035} />
      </group>
      {slots.map(([x, side, , geo], i) => (
        <group key={i} position={[x, -0.1, 0.5 * side]} scale={[1, 1, side]}>
          <group
            ref={(el) => {
              paddles.current[i] = el
            }}
          >
            <Skinned geo={geo} />
          </group>
        </group>
      ))}
    </group>
  )
}

/* ================================================================== */
/*  Птерозавр және құс                                                 */
/* ================================================================== */

/** Жарғақ қанаттың жазық геометриясы: XZ жазықтығындағы көпбұрыш (желдеткіш тәрізді үшбұрыштар). */
function membrane(outline: [number, number][]) {
  const pos: number[] = []
  for (let i = 1; i < outline.length - 1; i++) {
    pos.push(outline[0][0], 0, outline[0][1])
    pos.push(outline[i + 1][0], 0, outline[i + 1][1])
    pos.push(outline[i][0], 0, outline[i][1])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

const PTERO = { color: '#7a5a3c', belly: '#e0cfa6' }

function buildPterosaur() {
  const { color, belly } = PTERO
  return {
    body: tube({
      points: [
        [-0.62, -0.02, 0],
        [-0.25, 0, 0],
        [0.2, 0.02, 0],
        [0.5, 0.08, 0],
        [0.75, 0.25, 0],
        [0.92, 0.4, 0],
      ],
      radii: [0.015, 0.14, 0.18, 0.11, 0.07, 0.07],
      radial: 12,
      color,
      belly,
    }),
    beak: tube({
      points: [
        [0.8, 0.42, 0],
        [1.0, 0.43, 0],
        [1.4, 0.34, 0],
        [1.92, 0.2, 0],
      ],
      radii: [0.03, 0.095, 0.05, 0.008],
      sx: 0.55,
      color: '#d9b76a',
      belly: '#e9d9b0',
    }),
    crest: tube({
      points: [
        [0.98, 0.46, 0],
        [0.66, 0.63, 0],
        [0.3, 0.78, 0],
      ],
      radii: [0.065, 0.045, 0.008],
      sx: 0.35,
      color: '#c2553a',
    }),
    // Ішкі қанат: иықтан білезікке дейін (пивот — иық)
    armBone: tube({ points: [[0, 0, 0], [0.12, 0.01, 0.5], [0.22, 0, 1.0]], radii: [0.045, 0.035, 0.03], radial: 6, color }),
    inner: membrane([
      [0.02, 0],
      [0.22, 1.0],
      [-0.5, 0.98],
      [-0.72, 0.5],
      [-0.68, 0],
    ]),
    // Сыртқы қанат: білезіктен ұшына дейін (пивот — білезік)
    fingerBone: tube({ points: [[0.22, 0, 0], [0.05, 0, 0.9], [-0.42, 0, 1.75]], radii: [0.03, 0.022, 0.006], radial: 6, color }),
    outer: membrane([
      [0.22, 0],
      [0.05, 0.9],
      [-0.42, 1.75],
      [-0.5, -0.02],
    ]),
  }
}

export function Pterosaur({ flap = 2.4, ...props }: GroupProps & { flap?: number }) {
  const inner = useRef<(THREE.Group | null)[]>([])
  const outer = useRef<(THREE.Group | null)[]>([])
  const g = useMemo(buildPterosaur, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * flap
    for (let i = 0; i < 2; i++) {
      const a = inner.current[i]
      const b = outer.current[i]
      if (a) a.rotation.x = Math.sin(t) * 0.42 - 0.08
      if (b) b.rotation.x = Math.sin(t - 0.9) * 0.5 + 0.1
    }
  })

  return (
    <group {...props}>
      <Skinned geo={g.body} roughness={0.7} />
      <Skinned geo={g.beak} roughness={0.5} />
      <Skinned geo={g.crest} roughness={0.6} />
      <Eye p={[1.02, 0.47, 0.055]} r={0.022} />
      {[1, -1].map((side, i) => (
        <group key={side} position={[0.22, 0.06, 0.1 * side]} scale={[1, 1, side]}>
          <group
            ref={(el) => {
              inner.current[i] = el
            }}
          >
            <Skinned geo={g.armBone} roughness={0.7} />
            <mesh geometry={g.inner} castShadow>
              <meshStandardMaterial color="#b98a5a" roughness={0.75} side={THREE.DoubleSide} transparent opacity={0.92} />
            </mesh>
            <group
              position={[0, 0, 1.0]}
              ref={(el) => {
                outer.current[i] = el
              }}
            >
              <Skinned geo={g.fingerBone} roughness={0.7} />
              <mesh geometry={g.outer} castShadow>
                <meshStandardMaterial color="#b98a5a" roughness={0.75} side={THREE.DoubleSide} transparent opacity={0.92} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
    </group>
  )
}

/** Қарапайым құс сұлбасы — динозаврлардың тірі қалған ұрпағы (12-слайд). */
export function Bird({ flap = 7, color = '#1b1612', ...props }: GroupProps & { flap?: number; color?: string }) {
  const wings = useRef<(THREE.Group | null)[]>([])
  const g = useMemo(
    () => ({
      body: tube({
        points: [
          [-0.42, 0.02, 0],
          [-0.15, 0, 0],
          [0.12, 0, 0],
          [0.3, 0.03, 0],
          [0.42, 0.02, 0],
        ],
        radii: [0.01, 0.06, 0.085, 0.055, 0.008],
        radial: 8,
        color,
      }),
      wing: membrane([
        [0.12, 0],
        [0.1, 0.45],
        [-0.12, 0.95],
        [-0.2, 0.4],
        [-0.14, 0],
      ]),
    }),
    [color],
  )
  const phase = useMemo(() => Math.random() * 6, [])

  useFrame(({ clock }) => {
    const a = Math.sin(clock.elapsedTime * flap + phase) * 0.7
    for (const w of wings.current) if (w) w.rotation.x = a
  })

  return (
    <group {...props}>
      <Skinned geo={g.body} roughness={0.8} />
      {[1, -1].map((side, i) => (
        <group key={side} position={[0, 0.03, 0.04 * side]} scale={[1, 1, side]}>
          <group
            ref={(el) => {
              wings.current[i] = el
            }}
          >
            <mesh geometry={g.wing}>
              <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}
