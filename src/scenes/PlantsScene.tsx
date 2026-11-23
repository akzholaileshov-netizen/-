import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStage } from '../store/stage'
import { Glow, SkyDome, Sun } from '../three/Atmos'
import { Instanced } from '../three/Instanced'
import { Swap, Terrain } from '../three/Kit'
import { mulberry32 } from '../three/noise'
import { Particles } from '../three/Particles'
import { coniferGeo, cycadGeo, fernGeo, flowerGeo, grassGeo } from '../three/plants'
import { SceneRig } from '../three/SceneRig'
import { heightFn, scatter, type TerrainSpec } from '../three/terrain'

const HORIZON = '#0a2a1c'

const GROUND: TerrainSpec = {
  radius: 9.5,
  amp: 0.38,
  freq: 0.3,
  seed: 33,
  flat: 2.4,
  colors: ['#0c2415', '#1a4226', '#3a6a3a'],
}
const h = heightFn(GROUND)

function Specimen({ geometry, scale }: { geometry: THREE.BufferGeometry; scale: number }) {
  return (
    <mesh geometry={geometry} scale={scale} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** 9-слайд: мезозой флорасының төрт тобы; таңдалған өсімдік ортаға шығады. */
export default function PlantsScene() {
  const focus = useStage((s) => s.focus)
  const sway = useRef<THREE.Group>(null)

  const geo = useMemo(
    () => ({
      fern: fernGeo(1),
      cycad: cycadGeo(2),
      conifer: coniferGeo(0, 3),
      flower: flowerGeo(4),
      smallFern: fernGeo(9),
      grass: grassGeo(5, '#2f6a38', '#8fb85c', 0.45, 7),
    }),
    [],
  )

  const items = useMemo(
    () => ({
      ferns: scatter({ count: 70, rMin: 3.3, rMax: 9, seed: 71, h, scale: [0.45, 1.0] }),
      grass: scatter({ count: 190, rMin: 2.6, rMax: 9, seed: 72, h, scale: [0.6, 1.4] }),
    }),
    [],
  )

  // Негізгі гүлдің айналасындағы шоқ
  const bouquet = useMemo(() => {
    const rnd = mulberry32(73)
    return Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + rnd()
      const r = 0.9 + rnd() * 0.6
      return { position: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number], scale: 1.5 + rnd() * 0.9, yaw: rnd() * 6 }
    })
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (sway.current) {
      sway.current.rotation.z = Math.sin(t * 0.8) * 0.018
      sway.current.rotation.x = Math.sin(t * 0.6 + 1) * 0.014
    }
  })

  return (
    <>
      <SceneRig position={[6.2, 2.5, 7.8]} target={[0, 1.5, 0]} background={HORIZON} fog={0.05} autoRotate={0.5} azimuth={Infinity} polar={[0.8, 1.52]} />
      <SkyDome top="#03100a" bottom={HORIZON} sun={[0.3, 0.7, 0.4]} sunColor="#e8ffd0" sunPower={0.35} />

      <hemisphereLight args={['#a8ecc0', '#07140c', 0.8]} />
      <Sun position={[4, 9, 5]} color="#f6ffe8" intensity={2.7} extent={7} />
      <pointLight position={[-4, 3, -4]} color="#e2c07a" intensity={40} distance={14} />

      <Terrain spec={GROUND} h={h} />
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.014, 6, 120]} />
        <meshStandardMaterial color="#e2c07a" emissive="#c79a45" emissiveIntensity={1.2} />
      </mesh>

      <Instanced geometry={geo.smallFern} items={items.ferns} />
      <Instanced geometry={geo.grass} items={items.grass} />

      <group ref={sway}>
        <Swap active={focus === 0}>
          <Specimen geometry={geo.fern} scale={2.4} />
        </Swap>
        <Swap active={focus === 1}>
          <Specimen geometry={geo.cycad} scale={1.7} />
        </Swap>
        <Swap active={focus === 2}>
          <Specimen geometry={geo.conifer} scale={0.78} />
        </Swap>
        <Swap active={focus === 3}>
          <Specimen geometry={geo.flower} scale={3.8} />
          {bouquet.map((b, i) => (
            <group key={i} position={b.position} rotation={[0, b.yaw, 0]}>
              <Specimen geometry={geo.flower} scale={b.scale} />
            </group>
          ))}
        </Swap>
      </group>

      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return <Glow key={i} color="#bfe8d0" scale={[9, 3.6]} opacity={0.07} position={[Math.cos(a) * 5.5, 0.8, Math.sin(a) * 5.5]} />
      })}

      {/* Жылтырақ тозаң */}
      <Particles count={340} box={[15, 6, 15]} position={[0, 2.8, 0]} color="#e8ffb0" size={0.06} velocity={[0.03, 0.04, 0.02]} wobble={0.45} twinkle={0.95} seed={23} />
    </>
  )
}
