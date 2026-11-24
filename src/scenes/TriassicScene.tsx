import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type * as THREE from 'three'
import { fx } from '../fx'
import { Glow, SkyDome, Sun } from '../three/Atmos'
import { Eoraptor } from '../three/Dinosaurs'
import { Instanced } from '../three/Instanced'
import { Terrain } from '../three/Kit'
import { Motes } from '../three/Motes'
import { cycadGeo, fernGeo, horsetailGeo, rockGeo } from '../three/plants'
import { SceneRig } from '../three/SceneRig'
import type { V3 } from '../three/geo'
import { heightFn, scatter, toward, type Item, type TerrainSpec } from '../three/terrain'

const HORIZON = '#7a2f14'

const GROUND: TerrainSpec = {
  radius: 17,
  amp: 1.0,
  freq: 0.16,
  seed: 4,
  flat: 4.5,
  colors: ['#5e2814', '#a2562a', '#dba05c'],
}
const h = heightFn(GROUND)
const CLEARING = [{ x: 0, z: 0, r: 3.2 }]
const CAMERA: V3 = [9.5, 3.4, 11.5]

/** 4-слайд: триастың ыстық, құрғақ шөлі — қызыл жартастар, сирек өсімдік, алғашқы динозаврлар, аптап ауаның дірілі. */
export default function TriassicScene() {
  const mirage = useRef<THREE.Group>(null)
  const geo = useMemo(
    () => ({
      mesa: rockGeo(11, '#8f4a28', 2),
      rock: rockGeo(12, '#7d4b30', 1),
      horsetail: horsetailGeo(),
      cycad: cycadGeo(5),
      fern: fernGeo(6),
    }),
    [],
  )

  const items = useMemo(() => {
    // Биік жартастар: тасты тігінен созып, жерге сәл батырамыз
    const mesas: Item[] = scatter({ count: 10, rMin: 6.5, rMax: 14, seed: 21, h, scale: [1.4, 3.0], avoid: CLEARING, open: toward(CAMERA) }).map((it) => {
      const s = it.s as number
      return { ...it, p: [it.p[0], it.p[1] + s * 0.5, it.p[2]], s: [s, s * 1.7, s * 0.9] }
    })
    return {
      mesas,
      rocks: scatter({ count: 46, rMin: 2.5, rMax: 15, seed: 22, h, scale: [0.12, 0.5], sink: -0.3 }),
      horsetails: scatter({ count: 34, rMin: 3.4, rMax: 12, seed: 23, h, scale: [0.6, 1.2], avoid: CLEARING, tilt: 0.2 }),
      cycads: scatter({ count: 6, rMin: 4.5, rMax: 11, seed: 24, h, scale: [0.8, 1.3], avoid: CLEARING, open: toward(CAMERA, 0.9, 6) }),
      ferns: scatter({ count: 16, rMin: 3.5, rMax: 12, seed: 25, h, scale: [0.5, 0.9], avoid: CLEARING }),
    }
  }, [])

  // Ыстық ауаның дірілі (heat distortion): бүкіл кадр көтерілген ыстық толқындармен тербеледі (CinematicEffect)
  useEffect(() => {
    fx.haze = 1
    return () => {
      fx.haze = 0
    }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Аптап «тыныстайды»: діріл бірде күшейіп, бірде бәсеңдейді
    fx.haze = 0.8 + 0.2 * Math.sin(t * 0.5)
    mirage.current?.children.forEach((child, i) => {
      const sprite = child as THREE.Sprite
      sprite.material.opacity = (i === 0 ? 0.2 : 0.16) * (0.65 + 0.35 * Math.sin(t * 1.3 + i * 2.1))
    })
  })

  return (
    <>
      <SceneRig position={CAMERA} target={[0, 1.1, 0]} background={HORIZON} fog={0.028} autoRotate={0.28} />
      <SkyDome top="#170a0c" bottom={HORIZON} sun={[-0.55, 0.28, -0.75]} sunColor="#ffb066" sunPower={1.3} />

      <hemisphereLight args={['#ffb890', '#3a140a', 0.75]} />
      <Sun position={[-8, 10, 6]} color="#ffc48a" intensity={3.1} extent={16} />
      <Glow color="#ff8a3d" scale={34} opacity={0.5} position={[-44, 20, -60]} />

      <Terrain spec={GROUND} h={h} />

      <Instanced geometry={geo.mesa} items={items.mesas} castShadow receiveShadow lod={false}>
        <meshStandardMaterial vertexColors roughness={0.95} flatShading />
      </Instanced>
      <Instanced geometry={geo.rock} items={items.rocks} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} flatShading />
      </Instanced>
      {/* Сирек өсімдік ыстық желмен сәл тербеледі */}
      <Instanced geometry={geo.horsetail} items={items.horsetails} castShadow wind={0.05} />
      <Instanced geometry={geo.cycad} items={items.cycads} castShadow lod={false} wind={0.035} />
      <Instanced geometry={geo.fern} items={items.ferns} castShadow wind={0.06} />

      {/* Эорапторлар — ең ерте динозаврлардың бірі */}
      <Eoraptor position={[0.4, h(0.4, 0.6), 0.6]} rotation={[0, 0.5, 0]} scale={0.66} />
      <Eoraptor position={[-1.7, h(-1.7, -1.0), -1.0]} rotation={[0, -0.9, 0]} scale={0.52} />
      <Eoraptor position={[2.2, h(2.2, -1.9), -1.9]} rotation={[0, 2.4, 0]} scale={0.46} />

      {/* Күн астындағы сағым: көкжиек тұсындағы жылт еткен жолақтар */}
      <group ref={mirage}>
        <Glow color="#ffd9a8" scale={[46, 2.4]} opacity={0.2} position={[-30, 1.2, -44]} />
        <Glow color="#ffc48a" scale={[30, 1.6]} opacity={0.16} position={[-8, 0.9, -40]} />
      </group>

      {/* Желмен ұшқан шаң, жер бауырлап жүгірген құм және шаң шұбатылған тұман */}
      <Motes count={620} box={[30, 7, 30]} position={[0, 3, 0]} color="#ffcf9a" size={0.055} velocity={[0.5, 0.03, 0.16]} wobble={0.2} opacity={0.55} twinkle={0.4} seed={9} />
      <Motes kind="spark" count={260} box={[28, 0.9, 28]} position={[0, 0.55, 0]} color="#f2b878" color2="#ffe2b0" size={0.03} velocity={[2.6, 0.02, 0.8]} wobble={0.1} twinkle={0.3} opacity={0.5} blending="normal" seed={10} />
      <Motes kind="fog" count={14} box={[30, 2, 30]} position={[0, 1.2, 0]} color="#e0905a" size={9} velocity={[0.45, 0, 0.14]} opacity={0.055} seed={11} />
    </>
  )
}
