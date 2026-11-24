import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { tube, type V3 } from './geo'
import { lerp } from './noise'

const BONE = { color: '#efe5cc', belly: '#b9a682' }

/** Омыртқа жотасының тірек нүктелері (құйрықтан мойынға қарай). */
const SPINE: V3[] = [
  [-2.9, 0.1, 0.55],
  [-1.8, 0.28, 0.2],
  [-0.7, 0.62, 0],
  [0.4, 0.76, 0],
  [1.3, 0.62, 0.1],
  [2.0, 0.38, 0.32],
]

function buildSkeleton() {
  const curve = new THREE.CatmullRomCurve3(
    SPINE.map((p) => new THREE.Vector3(...p)),
    false,
    'centripetal',
  )
  // Омыртқалар мен қабырғалар жота бойымен орналасады
  const vertebrae = Array.from({ length: 15 }, (_, i) => {
    const k = i / 14
    return { k: k * 0.8, p: curve.getPoint(k).toArray() as V3, r: lerp(0.05, 0.12, Math.sin(k * Math.PI)) }
  })
  const ribs = Array.from({ length: 8 }, (_, i) => {
    const k = 0.34 + (i / 7) * 0.5
    const p = curve.getPoint(k)
    const tangent = curve.getTangent(k)
    const radius = lerp(0.42, 0.66, Math.sin((i / 7) * Math.PI))
    return { k: k * 0.8, p: [p.x, p.y - radius, p.z] as V3, yaw: Math.atan2(-tangent.z, tangent.x) + Math.PI / 2, radius }
  })
  return {
    vertebrae,
    ribs,
    spine: tube({ points: SPINE, radii: [0.02, 0.05, 0.085, 0.1, 0.09, 0.07], radial: 8, ...BONE }),
    skull: tube({
      points: [
        [2.0, 0.36, 0.32],
        [2.3, 0.45, 0.4],
        [2.72, 0.4, 0.5],
        [3.08, 0.28, 0.58],
        [3.26, 0.22, 0.62],
      ],
      radii: [0.07, 0.21, 0.18, 0.11, 0.03],
      sx: 0.75,
      radial: 12,
      ...BONE,
    }),
    jaw: tube({
      points: [
        [2.25, 0.1, 0.48],
        [2.7, 0.07, 0.58],
        [3.1, 0.06, 0.68],
        [3.22, 0.07, 0.71],
      ],
      radii: [0.06, 0.07, 0.05, 0.015],
      radial: 8,
      ...BONE,
    }),
    // Жілік: екі ұшы жуан сүйек
    limb: tube({
      points: [
        [-0.5, 0, 0],
        [-0.36, 0, 0],
        [0, 0.02, 0],
        [0.36, 0, 0],
        [0.5, 0, 0],
      ],
      radii: [0.1, 0.055, 0.045, 0.055, 0.1],
      radial: 8,
      ...BONE,
    }),
  }
}

type SkeletonProps = ThreeElements['group'] & {
  /**
   * Жарықтану барысы: 0 — сөнулі; 0→1 аралығында жарық құйрықтан бас сүйекке қарай сүйектен сүйекке жүгіріп өтеді;
   * 1-ден асқанда бүкіл қаңқа жұмсақ жарқырап, баяу «соғып» тұрады.
   */
  glow?: RefObject<number>
  /** Шашылып жатқан жіліктерді көрсету (құмдағы қаңқа үшін). */
  scattered?: boolean
  clippingPlanes?: THREE.Plane[]
  castShadow?: boolean
}

/** Динозавр қаңқасы: омыртқа жотасы, қабырғалар, бас сүйек, жақ. Сүйектері жеке-жеке жарықтана алады. */
export function Skeleton({ glow, scattered = true, clippingPlanes, castShadow = true, ...props }: SkeletonProps) {
  const s = useMemo(buildSkeleton, [])
  const lit = useRef<{ k: number; material: THREE.MeshStandardMaterial }[]>([])

  /** Сүйектің материалы: k — оның қаңқа бойындағы орны (0 — құйрық, 1 — бас). */
  const bone = (k: number, vertex = false) => (
    <meshStandardMaterial
      ref={(material: THREE.MeshStandardMaterial | null) => {
        if (material && !lit.current.some((e) => e.material === material)) lit.current.push({ k, material })
      }}
      color={vertex ? '#ffffff' : BONE.color}
      vertexColors={vertex}
      roughness={0.6}
      emissive="#ffc27a"
      emissiveIntensity={0}
      clippingPlanes={clippingPlanes ?? null}
    />
  )

  useFrame(({ clock }) => {
    if (!glow) return
    const g = glow.current
    const t = clock.elapsedTime
    for (const { k, material } of lit.current) {
      const d = (g - k) * 5
      const on = Math.min(1, Math.max(0, d))
      // Жарық жеткен сәтте сүйек жарқ етеді, кейін тыныш жарқырауға көшеді
      const flash = d > 0 ? Math.exp(-d * 1.1) * 2.6 : 0
      material.emissiveIntensity = on * (0.55 + 0.2 * Math.sin(t * 2.2 - k * 7)) + flash
    }
  })

  return (
    <group {...props}>
      <mesh geometry={s.spine} castShadow={castShadow}>
        {bone(0.4, true)}
      </mesh>
      <mesh geometry={s.skull} castShadow={castShadow}>
        {bone(0.95, true)}
      </mesh>
      <mesh geometry={s.jaw} castShadow={castShadow}>
        {bone(1, true)}
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[2.42, 0.5, 0.42 + side * 0.13]}>
          <sphereGeometry args={[0.055, 10, 8]} />
          <meshStandardMaterial color="#1a120a" roughness={1} clippingPlanes={clippingPlanes ?? null} />
        </mesh>
      ))}
      {s.vertebrae.map((v, i) => (
        <mesh key={i} position={v.p} castShadow={castShadow}>
          <sphereGeometry args={[v.r, 8, 6]} />
          {bone(v.k)}
        </mesh>
      ))}
      {s.ribs.map((rib, i) => (
        <mesh key={i} position={rib.p} rotation={[0, rib.yaw, 0]} scale={[0.8, 1, 1]} castShadow={castShadow}>
          <torusGeometry args={[rib.radius, 0.032, 6, 16, Math.PI]} />
          {bone(rib.k)}
        </mesh>
      ))}
      {scattered && (
        <>
          <mesh geometry={s.limb} position={[-0.4, 0.07, 1.25]} rotation={[0, 0.5, 0]} castShadow={castShadow}>
            {bone(0.45, true)}
          </mesh>
          <mesh geometry={s.limb} position={[1.1, 0.07, -1.1]} rotation={[0, -0.8, 0]} scale={0.85} castShadow={castShadow}>
            {bone(0.65, true)}
          </mesh>
          <mesh geometry={s.limb} position={[-1.3, 0.06, -0.9]} rotation={[0, 0.2, 0.05]} scale={0.7} castShadow={castShadow}>
            {bone(0.3, true)}
          </mesh>
        </>
      )}
    </group>
  )
}
