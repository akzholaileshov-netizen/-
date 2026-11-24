import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { REDUCED_MOTION } from '../fx'
import { useStage } from '../store/stage'
import { useAge } from '../three/anim'
import { SkyDome, Sun } from '../three/Atmos'
import { ammoniteGeo, type V3 } from '../three/geo'
import { Instanced } from '../three/Instanced'
import { Label, Terrain } from '../three/Kit'
import { Motes } from '../three/Motes'
import { grassGeo, rockGeo } from '../three/plants'
import { SceneRig } from '../three/SceneRig'
import { Ichthyosaur, Plesiosaur, Pterosaur } from '../three/SeaSky'
import { heightFn, scatter, type TerrainSpec } from '../three/terrain'
import { Splashes, WaterSurface, type SplashHandle } from '../three/Water'

const HORIZON = '#0e3a44'
const SKY_TOP = '#040c14'
const SUN_DIR: V3 = [0.3, 0.6, -0.7]
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

/** Су астындағы жануарлардың айналма жолдары: радиус, биіктік, бұрыштық жылдамдық, бастапқы фаза. */
const PATHS = [
  { r: 4.4, y: -1.5, speed: 0.34, phase: 0.4 },
  { r: 6.3, y: -3.0, speed: -0.2, phase: 2.6 },
]

/** Ихтиозаврдың секірісі: әр LEAP.every секунд сайын судан атып шығып, доға жасап қайта сүңгиді. */
const LEAP = { first: 2.2, every: 9.5, time: 2.6, height: 2.75, dash: 0.55 }

/** Птерозаврдың жолы — сахнаны ортасынан кесіп өтетін «сегіздік»: ортада су бетін жанай ұшады, шеттерде биіктейді. */
const FLIGHT = { x: 8.2, z: 7, low: 0.95, rise: 2.5, speed: 0.42, start: -1.0 }

/** 8-слайд: теңіз қимасы — су беті аспанды шағылыстырады, ихтиозавр судан секіріп сүңгиді, птерозавр сахнаны кесіп ұшады. */
export default function SeaSkyScene() {
  const focus = useStage((s) => s.focus)
  const movers = useRef<(THREE.Group | null)[]>([])
  const tilts = useRef<(THREE.Group | null)[]>([])
  const scales = useRef([1, 1, 1])
  const splash = useRef<SplashHandle>(null)
  const age = useAge()
  const memo = useRef({ ichthyY: PATHS[0].y, heading: 0, bank: 0, skim: 0 })

  const geo = useMemo(
    () => ({
      kelp: grassGeo(3, '#1c6a4a', '#62b078', 1.9, 6),
      rock: rockGeo(15, '#3f5552', 1),
      ammonite: ammoniteGeo('#d6b97a', '#8a6a3c'),
    }),
    [],
  )

  const items = useMemo(
    () => ({
      kelp: scatter({ count: 46, rMin: 1.5, rMax: RADIUS - 0.8, seed: 62, h, scale: [0.7, 1.4] }),
      rocks: scatter({ count: 18, rMin: 1, rMax: RADIUS - 0.6, seed: 63, h, scale: [0.25, 0.8], sink: -0.2 }),
      shells: scatter({ count: 5, rMin: 1.5, rMax: RADIUS - 2, seed: 64, h, scale: [0.3, 0.5], sink: -0.25 }),
    }),
    [],
  )

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const m = memo.current

    movers.current.forEach((g, i) => {
      if (!g) return
      g.rotation.order = 'YZX'
      scales.current[i] = THREE.MathUtils.damp(scales.current[i], focus === i ? 1.25 : 0.8, 4, dt)
      g.scale.setScalar(scales.current[i])
      if (i === 2) return

      const p = PATHS[i]
      let a = p.phase + t * p.speed
      let y = p.y + Math.sin(t * 0.7 + i * 2) * 0.25
      let pitch = 0
      if (i === 0 && !REDUCED_MOTION) {
        // Секіріс: sin² профилі — басы мен соңында тегіс, ортасында су бетінен биік шығады
        const since = age.current - LEAP.first
        const u = (((since % LEAP.every) + LEAP.every) % LEAP.every) / LEAP.time
        // Секірер алдында екпін алады: әр секірісте жол бойымен LEAP.dash радианға алға озады
        const done = since < 0 ? 0 : Math.floor(since / LEAP.every) + (u < 1 ? u - Math.sin(2 * Math.PI * u) / (2 * Math.PI) : 1)
        a += done * LEAP.dash
        if (u < 1) {
          const s = Math.sin(Math.PI * u)
          y += LEAP.height * s * s
          const rise = (LEAP.height * Math.PI * Math.sin(2 * Math.PI * u)) / LEAP.time
          const run = (Math.abs(p.speed) + (LEAP.dash / LEAP.time) * (1 - Math.cos(2 * Math.PI * u))) * p.r
          pitch = Math.atan2(rise, run) * 0.9
        }
      }
      const x = Math.cos(a) * p.r
      const z = Math.sin(a) * p.r
      // +X бағытына қараған модельді шеңберге жанама бағытқа бұрамыз
      g.position.set(x, y, z)
      g.rotation.y = -a - (p.speed > 0 ? Math.PI / 2 : -Math.PI / 2)
      g.rotation.z = pitch

      if (i === 0) {
        // Су бетін кесіп өткен сәтте (шыққанда да, сүңгігенде де) шашыранды
        if (m.ichthyY < 0 !== y < 0) splash.current?.burst(x, z, y < 0 ? 1.35 : 1)
        m.ichthyY = y
      }
    })

    // Птерозавр: «сегіздік» жолмен ұшады, бұрылыста қисаяды, төмендегенде су бетінде із қалдырады
    const bird = movers.current[2]
    if (bird) {
      const a = FLIGHT.start + age.current * FLIGHT.speed * (REDUCED_MOTION ? 0.5 : 1)
      const x = Math.sin(a) * FLIGHT.x
      const z = Math.sin(2 * a) * FLIGHT.z * 0.5
      const y = FLIGHT.low + FLIGHT.rise * Math.sin(a) * Math.sin(a)
      const dx = Math.cos(a) * FLIGHT.x
      const dz = Math.cos(2 * a) * FLIGHT.z
      const dy = FLIGHT.rise * Math.sin(2 * a)
      const heading = Math.atan2(-dz, dx)
      bird.position.set(x, y, z)
      bird.rotation.y = heading
      bird.rotation.z = Math.atan2(dy, Math.hypot(dx, dz)) * 0.7

      const turn = Math.atan2(Math.sin(heading - m.heading), Math.cos(heading - m.heading)) / Math.max(dt, 1e-3)
      m.heading = heading
      m.bank = THREE.MathUtils.damp(m.bank, THREE.MathUtils.clamp(-turn * 0.85, -0.75, 0.75), 3, dt)
      const tilt = tilts.current[2]
      if (tilt) tilt.rotation.x = m.bank

      m.skim -= dt
      if (y < FLIGHT.low + 0.22 && m.skim <= 0) {
        m.skim = 0.13
        splash.current?.ripple(x - Math.cos(heading) * 0.4, z + Math.sin(heading) * 0.4, 0.45)
      }
    }
  })

  const names = ['Ихтиозавр', 'Плезиозавр', 'Птерозавр']

  return (
    <>
      {/* Камера су деңгейінен сәл жоғары: беті аспанды шағылыстырып жатады, ал су асты мөлдір бүйір қабырға арқылы көрінеді */}
      <SceneRig position={[10, 1.25, 12.5]} target={[0, -1.5, 0]} follow={() => movers.current[focus]} background={HORIZON} fog={0.018} autoRotate={0.3} polar={[0.85, 1.95]} />
      <SkyDome top={SKY_TOP} bottom={HORIZON} sun={SUN_DIR} sunColor="#dff6ff" sunPower={0.7} />

      <hemisphereLight args={['#a8e6f4', '#041a20', 0.9]} />
      <Sun position={[5, 12, 4]} color="#e6f8ff" intensity={2.6} extent={12} />
      <pointLight position={[0, -2.2, 0]} color="#3fd0c0" intensity={60} distance={18} />

      {/* Теңіз түбі: балдырлар ағыспен тербеледі */}
      <group position={[0, -DEPTH, 0]}>
        <Terrain spec={SEABED} h={h} />
        <Instanced geometry={geo.kelp} items={items.kelp} wind={0.07} />
        <Instanced geometry={geo.rock} items={items.rocks} castShadow>
          <meshStandardMaterial vertexColors roughness={0.95} flatShading />
        </Instanced>
        <Instanced geometry={geo.ammonite} items={items.shells} lod={false}>
          <meshStandardMaterial vertexColors roughness={0.5} metalness={0.15} />
        </Instanced>
      </group>

      {/* Су көлемі: мөлдір қабырға + шағылысатын толқынды бет */}
      <mesh position={[0, -DEPTH / 2, 0]}>
        <cylinderGeometry args={[RADIUS, RADIUS, DEPTH, 72, 1, true]} />
        <meshStandardMaterial color="#12707c" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} roughness={0.2} />
      </mesh>
      <WaterSurface radius={RADIUS} top={SKY_TOP} bottom={HORIZON} sun={SUN_DIR} sunColor="#dff6ff" />
      <Splashes ref={splash} />

      {[Ichthyosaur, Plesiosaur, Pterosaur].map((Creature, i) => (
        <group
          key={i}
          ref={(el) => {
            movers.current[i] = el
          }}
        >
          {/* Бұрылыста шеңбер ортасына қарай сәл қисаю (птерозаврдікі кадр сайын есептеледі) */}
          <group
            rotation={[i === 2 ? 0 : Math.sign(PATHS[i].speed) * 0.12, 0, 0]}
            ref={(el) => {
              tilts.current[i] = el
            }}
          >
            <Creature />
          </group>
          <Label position={[0.4, i === 2 ? 1.0 : 1.15, 0]} tone={focus === i ? 'lava' : 'jungle'}>
            {names[i]}
          </Label>
        </group>
      ))}

      {/* Көпіршіктер және су астындағы қалқыма бөлшектер */}
      <Motes count={440} box={[17, DEPTH - 0.4, 17]} position={[0, -DEPTH / 2, 0]} color="#c8fff4" size={0.06} velocity={[0, 0.32, 0]} wobble={0.2} twinkle={0.5} opacity={0.6} seed={19} />
      {/* Теңіз үстіндегі жеңіл тұман */}
      <Motes kind="fog" count={8} box={[24, 1.2, 24]} position={[0, 0.9, 0]} color="#9fd8e0" size={7} velocity={[0.25, 0, 0.08]} opacity={0.035} seed={20} />
    </>
  )
}
