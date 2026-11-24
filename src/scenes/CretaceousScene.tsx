import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SkyDome, Sun } from '../three/Atmos'
import { Triceratops } from '../three/Dinosaurs'
import { Instanced } from '../three/Instanced'
import { Terrain } from '../three/Kit'
import { Motes } from '../three/Motes'
import { broadleafGeo, cycadGeo, fernGeo, flowerGeo } from '../three/plants'
import { SceneRig } from '../three/SceneRig'
import type { V3 } from '../three/geo'
import { heightFn, scatter, toward, type TerrainSpec } from '../three/terrain'

const HORIZON = '#b9793c'
/** Таяз теңіз (лагуна) деңгейі: бор кезеңінде теңіз деңгейі жоғары болған. */
const SEA = -0.2

const GROUND: TerrainSpec = {
  radius: 17,
  amp: 0.8,
  freq: 0.17,
  seed: 21,
  flat: 5,
  colors: ['#a08e58', '#4f7f38', '#8aa24c'],
}
const h = heightFn(GROUND)
const CLEARING = [{ x: 0, z: 0, r: 3.4 }]
const CAMERA: V3 = [9.5, 3.2, 11.5]
/** Гүлдердің ашылуы: камера қонған соң басталады, орталықтан сыртқа қарай толқынмен тарайды. */
const BLOOM = { start: 1.1, spread: 0.2, time: 1.7, twist: 3.4 }

/** 6-слайд: бор кезеңінің гүлді алқабы, лагуна және трицератопс — гүлдер ашылады, көбелектер ұшады. */
export default function CretaceousScene() {
  const water = useRef<THREE.Mesh>(null)
  const geo = useMemo(
    () => ({
      flowerA: flowerGeo(4, '#f8ecd6', '#f1a8a0'),
      flowerB: flowerGeo(8, '#fff3c4', '#f0c060'),
      tree: broadleafGeo(7),
      cycad: cycadGeo(3),
      fern: fernGeo(2),
    }),
    [],
  )

  const items = useMemo(() => {
    const dry = SEA + 0.12
    return {
      flowersA: scatter({ count: 230, rMin: 1.8, rMax: 15, seed: 41, h, scale: [0.6, 1.15], minY: dry, tilt: 0.25 }),
      flowersB: scatter({ count: 150, rMin: 2.2, rMax: 15, seed: 42, h, scale: [0.5, 0.95], minY: dry, tilt: 0.25 }),
      trees: scatter({ count: 16, rMin: 5.5, rMax: 15, seed: 43, h, scale: [0.9, 1.7], minY: dry + 0.05, avoid: CLEARING, open: toward(CAMERA) }),
      cycads: scatter({ count: 9, rMin: 4.5, rMax: 13, seed: 44, h, scale: [0.7, 1.1], minY: dry, avoid: CLEARING }),
      ferns: scatter({ count: 60, rMin: 3, rMax: 15, seed: 45, h, scale: [0.5, 1.0], minY: dry }),
    }
  }, [])

  useFrame(({ clock }) => {
    if (water.current) water.current.position.y = SEA + Math.sin(clock.elapsedTime * 0.6) * 0.015
  })

  return (
    <>
      <SceneRig position={CAMERA} target={[0, 1.2, 0]} background={HORIZON} fog={0.026} autoRotate={0.28} />
      <SkyDome top="#141f1c" bottom={HORIZON} sun={[-0.6, 0.2, -0.75]} sunColor="#ffd9a0" sunPower={1.4} />

      <hemisphereLight args={['#ffe6c0', '#2a3a1c', 0.85]} />
      <Sun position={[-9, 9, 7]} color="#ffdcae" intensity={3.2} extent={16} />

      <Terrain spec={GROUND} h={h} />

      <mesh ref={water} position={[0, SEA, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[GROUND.radius, 64]} />
        <meshStandardMaterial color="#2c8f8c" transparent opacity={0.72} roughness={0.1} metalness={0.25} />
      </mesh>

      {/* Алғашқы гүлдер: алаңқайдың ортасынан шетіне қарай толқынмен бұрала ашылады (scale + rotate), кейін желмен тербеледі */}
      <Instanced geometry={geo.flowerA} items={items.flowersA} wind={0.075} grow={BLOOM} />
      <Instanced geometry={geo.flowerB} items={items.flowersB} wind={0.075} grow={{ ...BLOOM, start: BLOOM.start + 0.5, twist: -BLOOM.twist }} />
      <Instanced geometry={geo.tree} items={items.trees} castShadow receiveShadow lod={false} wind={0.02}>
        <meshStandardMaterial vertexColors roughness={0.9} flatShading />
      </Instanced>
      <Instanced geometry={geo.cycad} items={items.cycads} castShadow wind={0.04} />
      <Instanced geometry={geo.fern} items={items.ferns} wind={0.07} />

      <Triceratops position={[0.2, h(0, 0), 0]} rotation={[0, 0.6, 0]} scale={0.74} />

      {/* Гүлден гүлге қонған көбелектер мен желмен ұшқан күлтелер */}
      <Motes kind="butterfly" count={56} box={[19, 2.2, 19]} position={[0, 1.5, 0]} color="#ffd24a" color2="#ff7fa8" size={0.3} velocity={[0.22, 0, 0.1]} seed={16} />
      <Motes kind="butterfly" count={22} box={[12, 1.6, 12]} position={[0, 1.2, 0]} color="#fff6e0" color2="#9fd8ff" size={0.24} velocity={[-0.14, 0, 0.18]} seed={17} />
      <Motes kind="petal" count={150} box={[24, 6, 24]} position={[0, 2.8, 0]} color="#fbe9dc" color2="#f3a9b5" velocity={[0.35, -0.3, 0.12]} seed={18} />

      {/* Гүл тозаңы */}
      <Motes count={420} box={[26, 7, 26]} position={[0, 3, 0]} color="#ffe7a0" size={0.055} velocity={[0.15, 0.04, 0.08]} wobble={0.35} twinkle={0.8} opacity={0.8} seed={14} />
    </>
  )
}
