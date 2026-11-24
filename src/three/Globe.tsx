import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { REDUCED_MOTION } from '../fx'
import { fbm, smoothstep } from './noise'
import { pangeaColor, pangeaField, type RGB } from './pangea'

export const GLOBE_RADIUS = 2.4

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

// Текстуралар бір-ақ рет жасалады: 1-слайд пен 12-слайд ортақ қолданады
let cache: { map: THREE.CanvasTexture; clouds: THREE.CanvasTexture } | null = null
const textures = () => (cache ??= { map: makeEarthTexture(), clouds: makeCloudTexture() })

const ATMOSPHERE_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

/** Сыртқы қабық: планетаның жиегінен сыртқа тараған шұғыла. */
const HALO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  varying vec3 vNormal;
  void main() {
    float rim = pow(max(0.0, 0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.2);
    gl_FragColor = vec4(uColor, 1.0) * rim * uPower;
  }
`

/** Ішкі қабық: планета дискісінің жиегіндегі жұқа ауа қабаты (френель). */
const LIMB_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.0);
    gl_FragColor = vec4(uColor, 1.0) * f * uPower;
  }
`

/** Жарқыраған, баяу «тыныстайтын» атмосфера. Сахна ашылғанда жарқ етіп тұтанады да, бірте-бірте тынышталады. */
function Atmosphere({ color }: { color: string }) {
  const age = useRef(0)
  const [halo, limb] = useMemo(() => {
    const make = (fragmentShader: string, side: THREE.Side) =>
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERT,
        fragmentShader,
        uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: 1 } },
        side,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    return [make(HALO_FRAG, THREE.BackSide), make(LIMB_FRAG, THREE.FrontSide)]
  }, [color])

  useFrame(({ clock }, dt) => {
    age.current += Math.min(dt, 0.05)
    const t = clock.elapsedTime
    const breath = REDUCED_MOTION ? 0 : Math.sin(t * 0.8) * 0.16 + Math.sin(t * 2.3) * 0.04
    // Тұтану: алғашқы секундтарда шұғыла әлдеқайда жарық (Bloom оны одан әрі күшейтеді)
    const ignite = REDUCED_MOTION ? 0 : 2.4 * Math.exp(-age.current * 0.9)
    halo.uniforms.uPower.value = 1.5 * (1 + breath) + ignite
    limb.uniforms.uPower.value = 0.75 * (1 + breath * 0.6) + ignite * 0.5
  })

  return (
    <>
      <mesh material={halo} scale={1.14}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 48]} />
      </mesh>
      <mesh material={limb} scale={1.022}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 48]} />
      </mesh>
    </>
  )
}

interface GlobeProps {
  /** Айналу жылдамдығының көбейткіші. */
  speed?: number
  atmosphere?: string
}

/** Пангея заманындағы Жер: осінен айналады, бұлттары сәл жылдамырақ жылжиды, атмосферасы жарқырайды. */
export function Globe({ speed = 1, atmosphere = '#4fb8c4' }: GlobeProps) {
  const earth = useRef<THREE.Mesh>(null)
  const clouds = useRef<THREE.Mesh>(null)
  const tex = useMemo(textures, [])

  useFrame((_, dt) => {
    if (earth.current) earth.current.rotation.y += dt * 0.055 * speed
    if (clouds.current) clouds.current.rotation.y += dt * 0.075 * speed
  })

  return (
    // Жер осінің көлбеулігі ≈ 23,4°
    <group rotation={[0, 0, 0.41]}>
      {/* Бастапқы бұрыш: Пангея камераға қарап тұрады */}
      <mesh ref={earth} rotation={[0, -Math.PI / 2 - 0.35, 0]}>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 64]} />
        <meshStandardMaterial map={tex.map} roughness={0.82} metalness={0.04} />
      </mesh>
      <mesh ref={clouds}>
        <sphereGeometry args={[GLOBE_RADIUS * 1.014, 64, 48]} />
        <meshStandardMaterial color="#ffffff" alphaMap={tex.clouds} transparent opacity={0.42} depthWrite={false} roughness={1} />
      </mesh>
      <Atmosphere color={atmosphere} />
    </group>
  )
}
