import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { REDUCED_MOTION } from '../fx'
import { useStage } from '../store/stage'
import { makeLiving, type Growth, type LivingUniforms } from './living'
import type { Item } from './terrain'

type Props = Omit<ThreeElements['instancedMesh'], 'args' | 'children'> & {
  geometry: THREE.BufferGeometry
  items: Item[]
  /** false болса, сапа төмендегенде де барлық дана салынады. */
  lod?: boolean
  /** Желмен тербелу амплитудасы (0 — қозғалыссыз). Биік ағашқа ≈0.012, шөп пен гүлге ≈0.07. */
  wind?: number
  /** Даналар орталықтан сыртқа қарай толқынмен бұрала өсіп шығады (гүлдің ашылуы, жапырақтың жайылуы). */
  grow?: Growth
  children?: ReactNode
}

const dummy = new THREE.Object3D()

/** Бір геометрияның көп данасы (орман, шөп, тастар). Сапа төмендесе, дана саны азаяды. */
export function Instanced({ geometry, items, lod = true, wind = 0, grow, children, ...props }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const quality = useStage((s) => s.quality)
  const living = wind > 0 || grow !== undefined
  const age = useRef(0)

  const uniforms = useMemo<LivingUniforms>(
    () => ({ uTime: { value: 0 }, uAge: { value: 0 }, uWind: { value: 0 }, uGrow: { value: new THREE.Vector4() } }),
    [],
  )
  uniforms.uWind.value = wind * (REDUCED_MOTION ? 0.25 : 1)
  // «Қозғалысты азайту» қосулы болса, өсу анимациясы өткізіліп, өсімдіктер бірден толық күйінде тұрады
  if (grow && !REDUCED_MOTION) uniforms.uGrow.value.set(grow.start ?? 0.4, grow.spread ?? 0.12, grow.time ?? 1.4, grow.twist ?? 2.4)
  else uniforms.uGrow.value.set(0, 0, 0, 0)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((item, i) => {
      dummy.position.set(...item.p)
      dummy.rotation.set(...(item.r ?? [0, 0, 0]))
      if (typeof item.s === 'number' || item.s === undefined) dummy.scale.setScalar(item.s ?? 1)
      else dummy.scale.set(...item.s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    mesh.count = lod ? Math.max(1, Math.ceil(items.length * quality)) : items.length
  }, [items.length, quality, lod])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (mesh && living) makeLiving(mesh.material as THREE.Material, uniforms)
  }, [living, uniforms])

  useFrame(({ clock }, dt) => {
    if (!living) return
    age.current += Math.min(dt, 0.05)
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uAge.value = age.current
  })

  if (items.length === 0) return null

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} {...props}>
      {children ?? <meshStandardMaterial vertexColors roughness={0.9} side={THREE.DoubleSide} />}
    </instancedMesh>
  )
}
