import { Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { REDUCED_MOTION } from '../fx'
import { useStage } from '../store/stage'
import { ramp, useAge } from '../three/anim'
import { Glow } from '../three/Atmos'
import { Globe } from '../three/Globe'
import { Motes } from '../three/Motes'
import { SceneRig } from '../three/SceneRig'

/** Камераның баяу алыстауы: қашықтық көбейткіші және ұзақтығы (секунд). */
const PULL_BACK = { from: 0.6, to: 2.2, seconds: 44 }

/**
 * 12-слайд: қорытынды кадр. Камера Жердің дәл қасынан басталып, баяу алыстай береді —
 * алдымен глобус кадрға тұтас сыяды, сосын Ай орбитасы мен жұлдызды аспан ашылады (фильмнің соңғы кадры сияқты).
 */
export default function FinaleScene() {
  const quality = useStage((s) => s.quality)
  const moon = useRef<THREE.Group>(null)
  const sun = useRef<THREE.Sprite>(null)
  const nebula = useRef(0)
  const age = useAge(60)

  useFrame(({ clock }, dt) => {
    if (moon.current) moon.current.rotation.y += dt * 0.1
    // Алыстаған сайын ғарыш «ашыла» түседі: тұмандық пен күн шұғыласы біртіндеп көрінеді
    const open = ramp(age.current, 2, 26)
    nebula.current = open
    if (sun.current) sun.current.material.opacity = (0.35 + 0.4 * open) * (1 + Math.sin(clock.elapsedTime * 1.3) * 0.04)
  })

  return (
    <>
      <SceneRig
        position={[0, 1.6, 12]}
        background="#020607"
        autoRotate={0.16}
        azimuth={0.5}
        polar={[0.75, 2.2]}
        zoom={[0.7, 1.4]}
        dolly={REDUCED_MOTION ? { from: 1.5, to: 1.5, seconds: 1 } : PULL_BACK}
      />

      <ambientLight intensity={0.1} color="#9fd8c4" />
      <directionalLight position={[-6, 2.5, 5]} intensity={3.2} color="#fff1d6" />
      <directionalLight position={[6, -2, -5]} intensity={0.8} color="#4fa0c8" />

      <Stars radius={130} depth={60} count={Math.round(5200 * quality)} factor={6.5} saturation={0.15} fade speed={REDUCED_MOTION ? 0 : 0.5} />

      {/* Алыстағы Күн мен оның шұғыласы */}
      <group position={[-30, 9, -46]}>
        <Glow color="#ffb070" scale={46} opacity={0.2} />
        <Glow ref={sun} color="#fff3d8" scale={9} opacity={0.35} />
      </group>

      <Globe speed={0.8} atmosphere="#6fc8d8" />

      {/* Ай орбитасы */}
      <group rotation={[0.18, 0, 0.08]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5.6, 0.008, 6, 180]} />
          <meshBasicMaterial color="#e2c07a" transparent opacity={0.3} />
        </mesh>
        <group ref={moon} rotation={[0, 2.2, 0]}>
          <mesh position={[5.6, 0, 0]}>
            <icosahedronGeometry args={[0.3, 2]} />
            <meshStandardMaterial color="#bdb5a8" roughness={1} flatShading />
          </mesh>
        </group>
      </group>

      {/* Ғарыш тұмандығы: камера алыстағанда фонда баяу жылжыған бұлыңғыр жолақ */}
      <Motes kind="fog" count={16} box={[130, 26, 40]} position={[0, 4, -62]} color="#3b5fa8" color2="#a8527a" size={34} opacity={0.06} velocity={[0.25, 0, 0]} level={nebula} seed={41} />
      <Motes count={520} box={[34, 20, 34]} color="#e9cf96" size={0.05} wobble={0.3} twinkle={0.9} opacity={0.7} velocity={[0.03, 0.02, 0]} seed={31} />
    </>
  )
}
