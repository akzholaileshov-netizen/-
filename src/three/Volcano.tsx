import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Glow } from './Atmos'
import { merge, paint, tube, type V3 } from './geo'
import { fbm, lerp, mulberry32 } from './noise'
import { Motes } from './Motes'

type GroupProps = ThreeElements['group']

const SMOKE_PUFFS = 9

/** Жанартау: айналу денесі + шу, лава ағындары, түтін шарлары мен ұшқындар. */
export function Volcano({ height = 3.4, radius = 3.2, ...props }: GroupProps & { height?: number; radius?: number }) {
  const light = useRef<THREE.PointLight>(null)
  const lava = useRef<THREE.MeshStandardMaterial>(null)
  const puffs = useRef<(THREE.Mesh | null)[]>([])

  const { cone, streams, puffGeo, seeds } = useMemo(() => {
    const h = height
    const R = radius
    const rim = R * 0.2
    // Сыртқы беткейдің профилі (радиус, биіктік), төменнен жоғары
    const slope: [number, number][] = [
      [R, 0],
      [R * 0.74, h * 0.2],
      [R * 0.47, h * 0.5],
      [rim * 1.65, h * 0.82],
      [rim, h],
    ]
    const profile = [[R * 1.3, -0.4] as [number, number], ...slope, [rim * 0.72, h * 0.91] as [number, number], [0.001, h * 0.86] as [number, number]]
    const lathe = new THREE.LatheGeometry(
      profile.map(([x, y]) => new THREE.Vector2(x, y)),
      30,
    )
    const pos = lathe.getAttribute('position')
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const k = 1 + (fbm(v.x * 0.9 + 4, v.y * 0.9, v.z * 0.9 - 2, 3) - 0.5) * 0.22
      pos.setXYZ(i, v.x * k, v.y, v.z * k)
    }
    const low = new THREE.Color('#3a2c24')
    const high = new THREE.Color('#15100e')
    const rnd = mulberry32(31)
    let shade = 0
    const flat = lathe.toNonIndexed()
    paint(flat, (p, c, i) => {
      if (i % 3 === 0) shade = (rnd() - 0.5) * 0.06
      c.copy(low)
        .lerp(high, Math.min(1, Math.max(0, p.y / h)))
        .offsetHSL(0, 0, shade)
    })

    const radiusAt = (y: number) => {
      for (let i = 0; i < slope.length - 1; i++) {
        const [r0, y0] = slope[i]
        const [r1, y1] = slope[i + 1]
        if (y >= y0 && y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0))
      }
      return rim
    }
    const streamGeos = [0.4, 2.3, 4.1, 5.4].map((angle, s) => {
      const pts: V3[] = []
      const radii: number[] = []
      const steps = 9
      const bottom = h * (0.12 + (s % 2) * 0.2)
      for (let i = 0; i <= steps; i++) {
        const k = i / steps
        const y = lerp(h * 0.99, bottom, k)
        const a = angle + Math.sin(k * 5 + s) * 0.14
        const r = radiusAt(y) * 1.04 + 0.03
        pts.push([Math.cos(a) * r, y, Math.sin(a) * r])
        radii.push(lerp(0.16, 0.09, k) * (i === steps ? 0.3 : 1))
      }
      return tube({ points: pts, radii, radial: 7, sy: 1, sx: 1 })
    })

    const smokeSeeds = Array.from({ length: SMOKE_PUFFS }, (_, i) => ({
      offset: i / SMOKE_PUFFS,
      drift: (rnd() - 0.5) * 1.6,
      spin: rnd() * 6,
    }))
    return {
      cone: merge([flat], true),
      streams: merge(streamGeos),
      puffGeo: new THREE.IcosahedronGeometry(1, 1),
      seeds: smokeSeeds,
    }
  }, [height, radius])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.3) + 0.1 * Math.sin(t * 7.1)
    if (light.current) light.current.intensity = 60 * pulse
    if (lava.current) lava.current.emissiveIntensity = 2.4 * pulse
    puffs.current.forEach((m, i) => {
      if (!m) return
      const s = seeds[i]
      const age = (t * 0.07 + s.offset) % 1
      m.position.set(s.drift * age * 2.2 + age * age * 2.5, height * 0.95 + age * 7.5, s.drift * age * 0.8)
      m.scale.setScalar(0.35 + age * 2.1)
      m.rotation.set(s.spin + t * 0.1, s.spin * 2 + t * 0.07, 0)
      ;(m.material as THREE.MeshStandardMaterial).opacity = Math.sin(Math.min(1, age * 1.15) * Math.PI) * 0.75
    })
  })

  return (
    <group {...props}>
      <mesh geometry={cone} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* Лава: кратер көлі мен беткейдегі ағындар */}
      <mesh geometry={streams}>
        <meshStandardMaterial ref={lava} color="#ff6a2a" emissive="#ff3a0c" emissiveIntensity={2.4} roughness={0.55} toneMapped={false} />
      </mesh>
      <mesh position={[0, height * 0.93, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.17, 20]} />
        <meshBasicMaterial color="#ffb347" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, height + 0.6, 0]} color="#ff5a1f" intensity={60} distance={22} decay={2} />
      <Glow color="#ff5a1f" scale={radius * 2.2} opacity={0.75} position={[0, height + 0.3, 0]} />

      {/* Түтін */}
      {seeds.map((_, i) => (
        <mesh
          key={i}
          geometry={puffGeo}
          ref={(el) => {
            puffs.current[i] = el
          }}
        >
          <meshStandardMaterial color="#3b312c" roughness={1} flatShading transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {/* Кратерден атқылаған ұшқындар мен желмен ұшқан күл */}
      <Motes
        kind="spark"
        count={170}
        box={[radius * 0.9, 6, radius * 0.9]}
        position={[0, height + 2.6, 0]}
        color="#ff8a3a"
        color2="#ffd890"
        size={0.07}
        velocity={[0.1, 1.3, 0]}
        wobble={0.25}
        seed={41}
      />
      <Motes kind="ash" count={120} box={[radius * 3, 7, radius * 3]} position={[radius * 0.6, height + 1.5, 0]} color="#5a4c44" color2="#2c2420" velocity={[0.5, -0.25, 0.1]} seed={42} />
    </group>
  )
}
