import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Glow, SkyDome, Sun } from '../three/Atmos'
import { tube, type V3 } from '../three/geo'
import { Instanced } from '../three/Instanced'
import { Terrain } from '../three/Kit'
import { lerp } from '../three/noise'
import { Particles } from '../three/Particles'
import { fernGeo, flowerGeo, grassGeo, rockGeo } from '../three/plants'
import { SceneRig } from '../three/SceneRig'
import { Bird } from '../three/SeaSky'
import { heightFn, scatter, type TerrainSpec } from '../three/terrain'

const HORIZON = '#c98f4c'

const GROUND: TerrainSpec = {
  radius: 17,
  amp: 0.55,
  freq: 0.15,
  seed: 51,
  flat: 4,
  colors: ['#5c4526', '#9c7c46', '#dcbc72'],
}
const h = heightFn(GROUND)
const CLEARING = [{ x: 0, z: 0, r: 3.6 }]

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

/** Құстардың айналма ұшу жолдары. */
const FLOCK = [
  { r: 4.2, y: 3.6, speed: 0.5, phase: 0 },
  { r: 5.6, y: 4.4, speed: 0.42, phase: 1.9 },
  { r: 3.4, y: 4.9, speed: -0.55, phase: 3.3 },
  { r: 6.4, y: 3.9, speed: 0.36, phase: 4.6 },
  { r: 4.9, y: 5.4, speed: -0.4, phase: 5.5 },
  { r: 7.2, y: 4.8, speed: 0.3, phase: 2.7 },
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
    return { p: curve.getPoint(k).toArray() as V3, r: lerp(0.05, 0.12, Math.sin(k * Math.PI)) }
  })
  const ribs = Array.from({ length: 8 }, (_, i) => {
    const k = 0.34 + (i / 7) * 0.5
    const p = curve.getPoint(k)
    const tangent = curve.getTangent(k)
    const radius = lerp(0.42, 0.66, Math.sin((i / 7) * Math.PI))
    return { p: [p.x, p.y - radius, p.z] as V3, yaw: Math.atan2(-tangent.z, tangent.x) + Math.PI / 2, radius }
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

/** 12-слайд: таң шапағы, құмға көмілген динозавр қаңқасы және оның үстінде ұшқан құстар — тірі ұрпақтары. */
export default function FinaleScene() {
  const birds = useRef<(THREE.Group | null)[]>([])
  const skeleton = useMemo(buildSkeleton, [])
  const geo = useMemo(
    () => ({
      grass: grassGeo(5, '#7d7a3a', '#e0c670', 0.42, 7),
      flower: flowerGeo(4, '#fff3d6', '#f0b070'),
      fern: fernGeo(3),
      rock: rockGeo(55, '#8a6d48', 1),
    }),
    [],
  )
  const items = useMemo(
    () => ({
      grass: scatter({ count: 240, rMin: 2, rMax: 15.5, seed: 101, h, scale: [0.6, 1.5] }),
      flowers: scatter({ count: 90, rMin: 2.6, rMax: 14, seed: 102, h, scale: [0.5, 1.0], tilt: 0.25 }),
      ferns: scatter({ count: 22, rMin: 4, rMax: 14, seed: 103, h, scale: [0.5, 0.9], avoid: CLEARING }),
      rocks: scatter({ count: 20, rMin: 3, rMax: 15, seed: 104, h, scale: [0.2, 0.8], avoid: CLEARING, sink: -0.2 }),
    }),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    birds.current.forEach((g, i) => {
      if (!g) return
      const f = FLOCK[i]
      const a = f.phase + t * f.speed
      g.position.set(Math.cos(a) * f.r, f.y + Math.sin(t * 0.8 + i) * 0.3, Math.sin(a) * f.r)
      g.rotation.y = -a - (f.speed > 0 ? Math.PI / 2 : -Math.PI / 2)
    })
  })

  const bone = <meshStandardMaterial vertexColors roughness={0.6} />

  return (
    <>
      <SceneRig position={[8.6, 2.9, 10.6]} target={[0, 1.5, 0]} background={HORIZON} fog={0.024} autoRotate={0.26} />
      <SkyDome top="#0d1816" bottom={HORIZON} sun={[-0.5, 0.14, -0.85]} sunColor="#ffe0a8" sunPower={1.5} />

      <hemisphereLight args={['#ffe8c4', '#3a2a18', 0.85]} />
      <Sun position={[-7, 8, 5]} color="#ffe2b8" intensity={3.0} extent={15} />
      <Glow color="#ffb860" scale={40} opacity={0.55} position={[-42, 12, -72]} />

      <Terrain spec={GROUND} h={h} />
      <Instanced geometry={geo.grass} items={items.grass} />
      <Instanced geometry={geo.flower} items={items.flowers} />
      <Instanced geometry={geo.fern} items={items.ferns} />
      <Instanced geometry={geo.rock} items={items.rocks} castShadow>
        <meshStandardMaterial vertexColors roughness={0.95} flatShading />
      </Instanced>

      {/* Жартылай құмға көмілген қаңқа */}
      <group position={[-0.2, h(0, 0) - 0.04, 0]} rotation={[0, 0.35, 0]}>
        <mesh geometry={skeleton.spine} castShadow>
          {bone}
        </mesh>
        <mesh geometry={skeleton.skull} castShadow>
          {bone}
        </mesh>
        <mesh geometry={skeleton.jaw} castShadow>
          {bone}
        </mesh>
        {[1, -1].map((side) => (
          <mesh key={side} position={[2.42, 0.5, 0.42 + side * 0.13]}>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color="#1a120a" roughness={1} />
          </mesh>
        ))}
        {skeleton.vertebrae.map((v, i) => (
          <mesh key={i} position={v.p} castShadow>
            <sphereGeometry args={[v.r, 8, 6]} />
            <meshStandardMaterial color={BONE.color} roughness={0.6} />
          </mesh>
        ))}
        {skeleton.ribs.map((rib, i) => (
          <mesh key={i} position={rib.p} rotation={[0, rib.yaw, 0]} scale={[0.8, 1, 1]} castShadow>
            <torusGeometry args={[rib.radius, 0.032, 6, 16, Math.PI]} />
            <meshStandardMaterial color={BONE.color} roughness={0.6} />
          </mesh>
        ))}
        <mesh geometry={skeleton.limb} position={[-0.4, 0.07, 1.25]} rotation={[0, 0.5, 0]} castShadow>
          {bone}
        </mesh>
        <mesh geometry={skeleton.limb} position={[1.1, 0.07, -1.1]} rotation={[0, -0.8, 0]} scale={0.85} castShadow>
          {bone}
        </mesh>
        <mesh geometry={skeleton.limb} position={[-1.3, 0.06, -0.9]} rotation={[0, 0.2, 0.05]} scale={0.7} castShadow>
          {bone}
        </mesh>
      </group>

      {/* Құстар — тероподты динозаврлардың ұрпақтары */}
      {FLOCK.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            birds.current[i] = el
          }}
        >
          <Bird scale={0.85} />
        </group>
      ))}

      <Particles count={520} box={[28, 8, 28]} position={[0, 3.4, 0]} color="#ffe7a8" size={0.055} velocity={[0.14, 0.04, 0.05]} wobble={0.3} twinkle={0.8} opacity={0.8} seed={31} />
    </>
  )
}
