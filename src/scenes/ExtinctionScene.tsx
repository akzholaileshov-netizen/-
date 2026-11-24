import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ambience } from '../audio/ambience'
import { REDUCED_MOTION, fx, resetFx } from '../fx'
import { useStage } from '../store/stage'
import { Glow, SkyDome, Sun } from '../three/Atmos'
import { TRex } from '../three/Dinosaurs'
import { Instanced } from '../three/Instanced'
import { Terrain } from '../three/Kit'
import { Motes } from '../three/Motes'
import { clamp01, mulberry32, smoothstep } from '../three/noise'
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

/*
 * Анимация кестесі (секунд, сахна ашылған немесе «қайта көрсету» басылған сәттен).
 * Бір рет ойналады: астероид ұшып келеді → соқтығысу (жарқыл, соққы толқыны, сілкініс) → қараңғылық пен тыныштық.
 */
const FLY_FROM = 0.9
const IMPACT_AT = 5.4
/** Соқтығысудан кейін аспанның күл басып қараңғылануы: [басы, соңы]. */
const DUSK: [number, number] = [0.9, 7.5]
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

/**
 * Жарылыс материалы: камераға қараған бетіне байланысты жарқырайтын мөлдір шар.
 * rim = false — ортасы ақ-сары, шеті қызғылт жұмсақ от шары; rim = true — тек жиегі көрінетін соққы күмбезі.
 */
function blastMaterial(rim: boolean) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: rim ? THREE.DoubleSide : THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vPos;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        vPos = position;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vPos;
      void main() {
        float f = abs(dot(normalize(vNormal), normalize(vView)));
        ${
          rim
            ? `float a = pow(1.0 - f, 2.6);
               vec3 col = vec3(1.0, 0.74, 0.5);`
            : `float boil = 0.82 + 0.18 * sin(vPos.x * 7.0 + uTime * 3.1) * sin(vPos.y * 6.0 - uTime * 2.3) * sin(vPos.z * 8.0 + uTime * 1.7);
               float a = smoothstep(0.0, 0.75, f) * boil;
               vec3 col = mix(vec3(1.0, 0.3, 0.06), vec3(1.0, 0.92, 0.66), pow(f, 2.2));`
        }
        gl_FragColor = vec4(col, a * uOpacity);
      }
    `,
  })
}

const FOG_DAY = new THREE.Color(HORIZON)
const FOG_NIGHT = new THREE.Color('#120706')

/**
 * 11-слайд: Чиксулуб соқтығысуы.
 * Астероид отты із қалдырып ұшып келеді → жерге соғылған сәтте экран ақ-қызыл жарқылға толып, сілкінеді,
 * соққы толқыны кескінді сындырып тарайды → аспанды күл басып, сахна қараңғы тыныштыққа батады.
 * Тізбек бір рет ойналады; «Соқтығысуды қайта көрсету» түймесі оны басынан бастайды.
 */
export default function ExtinctionScene() {
  const replay = useStage((s) => s.replay)
  const seenReplay = useRef(replay)
  const scene = useThree((s) => s.scene)
  const age = useRef(0)
  const struck = useRef(false)
  const fogBase = useRef<number | null>(null)
  /** Күл мен шоқтың қоюлығы (Motes осыдан оқиды). */
  const ashLevel = useRef(0.3)
  const emberLevel = useRef(0)

  const world = useRef<THREE.Group>(null)
  const asteroid = useRef<THREE.Group>(null)
  const trail = useRef<(THREE.Sprite | null)[]>([])
  const flash = useRef<THREE.Sprite>(null)
  const scar = useRef<THREE.Sprite>(null)
  const fireball = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const dustRing = useRef<THREE.Mesh>(null)
  const dome = useRef<THREE.Mesh>(null)
  const pall = useRef<THREE.Mesh>(null)
  const debris = useRef<THREE.InstancedMesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)

  // Сахнадан шыққанда экрандық әсерлер (жарқыл, сілкініс) қалып қоймасын
  useEffect(() => () => resetFx(), [])

  const mats = useMemo(() => ({ fireball: blastMaterial(false), dome: blastMaterial(true) }), [])
  useEffect(
    () => () => {
      mats.fireball.dispose()
      mats.dome.dispose()
    },
    [mats],
  )

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

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime
    if (seenReplay.current !== replay) {
      seenReplay.current = replay
      age.current = 0
      struck.current = false
    }
    age.current += Math.min(delta, 0.05)
    const t = age.current
    const flying = t < IMPACT_AT
    const a = t - IMPACT_AT // соқтығысудан кейін өткен уақыт
    const hit = a >= 0
    const approach = clamp01((t - FLY_FROM) / (IMPACT_AT - FLY_FROM))
    const ease = (k: number) => k * k * (1.6 - 0.6 * k) // үдей түсетін қозғалыс

    // Соқтығысу сәті: дыбыс (қосулы болса) бір рет ойналады
    if (hit && !struck.current) {
      struck.current = true
      ambience.impact(11)
    }

    // Экрандық әсерлер: жарқыл (ақ → қызыл), сілкініс, кескінді сындыратын соққы толқыны
    fx.flash = hit ? Math.exp(-a * 1.05) : 0
    fx.shake = REDUCED_MOTION ? 0 : hit ? Math.exp(-a * 0.85) * (a < 6 ? 1 : 0) : 0.07 * approach * approach
    fx.shockAt.copy(IMPACT)
    fx.shock = hit && a < 1.9 ? a / 1.9 : -1

    // Астероид пен оның отты ізі
    if (asteroid.current) {
      asteroid.current.visible = flying && t > FLY_FROM
      asteroid.current.position.lerpVectors(START, IMPACT, ease(approach))
      asteroid.current.rotation.set(now * 1.3, now * 0.9, 0)
      asteroid.current.scale.setScalar(1 + approach * 0.5)
    }
    trail.current.forEach((s, i) => {
      if (!s) return
      const k = clamp01((t - FLY_FROM - i * 0.075) / (IMPACT_AT - FLY_FROM))
      const fade = 1 - i / TRAIL
      s.visible = flying && k > 0
      s.position.lerpVectors(START, IMPACT, ease(k))
      s.scale.setScalar(0.9 + fade * 2.6)
      s.material.opacity = fade * 0.75
    })

    // Жарқыл, от шары, соққы толқыны
    if (flash.current) {
      flash.current.visible = hit && a < 1.6
      flash.current.scale.setScalar(8 + a * 34)
      flash.current.material.opacity = Math.max(0, 1 - a / 1.6)
    }
    if (fireball.current) {
      const s = hit ? 0.6 + (1 - Math.exp(-a * 1.7)) * 3.8 : 0.001
      fireball.current.visible = hit && a < 5
      fireball.current.scale.set(s, s * 0.8, s)
      mats.fireball.uniforms.uOpacity.value = clamp01(1.1 - a / 4.6)
      mats.fireball.uniforms.uTime.value = now
    }
    if (ring.current) {
      // Жер бетімен тараған от сақинасы
      ring.current.visible = hit && a < 3.2
      ring.current.scale.setScalar(0.6 + a * 9.5)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - a / 3.2)
    }
    if (dustRing.current) {
      // Оның соңынан баяу жылжитын шаң толқыны
      dustRing.current.visible = hit && a < 6
      dustRing.current.scale.setScalar(0.5 + a * 4.2)
      ;(dustRing.current.material as THREE.MeshBasicMaterial).opacity = hit ? 0.5 * clamp01(a * 3) * clamp01(1 - a / 6) : 0
    }
    if (dome.current) {
      // Ауадағы соққы күмбезі
      const s = 1 + a * 12
      dome.current.visible = hit && a < 2.4
      dome.current.scale.setScalar(s)
      mats.dome.uniforms.uOpacity.value = hit ? 0.9 * clamp01(1 - a / 2.4) ** 2 : 0
    }
    if (scar.current) {
      // Кратердің шоғы: ұзақ уақыт бойы баяу жыпылықтап жатады
      scar.current.visible = hit
      scar.current.material.opacity = hit ? 0.85 * Math.exp(-a * 0.32) + 0.16 * (0.75 + 0.25 * Math.sin(now * 1.7)) : 0
    }
    if (light.current) {
      light.current.position.copy(flying && asteroid.current ? asteroid.current.position : IMPACT)
      light.current.position.y += 0.8
      light.current.intensity = hit ? 2600 * Math.exp(-a * 1.5) + 60 * Math.exp(-a * 0.3) + 9 : 30 + 190 * approach * approach
    }

    // Тыныштық: аспанды күл басады, күн көмескіленеді, тұман қоюланады
    const dusk = hit ? smoothstep(DUSK[0], DUSK[1], a) : 0
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(0.75, 0.24, dusk)
    if (sun.current) sun.current.intensity = THREE.MathUtils.lerp(2.0, 0.3, dusk)
    if (pall.current) (pall.current.material as THREE.MeshBasicMaterial).opacity = dusk * 0.72
    const fog = scene.fog as THREE.FogExp2 | null
    if (fog) {
      fogBase.current ??= fog.density
      fog.density = fogBase.current * (1 + dusk * 1.1)
      fog.color.copy(FOG_DAY).lerp(FOG_NIGHT, dusk)
    }
    ashLevel.current = 0.3 + 0.7 * (hit ? smoothstep(0.6, 5, a) : 0)
    emberLevel.current = hit ? smoothstep(0.1, 0.9, a) * (0.25 + 0.75 * Math.exp(-a * 0.22)) : 0

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

    // Жердің өзі де дірілдейді (камера сілкінісіне қосымша)
    if (world.current) {
      const amp = hit && !REDUCED_MOTION ? 0.16 * Math.exp(-a * 1.6) : 0
      world.current.position.set(Math.sin(now * 53) * amp, Math.sin(now * 61) * amp, Math.sin(now * 47) * amp)
    }
  })

  return (
    <>
      <SceneRig position={CAMERA} target={[0, 2.4, 0]} background={HORIZON} fog={0.022} autoRotate={0.1} polar={[0.85, 1.55]} />
      <SkyDome top="#090405" bottom={HORIZON} sun={[0.5, 0.35, -0.8]} sunColor="#ff9a5a" sunPower={0.5} />
      {/* Күл пердесі: соқтығысудан кейін аспанды біртіндеп жабады */}
      <mesh ref={pall} renderOrder={-9} frustumCulled={false}>
        <sphereGeometry args={[120, 24, 12]} />
        <meshBasicMaterial color="#070304" transparent opacity={0} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>

      <hemisphereLight ref={hemi} args={['#ff9f70', '#1a0806', 0.75]} />
      <Sun ref={sun} position={[6, 10, 8]} color="#ffb48c" intensity={2.0} extent={18} />

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
        <mesh ref={dustRing} position={[IMPACT.x, 0.4, IMPACT.z]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.62, 1, 72]} />
          <meshBasicMaterial color="#7a5a48" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh ref={dome} position={IMPACT} visible={false} material={mats.dome}>
          <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh ref={fireball} position={IMPACT} visible={false} material={mats.fireball}>
          <sphereGeometry args={[1, 32, 20]} />
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

      {/* Аспаннан жауған күл: соқтығысудан кейін қоюлана түседі */}
      <Motes count={900} box={[32, 12, 32]} position={[0, 5.5, 0]} color="#8f7f78" color2="#d8c4b4" size={0.075} velocity={[0.3, -0.55, 0.12]} wobble={0.35} twinkle={0.25} opacity={0.75} blending="normal" level={ashLevel} seed={29} />
      {/* Жарылыстан шашыраған шоқтар */}
      <Motes kind="spark" count={420} box={[26, 10, 26]} position={[IMPACT.x, 5, IMPACT.z]} color="#ff7a2a" color2="#ffd08a" size={0.055} velocity={[0.5, 0.9, 0.2]} level={emberLevel} seed={30} />
    </>
  )
}
