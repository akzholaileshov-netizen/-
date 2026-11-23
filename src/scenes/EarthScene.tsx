import { Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStage } from '../store/stage'
import { fbm, smoothstep } from '../three/noise'
import { pangeaColor, pangeaField, type RGB } from '../three/pangea'
import { Particles } from '../three/Particles'
import { SceneRig } from '../three/SceneRig'

const RADIUS = 2.4

/** Пангея заманындағы Жердің процедуралық картасы (эквидистантты проекция). */
function makeEarthTexture(w = 1024, h = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(w, h)
  const rgb: RGB = [0, 0, 0]
  for (let y = 0; y < h; y++) {
    const lat = Math.PI / 2 - ((y + 0.5) / h) * Math.PI
    const cl = Math.cos(lat)
    const sl = Math.sin(lat)
    for (let x = 0; x < w; x++) {
      const lon = ((x + 0.5) / w) * Math.PI * 2 - Math.PI
      // Шу сфера бетіндегі 3D-нүктеден алынады — картаның жігі білінбейді
      pangeaColor(pangeaField(lon * 3.3, lat * 3.7), cl * Math.cos(lon) * 2.2, sl * 2.2, cl * Math.sin(lon) * 2.2, rgb)
      const i = (y * w + x) * 4
      image.data[i] = rgb[0]
      image.data[i + 1] = rgb[1]
      image.data[i + 2] = rgb[2]
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function makeCloudTexture(w = 512, h = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    const lat = Math.PI / 2 - ((y + 0.5) / h) * Math.PI
    const cl = Math.cos(lat)
    const sl = Math.sin(lat)
    for (let x = 0; x < w; x++) {
      const lon = ((x + 0.5) / w) * Math.PI * 2
      const n = fbm(cl * Math.cos(lon) * 1.7 + 9, sl * 3.4, cl * Math.sin(lon) * 1.7 - 3, 5)
      const v = Math.round(smoothstep(0.5, 0.72, n) * 255)
      const i = (y * w + x) * 4
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return new THREE.CanvasTexture(canvas)
}

const ATMOSPHERE_VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ATMOSPHERE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormal;
  void main() {
    float rim = pow(max(0.0, 0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.2);
    gl_FragColor = vec4(uColor, 1.0) * rim * 1.25;
  }
`

function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERT,
        fragmentShader: ATMOSPHERE_FRAG,
        uniforms: { uColor: { value: new THREE.Color('#4fb8c4') } },
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )
  return (
    <mesh material={material} scale={1.13}>
      <sphereGeometry args={[RADIUS, 64, 48]} />
    </mesh>
  )
}

/** 1-слайд: баяу айналатын Жер глобусы, бұлттар, атмосфера шұғыласы, Ай және жұлдыздар. */
export default function EarthScene() {
  const quality = useStage((s) => s.quality)
  const earth = useRef<THREE.Mesh>(null)
  const clouds = useRef<THREE.Mesh>(null)
  const moon = useRef<THREE.Group>(null)
  const textures = useMemo(() => ({ map: makeEarthTexture(), clouds: makeCloudTexture() }), [])

  useFrame((_, dt) => {
    if (earth.current) earth.current.rotation.y += dt * 0.055
    if (clouds.current) clouds.current.rotation.y += dt * 0.075
    if (moon.current) moon.current.rotation.y += dt * 0.12
  })

  return (
    <>
      <SceneRig position={[0, 1.6, 12]} background="#020807" autoRotate={0.22} azimuth={0.6} polar={[0.75, 2.2]} zoom={[0.7, 1.4]} />

      <ambientLight intensity={0.1} color="#9fd8c4" />
      <directionalLight position={[6, 3, 5]} intensity={3.4} color="#fff1d6" />
      <directionalLight position={[-6, -2, -5]} intensity={0.9} color="#ff5a2e" />

      <Stars radius={110} depth={50} count={Math.round(3800 * quality)} factor={4.5} saturation={0} fade speed={0.6} />

      {/* Жер осінің көлбеулігі ≈ 23,4° */}
      <group rotation={[0, 0, 0.41]}>
        {/* Бастапқы бұрыш: Пангея камераға қарап тұрады */}
        <mesh ref={earth} rotation={[0, -Math.PI / 2 - 0.35, 0]}>
          <sphereGeometry args={[RADIUS, 96, 64]} />
          <meshStandardMaterial map={textures.map} roughness={0.82} metalness={0.04} />
        </mesh>
        <mesh ref={clouds}>
          <sphereGeometry args={[RADIUS * 1.014, 64, 48]} />
          <meshStandardMaterial color="#ffffff" alphaMap={textures.clouds} transparent opacity={0.42} depthWrite={false} roughness={1} />
        </mesh>
        <Atmosphere />
      </group>

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

      <Particles count={420} box={[18, 10, 18]} color="#e9cf96" size={0.045} wobble={0.3} twinkle={0.9} opacity={0.7} velocity={[0.03, 0.02, 0]} seed={3} />
    </>
  )
}
