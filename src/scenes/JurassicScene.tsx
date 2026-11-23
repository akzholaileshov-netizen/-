import { useMemo } from 'react'
import { Glow, SkyDome, Sun } from '../three/Atmos'
import { Diplodocus } from '../three/Dinosaurs'
import { Instanced } from '../three/Instanced'
import { Terrain } from '../three/Kit'
import { mulberry32 } from '../three/noise'
import { Particles } from '../three/Particles'
import { coniferGeo, cycadGeo, fernGeo } from '../three/plants'
import { SceneRig } from '../three/SceneRig'
import type { V3 } from '../three/geo'
import { heightFn, scatter, toward, type TerrainSpec } from '../three/terrain'

const HORIZON = '#12382a'

const GROUND: TerrainSpec = {
  radius: 19,
  amp: 0.8,
  freq: 0.14,
  seed: 9,
  flat: 5.5,
  colors: ['#0d2616', '#1b4628', '#44703c'],
}
const h = heightFn(GROUND)
const CLEARING = [{ x: 0, z: 0, r: 5.6 }]
const CAMERA: V3 = [11, 3.2, 13]
const OPEN = toward(CAMERA, 1.05, 6.5)

/** 5-слайд: юраның ылғалды қылқан жапырақты орманы және алаңқайдағы диплодок. */
export default function JurassicScene() {
  const geo = useMemo(
    () => ({
      coniferA: coniferGeo(0, 3),
      coniferB: coniferGeo(1, 4),
      cycad: cycadGeo(2),
      fern: fernGeo(1),
    }),
    [],
  )

  const items = useMemo(
    () => ({
      conifersA: scatter({ count: 54, rMin: 6, rMax: 17.5, seed: 31, h, scale: [0.9, 1.7], avoid: CLEARING, open: OPEN, tilt: 0.06 }),
      conifersB: scatter({ count: 36, rMin: 6.5, rMax: 17, seed: 32, h, scale: [0.9, 1.5], avoid: CLEARING, open: OPEN, tilt: 0.06 }),
      cycads: scatter({ count: 18, rMin: 4.2, rMax: 14, seed: 33, h, scale: [0.7, 1.2], avoid: [{ x: 0, z: 0, r: 4 }] }),
      ferns: scatter({ count: 170, rMin: 2.6, rMax: 16.5, seed: 34, h, scale: [0.55, 1.25], avoid: [{ x: 0, z: 0, r: 2.4 }] }),
    }),
    [],
  )

  // Жер бауырлаған тұман шоғырлары
  const mist = useMemo(() => {
    const rnd = mulberry32(35)
    return Array.from({ length: 9 }, () => {
      const a = rnd() * Math.PI * 2
      const r = 4 + rnd() * 10
      return { position: [Math.cos(a) * r, 0.9 + rnd() * 0.8, Math.sin(a) * r] as [number, number, number], scale: 9 + rnd() * 7 }
    })
  }, [])

  return (
    <>
      <SceneRig position={CAMERA} target={[0, 2.0, 0]} background={HORIZON} fog={0.04} autoRotate={0.26} />
      <SkyDome top="#04130e" bottom={HORIZON} sun={[0.4, 0.55, -0.7]} sunColor="#d8ffd0" sunPower={0.5} />

      <hemisphereLight args={['#a8e8c8', '#08180f', 0.8]} />
      <Sun position={[7, 14, 5]} color="#e8ffdc" intensity={2.5} extent={18} />

      <Terrain spec={GROUND} h={h} />

      <Instanced geometry={geo.coniferA} items={items.conifersA} castShadow receiveShadow />
      <Instanced geometry={geo.coniferB} items={items.conifersB} castShadow receiveShadow />
      <Instanced geometry={geo.cycad} items={items.cycads} castShadow />
      <Instanced geometry={geo.fern} items={items.ferns} />

      <Diplodocus position={[0.5, h(0, 0), 0]} rotation={[0, 0.55, 0]} scale={0.6} />

      {mist.map((m, i) => (
        <Glow key={i} color="#bfe8d0" scale={[m.scale, m.scale * 0.45]} opacity={0.075} position={m.position} />
      ))}

      {/* Тозаң мен ылғал тамшылары */}
      <Particles count={680} box={[30, 9, 30]} position={[0, 4.2, 0]} color="#d6ffb8" size={0.065} velocity={[0.12, 0.05, 0.06]} wobble={0.35} twinkle={0.85} opacity={0.75} seed={12} />
    </>
  )
}
