import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStage } from '../store/stage'
import { Glow, SkyDome, Sun } from '../three/Atmos'
import { TRex } from '../three/Dinosaurs'
import { Instanced } from '../three/Instanced'
import { Terrain } from '../three/Kit'
import { clamp01, mulberry32, smoothstep } from '../three/noise'
import { Particles } from '../three/Particles'
import { coniferGeo, fernGeo, rockGeo } from '../three/plants'
import { SceneRig } from '../three/SceneRig'
import type { V3 } from '../three/geo'
import { heightFn, scatter, toward, type TerrainSpec } from '../three/terrain'
import { Volcano } from '../three/Volcano'

const HORIZON = '#4a160b'

const GROUND: TerrainSpec = {
  radius: 19,
  amp: 0.8,
  freq: 0.15,
  seed: 44,
  flat: 3.5,
  colors: ['#1c1613', '#35271e', '#5c4231'],
}
const h = heightFn(GROUND)

/* Анимация кестесі (секунд) */
const CYCLE = 13
const IMPACT_AT = 4.8
const TRAIL = 9
const DEBRIS = 70
const GRAVITY = -7.5

// Астероид кадрдың оң жақ жоғарғы бұрышынан (алыстан) келіп, жанартаудың оң жағына құлайды —
// бүкіл ұшу жолы мен жарылыс камераның көру аймағында қалады
const START = new THREE.Vector3(-4.3, 15, -21.3)
const IMPACT = new THREE.Vector3(-0.5, 0.15, -6.1)
const VOLCANO: [number, number] = [-7.5, -4.5]
const REX: [number, number] = [-1.2, 2.6]
const CAMERA: V3 = [11.5, 4.4, 13.5]

/** 11-слайд: Чиксулуб соқтығысуы — астероидтың құлауы, жарқыл, соққы толқыны, жанартау. */
export default function ExtinctionScene() {
  const replay = useStage((s) => s.replay)
  const seenReplay = useRef(replay)
  const t0 = useRef<number | null>(null)

  const world = useRef<THREE.Group>(null)
  const asteroid = useRef<THREE.Group>(null)
  const trail = useRef<(THREE.Sprite | null)[]>([])
  const flash = useRef<THREE.Sprite>(null)
  const scar = useRef<THREE.Sprite>(null)
  const fireball = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const debris = useRef<THREE.InstancedMesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)

  const geo = useMemo(
    () => ({
      asteroid: rockGeo(71, '#3a2a22', 2),
      debris: rockGeo(72, '#2a1a12', 0),
      conifer: coniferGeo(0, 3),
      fern: fernGeo(4),
      rock: rockGeo(73, '#3a2c24', 1),
    }),
    [],
  )

  const items = useMemo(() => {
    const avoid = [
      { x: VOLCANO[0], z: VOLCANO[1], r: 5.2 },
      { x: IMPACT.x, z: IMPACT.z, r: 2.5 },
      { x: REX[0], z: REX[1], r: 2.6 },
    ]
    return {
      conifers: scatter({ count: 26, rMin: 4, rMax: 16.5, seed: 91, h, scale: [0.8, 1.5], avoid, open: toward(CAMERA), tilt: 0.1 }),
      ferns: scatter({ count: 60, rMin: 2.5, rMax: 16, seed: 92, h, scale: [0.5, 1.0], avoid }),
      rocks: scatter({ count: 36, rMin: 2, rMax: 17, seed: 93, h, scale: [0.15, 0.7], avoid, sink: -0.25 }),
    }
  }, [])

  // Жарылыстан ұшқан жыныс сынықтарының бастапқы жылдамдықтары
  const shards = useMemo(() => {
    const rnd = mulberry32(94)
    return Array.from({ length: DEBRIS }, () => {
      const a = rnd() * Math.PI * 2
      const tilt = 0.25 + rnd() * 0.85
      const speed = 4 + rnd() * 6.5
      return {
        v: new THREE.Vector3(Math.cos(a) * Math.sin(tilt) * speed, Math.cos(tilt) * speed, Math.sin(a) * Math.sin(tilt) * speed),
        size: 0.06 + rnd() * 0.16,
        spin: rnd() * 6,
      }
    })
  }, [])

  const tmp = useMemo(() => ({ o: new THREE.Object3D(), p: new THREE.Vector3() }), [])

  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    if (t0.current === null || seenReplay.current !== replay) {
      seenReplay.current = replay
      t0.current = now
    }
    const t = (now - t0.current) % CYCLE
    const flying = t < IMPACT_AT
    const a = t - IMPACT_AT // соқтығысудан кейін өткен уақыт
    const ease = (k: number) => k * k * (1.6 - 0.6 * k) // үдей түсетін қозғалыс

    // Астероид пен оның отты ізі
    if (asteroid.current) {
      asteroid.current.visible = flying
      asteroid.current.position.lerpVectors(START, IMPACT, ease(clamp01(t / IMPACT_AT)))
      asteroid.current.rotation.set(now * 1.3, now * 0.9, 0)
    }
    trail.current.forEach((s, i) => {
      if (!s) return
      const k = clamp01((t - i * 0.075) / IMPACT_AT)
      const fade = 1 - i / TRAIL
      s.visible = flying && k > 0
      s.position.lerpVectors(START, IMPACT, ease(k))
      s.scale.setScalar(0.9 + fade * 2.6)
      s.material.opacity = fade * 0.75
    })

    // Жарқыл, от шары, соққы толқыны
    const hit = a >= 0
    if (flash.current) {
      flash.current.visible = hit && a < 1.6
      flash.current.scale.setScalar(8 + a * 34)
      flash.current.material.opacity = Math.max(0, 1 - a / 1.6)
    }
    if (fireball.current) {
      const s = hit ? 0.6 + (1 - Math.exp(-a * 1.7)) * 3.8 : 0.001
      fireball.current.visible = hit && a < 5
      fireball.current.scale.set(s, s * 0.8, s)
      ;(fireball.current.material as THREE.MeshBasicMaterial).opacity = clamp01(1.1 - a / 4.6)
    }
    if (ring.current) {
      ring.current.visible = hit && a < 4
      ring.current.scale.setScalar(0.6 + a * 4.6)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - a / 4.4)
    }
    if (scar.current) {
      scar.current.visible = hit
      scar.current.material.opacity = hit ? 0.85 * Math.exp(-a * 0.32) * (1 - smoothstep(CYCLE - 1.5, CYCLE, t)) : 0
    }
    if (light.current) {
      light.current.position.copy(flying && asteroid.current ? asteroid.current.position : IMPACT)
      light.current.position.y += 0.8
      light.current.intensity = hit ? 2600 * Math.exp(-a * 1.5) + 60 * Math.exp(-a * 0.3) : 30 + 90 * clamp01(t / IMPACT_AT)
    }

    // Сынықтар: баллистикалық траектория
    const mesh = debris.current
    if (mesh) {
      const { o, p } = tmp
      for (let i = 0; i < DEBRIS; i++) {
        const sh = shards[i]
        p.copy(IMPACT).addScaledVector(sh.v, Math.max(a, 0))
        p.y += 0.5 * GRAVITY * a * a
        const alive = hit && p.y > -0.2
        o.position.copy(p)
        o.rotation.set(sh.spin + a * 3, sh.spin * 2 + a * 2, 0)
        o.scale.setScalar(alive ? sh.size : 0.0001)
        o.updateMatrix()
        mesh.setMatrixAt(i, o.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }

    // Жер сілкінісі мен шаңнан қараңғылану
    if (world.current) {
      const amp = hit ? 0.2 * Math.exp(-a * 1.9) : 0
      world.current.position.set(Math.sin(now * 53) * amp, Math.sin(now * 61) * amp, Math.sin(now * 47) * amp)
    }
    if (hemi.current) {
      const dusk = hit ? smoothstep(0.5, 4, a) * (1 - smoothstep(CYCLE - 1.5, CYCLE, t)) : 0
      hemi.current.intensity = THREE.MathUtils.lerp(0.75, 0.28, dusk)
    }
  })

  return (
    <>
      <SceneRig position={CAMERA} target={[0, 2.4, 0]} background={HORIZON} fog={0.022} autoRotate={0.1} polar={[0.85, 1.55]} />
      <SkyDome top="#090405" bottom={HORIZON} sun={[0.5, 0.35, -0.8]} sunColor="#ff9a5a" sunPower={0.5} />

      <hemisphereLight ref={hemi} args={['#ff9f70', '#1a0806', 0.75]} />
      <Sun position={[6, 10, 8]} color="#ffb48c" intensity={2.0} extent={18} />

      <group ref={world}>
        <Terrain spec={GROUND} h={h} />
        <Instanced geometry={geo.conifer} items={items.conifers} castShadow />
        <Instanced geometry={geo.fern} items={items.ferns} />
        <Instanced geometry={geo.rock} items={items.rocks} castShadow>
          <meshStandardMaterial vertexColors roughness={0.95} flatShading />
        </Instanced>

        <Volcano position={[VOLCANO[0], h(VOLCANO[0], VOLCANO[1]) - 0.2, VOLCANO[1]]} height={4.4} radius={3.9} />
        {/* Аспанға қараған тираннозавр */}
        <TRex position={[REX[0], h(REX[0], REX[1]), REX[1]]} rotation={[0, 0.75, 0]} scale={0.5} />

        {/* Соқтығысу орны */}
        <Glow ref={scar} color="#ff5a1f" scale={[9, 4]} opacity={0} position={[IMPACT.x, 0.5, IMPACT.z]} visible={false} />
        <mesh ref={ring} position={[IMPACT.x, 0.25, IMPACT.z]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.86, 1, 72]} />
          <meshBasicMaterial color="#ffd9a8" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh ref={fireball} position={IMPACT} visible={false}>
          <sphereGeometry args={[1, 28, 18]} />
          <meshBasicMaterial color="#ffb057" transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
        <instancedMesh ref={debris} args={[geo.debris, undefined, DEBRIS]} frustumCulled={false}>
          <meshStandardMaterial color="#2a1a12" emissive="#ff5a1f" emissiveIntensity={1.6} roughness={0.8} flatShading />
        </instancedMesh>
      </group>

      {/* Астероид */}
      <group ref={asteroid} position={START}>
        <mesh geometry={geo.asteroid} scale={0.62}>
          <meshStandardMaterial vertexColors roughness={0.9} emissive="#ff4a14" emissiveIntensity={0.9} flatShading />
        </mesh>
        <Glow color="#ffb057" scale={5} opacity={0.95} />
      </group>
      {Array.from({ length: TRAIL }, (_, i) => (
        <Glow
          key={i}
          ref={(el: THREE.Sprite | null) => {
            trail.current[i] = el
          }}
          color={i < 3 ? '#ffd08a' : '#ff5a1f'}
          position={START}
          opacity={0}
        />
      ))}
      <Glow ref={flash} color="#fff1d0" scale={8} opacity={0} position={[IMPACT.x, 1.5, IMPACT.z]} visible={false} />
      <pointLight ref={light} color="#ff8a4a" intensity={30} distance={60} decay={2} />

      {/* Аспаннан жауған күл */}
      <Particles count={760} box={[32, 12, 32]} position={[0, 5.5, 0]} color="#ffb08a" size={0.055} velocity={[0.3, -0.4, 0.12]} wobble={0.3} twinkle={0.5} opacity={0.7} seed={29} />
    </>
  )
}
