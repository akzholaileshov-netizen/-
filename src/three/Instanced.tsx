import type { ThreeElements } from '@react-three/fiber'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { useStage } from '../store/stage'
import type { Item } from './terrain'

type Props = Omit<ThreeElements['instancedMesh'], 'args' | 'children'> & {
  geometry: THREE.BufferGeometry
  items: Item[]
  /** false болса, сапа төмендегенде де барлық дана салынады. */
  lod?: boolean
  children?: ReactNode
}

const dummy = new THREE.Object3D()

/** Бір геометрияның көп данасы (орман, шөп, тастар). Сапа төмендесе, дана саны азаяды. */
export function Instanced({ geometry, items, lod = true, children, ...props }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const quality = useStage((s) => s.quality)

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

  if (items.length === 0) return null

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} {...props}>
      {children ?? <meshStandardMaterial vertexColors roughness={0.9} side={THREE.DoubleSide} />}
    </instancedMesh>
  )
}
