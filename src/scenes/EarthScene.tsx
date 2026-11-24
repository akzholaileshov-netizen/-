import { Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { REDUCED_MOTION } from '../fx'
import { useStage } from '../store/stage'
import { Glow } from '../three/Atmos'
import { Globe } from '../three/Globe'
import { Motes } from '../three/Motes'
import { SceneRig } from '../three/SceneRig'

/**
 * Планетаның жиегінен көтерілген күн: сахна ашылғанда жарқ етіп шығады да (тақырып осы жарықтың ішінен пайда болады),
 * кейін жұмсақ шұғылаға айналып, баяу жыпылықтап тұрады. Жердің артында тұрғандықтан жартысын глобус жауып тұрады.
 */
function Sunrise() {
  const core = useRef<THREE.Sprite>(null)
  const halo = useRef<THREE.Sprite>(null)
  const age = useRef(0)

  useFrame(({ clock }, dt) => {
    age.current += Math.min(dt, 0.05)
    const a = age.current
    const burst = REDUCED_MOTION ? 0 : Math.exp(-Math.max(0, a - 0.3) * 0.7)
    const rise = Math.min(1, a / 0.9)
    const flicker = 1 + Math.sin(clock.elapsedTime * 1.7) * 0.05
    if (core.current) {
      core.current.material.opacity = rise * (0.75 + burst * 0.25)
      core.current.scale.setScalar((2.6 + burst * 3.4) * flicker)
    }
    if (halo.current) {
      halo.current.material.opacity = rise * (0.22 + burst * 0.5)
      halo.current.scale.setScalar(11 + burst * 12)
    }
  })

  return (
    <group position={[2.35, 1.5, -2.6]}>
      <Glow ref={halo} color="#ffb070" scale={11} opacity={0} />
      <Glow ref={core} color="#fff3d8" scale={2.6} opacity={0} />
    </group>
  )
}

/** 1-слайд: баяу айналатын Жер глобусы, бұлттар, жарқыраған атмосфера, көтерілген күн, Ай және жұлдыздар. */
export default function EarthScene() {
  const quality = useStage((s) => s.quality)
  const moon = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
    if (moon.current) moon.current.rotation.y += dt * 0.12
  })

  return (
    <>
      <SceneRig position={[0, 1.6, 12]} background="#020807" autoRotate={0.22} azimuth={0.6} polar={[0.75, 2.2]} zoom={[0.7, 1.4]} />

      <ambientLight intensity={0.1} color="#9fd8c4" />
      <directionalLight position={[6, 3, 5]} intensity={3.4} color="#fff1d6" />
      <directionalLight position={[-6, -2, -5]} intensity={0.9} color="#ff5a2e" />

      <Stars radius={110} depth={50} count={Math.round(3800 * quality)} factor={4.5} saturation={0} fade speed={REDUCED_MOTION ? 0 : 0.6} />

      <Sunrise />
      <Globe />

      {/* Ай орбитасы */}
      <group rotation={[0.18, 0, 0.08]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5.6, 0.006, 6, 180]} />
          <meshBasicMaterial color="#e2c07a" transparent opacity={0.28} />
        </mesh>
        <group ref={moon}>
          <mesh position={[5.6, 0, 0]}>
            <icosahedronGeometry args={[0.3, 2]} />
            <meshStandardMaterial color="#bdb5a8" roughness={1} flatShading />
          </mesh>
        </group>
      </group>

      <Motes count={420} box={[18, 10, 18]} color="#e9cf96" size={0.045} wobble={0.3} twinkle={0.9} opacity={0.7} velocity={[0.03, 0.02, 0]} seed={3} />
    </>
  )
}
