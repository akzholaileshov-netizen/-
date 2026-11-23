import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStage } from '../store/stage'
import { SkyDome, Sun } from '../three/Atmos'
import { ammoniteGeo } from '../three/geo'
import { Instanced } from '../three/Instanced'
import { Label, Terrain } from '../three/Kit'
import { Particles } from '../three/Particles'
import { grassGeo, rockGeo } from '../three/plants'
import { SceneRig } from '../three/SceneRig'
import { Ichthyosaur, Plesiosaur, Pterosaur } from '../three/SeaSky'
import { heightFn, scatter, type TerrainSpec } from '../three/terrain'

const HORIZON = '#0e3a44'
const RADIUS = 10
const DEPTH = 5

const SEABED: TerrainSpec = {
  radius: RADIUS + 0.5,
  amp: 0.55,
  freq: 0.25,
  seed: 61,
  sink: 0,
  colors: ['#12333a', '#2a5a55', '#7f8e66'],
}
const h = heightFn(SEABED)

/** Жануарлардың айналма жолдары: радиус, биіктік, бұрыштық жылдамдық, бастапқы фаза. */
const PATHS = [
  { r: 4.4, y: -1.5, speed: 0.34, phase: 0.4 },
  { r: 6.3, y: -3.0, speed: -0.2, phase: 2.6 },
  { r: 5.4, y: 2.7, speed: 0.38, phase: 4.2 },
]

/** 8-слайд: теңіз қимасы — су астында ихтиозавр мен плезиозавр, аспанда птерозавр. */
export default function SeaSkyScene() {
  const focus = useStage((s) => s.focus)
  const movers = useRef<(THREE.Group | null)[]>([])
  const scales = useRef([1, 1, 1])
  const surface = useRef<THREE.Mesh>(null)

  const geo = useMemo(() => {
    const water = new THREE.RingGeometry(0.001, RADIUS, 72, 14)
    water.rotateX(-Math.PI / 2)
    return {
      water,
      waterRest: Float32Array.from(water.getAttribute('position').array),
      kelp: grassGeo(3, '#1c6a4a', '#62b078', 1.9, 6),
      rock: rockGeo(15, '#3f5552', 1),
      ammonite: ammoniteGeo('#d6b97a', '#8a6a3c'),
    }
  }, [])

  const items = useMemo(
    () => ({
      kelp: scatter({ count: 46, rMin: 1.5, rMax: RADIUS - 0.8, seed: 62, h, scale: [0.7, 1.4] }),
      rocks: scatter({ count: 18, rMin: 1, rMax: RADIUS - 0.6, seed: 63, h, scale: [0.25, 0.8], sink: -0.2 }),
      shells: scatter({ count: 5, rMin: 1.5, rMax: RADIUS - 2, seed: 64, h, scale: [0.3, 0.5], sink: -0.25 }),
    }),
    [],
  )

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    movers.current.forEach((g, i) => {
      if (!g) return
      const p = PATHS[i]
      const a = p.phase + t * p.speed
      // +X бағытына қараған модельді шеңберге жанама бағытқа бұрамыз
      g.position.set(Math.cos(a) * p.r, p.y + Math.sin(t * 0.7 + i * 2) * 0.25, Math.sin(a) * p.r)
      g.rotation.y = -a - (p.speed > 0 ? Math.PI / 2 : -Math.PI / 2)
      scales.current[i] = THREE.MathUtils.damp(scales.current[i], focus === i ? 1.25 : 0.8, 4, Math.min(dt, 0.05))
      g.scale.setScalar(scales.current[i])
    })

    // Су бетінің толқыны
    const pos = geo.water.getAttribute('position') as THREE.BufferAttribute
    const rest = geo.waterRest
    for (let i = 0; i < pos.count; i++) {
      const x = rest[i * 3]
      const z = rest[i * 3 + 2]
      pos.setY(i, Math.sin(x * 0.9 + t * 1.1) * 0.06 + Math.cos(z * 1.1 + t * 1.4) * 0.05)
    }
    pos.needsUpdate = true
  })

  const names = ['Ихтиозавр', 'Плезиозавр', 'Птерозавр']

  return (
    <>
      {/* Камера су деңгейінен төмен: теңізге бүйір қабырға арқылы қарайды, таңдалған жануарды бақылап отырады */}
      <SceneRig position={[10, -0.7, 12.5]} target={[0, -1.5, 0]} follow={() => movers.current[focus]} background={HORIZON} fog={0.018} autoRotate={0.3} polar={[0.85, 1.95]} />
      <SkyDome top="#040c14" bottom={HORIZON} sun={[0.3, 0.6, -0.7]} sunColor="#dff6ff" sunPower={0.7} />

      <hemisphereLight args={['#a8e6f4', '#041a20', 0.9]} />
      <Sun position={[5, 12, 4]} color="#e6f8ff" intensity={2.6} extent={12} />
      <pointLight position={[0, -2.2, 0]} color="#3fd0c0" intensity={60} distance={18} />

      {/* Теңіз түбі */}
      <group position={[0, -DEPTH, 0]}>
        <Terrain spec={SEABED} h={h} />
        <Instanced geometry={geo.kelp} items={items.kelp} />
        <Instanced geometry={geo.rock} items={items.rocks} castShadow>
          <meshStandardMaterial vertexColors roughness={0.95} flatShading />
        </Instanced>
        <Instanced geometry={geo.ammonite} items={items.shells} lod={false}>
          <meshStandardMaterial vertexColors roughness={0.5} metalness={0.15} />
        </Instanced>
      </group>

      {/* Су көлемі: мөлдір қабырға + толқынды бет */}
      <mesh position={[0, -DEPTH / 2, 0]}>
        <cylinderGeometry args={[RADIUS, RADIUS, DEPTH, 72, 1, true]} />
        <meshStandardMaterial color="#12707c" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} roughness={0.2} />
      </mesh>
      <mesh ref={surface} geometry={geo.water}>
        <meshStandardMaterial color="#1f8e96" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} roughness={0.08} metalness={0.3} flatShading />
      </mesh>

      {[Ichthyosaur, Plesiosaur, Pterosaur].map((Creature, i) => (
        <group
          key={i}
          ref={(el) => {
            movers.current[i] = el
          }}
        >
          {/* Бұрылыста шеңбер ортасына қарай сәл қисаю */}
          <group rotation={[Math.sign(PATHS[i].speed) * (i === 2 ? 0.32 : 0.12), 0, 0]}>
            <Creature />
          </group>
          <Label position={[0.4, i === 2 ? 1.0 : 1.15, 0]} tone={focus === i ? 'lava' : 'jungle'}>
            {names[i]}
          </Label>
        </group>
      ))}

      {/* Көпіршіктер */}
      <Particles count={440} box={[17, DEPTH - 0.4, 17]} position={[0, -DEPTH / 2, 0]} color="#c8fff4" size={0.06} velocity={[0, 0.32, 0]} wobble={0.2} twinkle={0.5} opacity={0.6} seed={19} />
    </>
  )
}
