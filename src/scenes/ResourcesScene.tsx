import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Glow, Sun } from '../three/Atmos'
import { ammoniteGeo, merge, paint, tube } from '../three/geo'
import { Instanced } from '../three/Instanced'
import { Label } from '../three/Kit'
import { mulberry32, noise3 } from '../three/noise'
import { Particles } from '../three/Particles'
import { grassGeo } from '../three/plants'
import { SceneRig } from '../three/SceneRig'
import type { Item } from '../three/terrain'

/* Жер қыртысының қимасы: ені W (x), тереңдігі D (z). */
const W = 7
const D = 4.6
const FRONT = D / 2
/** Ұңғыма мен антиклиналь (мұнай жиналатын күмбез) орны. */
const WELL_X = 1.2

/** Қабат шекаралары (төменнен жоғары): биіктігі және антиклиналь иілімінің шамасы. */
const BOUNDS = [
  { y: -2.7, bump: 0 },
  { y: -2.0, bump: 0.3 },
  { y: -0.85, bump: 0.3 },
  { y: -0.64, bump: 0.3 },
  { y: -0.28, bump: 0.22 },
  { y: 0.55, bump: 0.07 },
  { y: 0.74, bump: 0 },
]

const boundary = (i: number, x: number, z: number) => {
  const b = BOUNDS[i]
  const wave = i === 0 ? 0 : (noise3(x * 0.6 + i * 3.1, i * 1.7, z * 0.6) - 0.5) * 0.12
  return b.y + b.bump * Math.exp(-((x - WELL_X) ** 2) / 2.4) + wave
}

const LAYERS = [
  { color: '#2b2723' }, // іргетас
  { color: '#94734a' }, // юра құмтасы — мұнай коллекторы
  { color: '#0e0e10' }, // көмір қабаты
  { color: '#5c6850' }, // саз — мұнайды ұстап тұратын «қақпақ»
  { color: '#d4c394' }, // бор шөгінділері
  { color: '#7d8546' }, // топырақ, дала
]

function layerGeo(i: number) {
  const g = new THREE.BoxGeometry(W, 1, D, 30, 1, 14)
  const pos = g.getAttribute('position')
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k)
    const z = pos.getZ(k)
    pos.setY(k, boundary(pos.getY(k) > 0 ? i + 1 : i, x, z))
  }
  const base = new THREE.Color(LAYERS[i].color)
  const rnd = mulberry32(i + 3)
  let shade = 0
  const flat = g.toNonIndexed()
  paint(flat, (_p, c, k) => {
    if (k % 3 === 0) shade = (rnd() - 0.5) * 0.045
    c.copy(base).offsetHSL(0, 0, shade)
  })
  return merge([flat], true)
}

/** XY жазықтығындағы көпбұрыш (желдеткіш тәрізді үшбұрыштар). */
function polygon(points: [number, number][]) {
  const pos: number[] = []
  for (let i = 1; i < points.length - 1; i++) {
    pos.push(points[0][0], points[0][1], 0, points[i][0], points[i][1], 0, points[i + 1][0], points[i + 1][1], 0)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

/** Тасқа түскен птерозавр таңбасы (Sordes pilosus — ұзын құйрықты шағын птерозавр). */
function imprintGeo() {
  const wing: [number, number][] = [
    [-0.05, 0.12],
    [-0.08, -0.12],
    [-0.5, -0.06],
    [-0.95, 0.06],
    [-0.52, 0.3],
  ]
  const flip = (pts: [number, number][]) => pts.map(([x, y]) => [-x, y] as [number, number]).reverse()
  return merge([
    polygon(wing),
    polygon(flip(wing)),
    polygon([
      [-0.07, 0.2],
      [-0.06, -0.25],
      [0.06, -0.25],
      [0.07, 0.2],
    ]),
    polygon([
      [-0.05, 0.2],
      [0.05, 0.2],
      [0.03, 0.36],
      [0, 0.54],
      [-0.03, 0.36],
    ]),
    polygon([
      [-0.02, -0.25],
      [-0.012, -0.66],
      [0.012, -0.66],
      [0.02, -0.25],
    ]),
    polygon([
      [0, -0.6],
      [-0.045, -0.7],
      [0, -0.8],
      [0.045, -0.7],
    ]),
  ])
}

/** Мұнай сорғысы («тербелме-станок»). Жергілікті координата басы — ұңғыма сағасы. */
function Pumpjack() {
  const beam = useRef<THREE.Group>(null)
  const crank = useRef<THREE.Group>(null)
  const rod = useRef<THREE.Mesh>(null)
  const arm = useRef<THREE.Mesh>(null)
  const PIVOT_X = -0.9
  const PIVOT_Y = 1.18
  const CRANK_X = -1.75
  const CRANK_Y = 0.5

  useFrame(({ clock }) => {
    const phi = clock.elapsedTime * 1.5
    const theta = -0.2 * Math.sin(phi)
    if (beam.current) beam.current.rotation.z = theta
    if (crank.current) crank.current.rotation.z = phi
    // Жылтыр шток: «ат басынан» сағаға дейін созылады
    if (rod.current) {
      const top = PIVOT_Y + 0.9 * Math.sin(theta) - 0.36 * Math.cos(theta)
      rod.current.position.y = (0.1 + top) / 2
      rod.current.scale.y = Math.max(0.05, top - 0.1)
    }
    // Шатун: арқалықтың артқы ұшын қосиінмен жалғайды
    if (arm.current) {
      const ax = PIVOT_X - 0.85 * Math.cos(theta)
      const ay = PIVOT_Y - 0.85 * Math.sin(theta)
      const bx = CRANK_X + 0.2 * Math.cos(phi)
      const by = CRANK_Y + 0.2 * Math.sin(phi)
      arm.current.position.set((ax + bx) / 2, (ay + by) / 2, 0.14)
      arm.current.rotation.z = Math.atan2(ay - by, ax - bx) - Math.PI / 2
      arm.current.scale.y = Math.hypot(ax - bx, ay - by)
    }
  })

  const steel = <meshStandardMaterial color="#3d423d" roughness={0.55} metalness={0.6} />
  const red = <meshStandardMaterial color="#c2452a" roughness={0.5} metalness={0.3} />

  return (
    <group>
      <mesh position={[-1.05, 0.04, 0]} castShadow>
        <boxGeometry args={[2.7, 0.08, 0.5]} />
        {steel}
      </mesh>
      {/* Тірек */}
      {[0.2, -0.2].map((tilt) => (
        <mesh key={tilt} position={[PIVOT_X + tilt * 0.62, 0.62, 0]} rotation={[0, 0, tilt]} castShadow>
          <boxGeometry args={[0.07, 1.2, 0.09]} />
          {steel}
        </mesh>
      ))}
      {/* Арқалық пен «ат басы» */}
      <group ref={beam} position={[PIVOT_X, PIVOT_Y, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.8, 0.1, 0.12]} />
          {red}
        </mesh>
        <mesh position={[0.9, -0.13, 0]} castShadow>
          <boxGeometry args={[0.16, 0.52, 0.14]} />
          {red}
        </mesh>
      </group>
      <mesh ref={rod} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1, 6]} />
        <meshStandardMaterial color="#d8d8d0" roughness={0.2} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.16, 10]} />
        {red}
      </mesh>
      {/* Қосиін мен қарсы салмақ */}
      <group ref={crank} position={[CRANK_X, CRANK_Y, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.2, 12]} />
          {steel}
        </mesh>
        <mesh position={[-0.16, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 0.2, 0.16]} />
          {steel}
        </mesh>
      </group>
      <mesh ref={arm}>
        <boxGeometry args={[0.035, 1, 0.035]} />
        {steel}
      </mesh>
      <mesh position={[-2.15, 0.24, 0]} castShadow>
        <boxGeometry args={[0.42, 0.32, 0.34]} />
        {steel}
      </mesh>
    </group>
  )
}

/** 10-слайд: жер қыртысының қимасы — юра көмірі мен мұнайы, қазбалар, Қаратау тақтасы. */
export default function ResourcesScene() {
  const slab = useRef<THREE.Group>(null)
  const drops = useRef<(THREE.Mesh | null)[]>([])

  const geo = useMemo(
    () => ({
      layers: LAYERS.map((_, i) => layerGeo(i)),
      ammonite: ammoniteGeo('#e2cfa0', '#9a8358'),
      bone: tube({
        points: [
          [-0.42, 0, 0],
          [-0.3, 0, 0],
          [0, 0.02, 0],
          [0.3, 0, 0],
          [0.42, 0, 0],
        ],
        radii: [0.085, 0.05, 0.04, 0.05, 0.085],
        radial: 8,
        color: '#eadfc4',
      }),
      imprint: imprintGeo(),
      grass: grassGeo(6, '#8a8a42', '#d9c070', 0.32, 6),
    }),
    [],
  )

  const surfaceY = boundary(6, WELL_X, FRONT - 0.3)
  const oilY = boundary(2, WELL_X, FRONT) - 0.32

  const grass = useMemo(() => {
    const rnd = mulberry32(81)
    const out: Item[] = []
    while (out.length < 150) {
      const x = (rnd() - 0.5) * (W - 0.3)
      const z = (rnd() - 0.5) * (D - 0.3)
      // Сорғының астын бос қалдырамыз
      if (z > FRONT - 0.8 && x > WELL_X - 2.7 && x < WELL_X + 0.4) continue
      out.push({ p: [x, boundary(6, x, z), z], r: [0, rnd() * 6, 0], s: 0.6 + rnd() * 0.9 })
    }
    return out
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (slab.current) {
      slab.current.position.y = 2.75 + Math.sin(t * 0.7) * 0.12
      slab.current.rotation.y = 0.5 + Math.sin(t * 0.3) * 0.5
    }
    // Ұңғымамен көтерілген мұнай тамшылары
    drops.current.forEach((m, i) => {
      if (!m) return
      const k = (t * 0.22 + i / 4) % 1
      m.position.y = THREE.MathUtils.lerp(oilY + 0.1, surfaceY, k)
      m.scale.setScalar(0.6 + Math.sin(k * Math.PI) * 0.6)
    })
  })

  return (
    <>
      <SceneRig position={[7.6, 3.4, 10.4]} target={[0, -0.3, 0]} background="#0a0806" fog={0.016} autoRotate={0.3} polar={[0.7, 1.6]} />

      <hemisphereLight args={['#ffe9c8', '#1a120a', 0.75]} />
      <Sun position={[5, 9, 8]} color="#fff0d8" intensity={2.8} extent={8} />
      <Glow color="#ff4d2e" scale={[18, 7]} opacity={0.4} position={[0, -4.6, 0]} />
      <pointLight position={[0, -4.2, 0]} color="#ff4d2e" intensity={40} distance={9} />

      {geo.layers.map((g, i) => (
        <mesh key={i} geometry={g} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={i === 2 ? 0.35 : 0.92} metalness={i === 2 ? 0.35 : 0} />
        </mesh>
      ))}

      {/* Мұнай: антиклиналь күмбезінің астындағы линза */}
      <mesh position={[WELL_X, oilY, 0]} scale={[1.35, 0.26, FRONT + 0.03]}>
        <sphereGeometry args={[1, 28, 16]} />
        <meshStandardMaterial color="#0a0806" roughness={0.08} metalness={0.85} />
      </mesh>
      {/* Ұңғыма оқпаны */}
      <mesh position={[WELL_X, (oilY + surfaceY) / 2, FRONT + 0.03]}>
        <cylinderGeometry args={[0.025, 0.025, surfaceY - oilY, 8]} />
        <meshStandardMaterial color="#c8c8c0" roughness={0.3} metalness={0.8} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[WELL_X, oilY, FRONT + 0.07]}
          ref={(el) => {
            drops.current[i] = el
          }}
        >
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color="#1a1206" emissive="#c79a45" emissiveIntensity={0.9} roughness={0.2} metalness={0.6} />
        </mesh>
      ))}
      <group position={[WELL_X, surfaceY, FRONT - 0.3]}>
        <Pumpjack />
      </group>

      {/* Қимада көрінетін қазбалар */}
      {(
        [
          [-2.2, 0.16, 0.3, 0.4],
          [2.9, 0.1, 0.2, 2.2],
          [-0.9, -0.44, 0.13, 1.1],
          [-2.5, -1.45, 0.27, 3.0],
        ] as const
      ).map(([x, y, s, r], i) => (
        <mesh key={i} geometry={geo.ammonite} position={[x, y, FRONT + 0.01]} rotation={[0, 0, r]} scale={s}>
          <meshStandardMaterial vertexColors roughness={0.6} metalness={0.1} />
        </mesh>
      ))}
      <mesh geometry={geo.bone} position={[-0.7, -1.5, FRONT + 0.02]} rotation={[0, 0, 0.3]} scale={0.8}>
        <meshStandardMaterial vertexColors roughness={0.6} />
      </mesh>

      <Instanced geometry={geo.grass} items={grass} />

      <Label position={[-3.0, -0.74, FRONT + 0.25]}>Көмір</Label>
      <Label position={[WELL_X + 1.2, oilY - 0.35, FRONT + 0.25]}>Мұнай</Label>
      <Label position={[W / 2 + 0.35, -1.4, 0.6]} tone="jungle">
        Юра
      </Label>
      <Label position={[W / 2 + 0.35, 0.15, 0.6]} tone="jungle">
        Бор
      </Label>

      {/* Қаратау: кеш юра көлінің тақтатасындағы птерозавр таңбасы */}
      <group ref={slab} position={[-2.9, 2.75, -0.3]} rotation={[-0.25, 0.5, 0.08]}>
        <mesh castShadow>
          <boxGeometry args={[2.3, 1.9, 0.12]} />
          <meshStandardMaterial color="#b8a888" roughness={0.9} flatShading />
        </mesh>
        <mesh geometry={geo.imprint} position={[0, 0.1, 0.064]} scale={1.05}>
          <meshStandardMaterial color="#4a3a2a" roughness={1} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={geo.imprint} position={[0, 0.1, -0.064]} scale={1.05}>
          <meshStandardMaterial color="#4a3a2a" roughness={1} side={THREE.DoubleSide} />
        </mesh>
        <Label position={[0, 1.25, 0]} tone="lava">
          Қаратау · Sordes pilosus
        </Label>
      </group>

      <Particles count={300} box={[16, 9, 16]} position={[0, 0.5, 0]} color="#e9cf96" size={0.045} velocity={[0.04, 0.05, 0]} wobble={0.3} twinkle={0.85} seed={27} />
    </>
  )
}
