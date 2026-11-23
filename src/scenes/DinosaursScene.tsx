import { useMemo } from 'react'
import * as THREE from 'three'
import { useStage } from '../store/stage'
import { Glow, Sun } from '../three/Atmos'
import { Diplodocus, Human, TRex, Triceratops } from '../three/Dinosaurs'
import { merge, paint } from '../three/geo'
import { Label, Swap } from '../three/Kit'
import { fbm, mulberry32 } from '../three/noise'
import { Particles } from '../three/Particles'
import { SceneRig } from '../three/SceneRig'

const PLATFORM = 5.7

/**
 * Модельдің масштабы және 1,8 м адамның сол масштабтағы биіктігі.
 * Мысалы: тираннозавр моделі 6.8 бірлік ≈ 12 м → 1 бірлік ≈ 1.76 м.
 */
const SHOWCASE = [
  { scale: 0.78, offset: 0.2, human: (1.8 / (12 / 6.8)) * 0.78 },
  { scale: 0.56, offset: 0.45, human: (1.8 / (25 / 12.8)) * 0.56 },
  { scale: 0.92, offset: 0.17, human: (1.8 / (8.5 / 6.04)) * 0.92 },
]

function platformGeo() {
  const g = new THREE.CylinderGeometry(PLATFORM, PLATFORM * 1.08, 0.9, 56, 2)
  g.translate(0, -0.45, 0)
  const pos = g.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    if (Math.hypot(x, z) < 0.01 || y > -0.01) continue
    const k = 1 + (fbm(x * 0.6, y * 2, z * 0.6, 3) - 0.5) * 0.16
    pos.setXYZ(i, x * k, y, z * k)
  }
  const base = new THREE.Color('#241c17')
  const rnd = mulberry32(5)
  let shade = 0
  const flat = g.toNonIndexed()
  paint(flat, (_p, c, i) => {
    if (i % 3 === 0) shade = (rnd() - 0.5) * 0.05
    c.copy(base).offsetHSL(0, 0, shade)
  })
  return merge([flat], true)
}

/** Масштабты көрсететін адам сұлбасы мен жазуы. */
function ScaleHuman({ height }: { height: number }) {
  return (
    <group position={[1.1, 0, 2.5]}>
      <Human height={height} rotation={[0, -0.5, 0]} />
      <Label position={[0, height + 0.32, 0]}>Адам · 1,8 м</Label>
    </group>
  )
}

/** 7-слайд: үш динозаврдың көрме алаңы; панельдегі тезисті таңдағанда модель алмасады. */
export default function DinosaursScene() {
  const focus = useStage((s) => s.focus)
  const platform = useMemo(platformGeo, [])
  const [trex, diplo, trike] = SHOWCASE

  return (
    <>
      <SceneRig position={[7.3, 2.9, 9.1]} target={[0, 1.55, 0]} background="#070504" fog={0.02} autoRotate={0.45} azimuth={Infinity} polar={[0.8, 1.55]} />

      <hemisphereLight args={['#8fd8b0', '#1a0d08', 0.5]} />
      <Sun position={[5, 11, 6]} color="#fff0d8" intensity={2.7} extent={9} />
      <directionalLight position={[-6, 4, -7]} color="#ff5a2e" intensity={2.0} />

      <mesh geometry={platform} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      {[PLATFORM * 0.93, PLATFORM * 0.66].map((r, i) => (
        <mesh key={r} position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, i === 0 ? 0.022 : 0.01, 6, 160]} />
          <meshStandardMaterial color="#e2c07a" emissive="#c79a45" emissiveIntensity={i === 0 ? 1.4 : 0.7} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      {/* Алаңның астындағы лава шұғыласы */}
      <Glow color="#ff4d2e" scale={[30, 12]} opacity={0.42} position={[0, -4.4, 0]} />
      <pointLight position={[0, -3, 0]} color="#ff4d2e" intensity={50} distance={14} />

      <Swap active={focus === 0}>
        <TRex position={[trex.offset, 0, 0]} scale={trex.scale} />
        <ScaleHuman height={trex.human} />
      </Swap>
      <Swap active={focus === 1}>
        <Diplodocus position={[diplo.offset, 0, 0]} scale={diplo.scale} />
        <ScaleHuman height={diplo.human} />
      </Swap>
      <Swap active={focus === 2}>
        <Triceratops position={[trike.offset, 0, 0]} scale={trike.scale} />
        <ScaleHuman height={trike.human} />
      </Swap>

      <Particles count={300} box={[18, 9, 18]} position={[0, 3.2, 0]} color="#ff8a4a" size={0.05} velocity={[0.02, 0.28, 0]} wobble={0.3} twinkle={0.7} seed={17} />
    </>
  )
}
