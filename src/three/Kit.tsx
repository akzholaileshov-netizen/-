import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import type { V3 } from './geo'
import { heightFn, terrainGeo, type HeightFn, type TerrainSpec } from './terrain'

/* ---------- 3D кеңістіктегі жазу ---------- */

interface LabelProps {
  position?: V3
  tone?: 'sand' | 'lava' | 'jungle'
  children: ReactNode
}

/** <Swap> ішіндегі жазулар тек белсенді нысанда көрінуі үшін (drei <Html> ата-топтың visible қасиетін ескермейді). */
const Shown = createContext(true)

export function Label({ position, tone = 'sand', children }: LabelProps) {
  const shown = useContext(Shown)
  if (!shown) return null
  return (
    <Html position={position} center pointerEvents="none" zIndexRange={[4, 0]}>
      <div className="scene-label" data-tone={tone}>
        {children}
      </div>
    </Html>
  )
}

/* ---------- Диораманың жер бедері ---------- */

type TerrainProps = Omit<ThreeElements['mesh'], 'geometry'> & {
  spec: TerrainSpec
  h?: HeightFn
  roughness?: number
}

export function Terrain({ spec, h, roughness = 0.95, ...props }: TerrainProps) {
  const geometry = useMemo(() => terrainGeo(spec, h ?? heightFn(spec)), [spec, h])
  return (
    <mesh geometry={geometry} receiveShadow {...props}>
      <meshStandardMaterial vertexColors roughness={roughness} metalness={0} />
    </mesh>
  )
}

/* ---------- Нысандарды алмастыру («түрлендіру») ---------- */

interface SwapProps {
  active: boolean
  children: ReactNode
}

/**
 * Таңдалған модель бұрала үлкейіп шығады, қалғандары кішірейіп жоғалады.
 * 7-слайдта динозаврларды, 9-слайдта өсімдіктерді алмастыруға қолданылады.
 */
export function Swap({ active, children }: SwapProps) {
  const ref = useRef<THREE.Group>(null)
  const k = useRef(active ? 1 : 0)

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    k.current = THREE.MathUtils.damp(k.current, active ? 1 : 0, active ? 4.5 : 9, Math.min(dt, 0.05))
    const s = k.current
    g.visible = s > 0.012
    g.scale.setScalar(Math.max(s, 0.001))
    g.rotation.y = (1 - s) * -1.9
    g.position.y = (1 - s) * -0.4
  })

  return (
    <group ref={ref} visible={active} scale={active ? 1 : 0.001}>
      <Shown.Provider value={active}>{children}</Shown.Provider>
    </group>
  )
}
