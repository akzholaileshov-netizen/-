import type { ThreeElements } from '@react-three/fiber'
import { useMemo, type Ref } from 'react'
import * as THREE from 'three'
import { IS_TOUCH, useStage } from '../store/stage'
import type { V3 } from './geo'

/* ------------------------------------------------------------------ */
/*  Аспан күмбезі: көкжиектен зенитке градиент + күн шапағы            */
/* ------------------------------------------------------------------ */

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SKY_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunPower;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float h = smoothstep(-0.12, 0.8, dir.y);
    vec3 c = mix(uBottom, uTop, pow(h, 0.65));
    float s = max(dot(dir, uSunDir), 0.0);
    c += uSunColor * (pow(s, 350.0) * 3.0 + pow(s, 24.0) * 0.5 + pow(s, 4.0) * 0.18) * uSunPower;
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

interface SkyDomeProps {
  top: string
  /** Көкжиек түсі — тұман түсімен бірдей болса, жер шеті аспанмен біте қайнасады. */
  bottom: string
  sun?: V3
  sunColor?: string
  sunPower?: number
}

export function SkyDome({ top, bottom, sun = [0, 1, 0], sunColor = '#ffffff', sunPower = 0 }: SkyDomeProps) {
  const [sx, sy, sz] = sun
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uBottom: { value: new THREE.Color(bottom) },
          uSunDir: { value: new THREE.Vector3(sx, sy, sz).normalize() },
          uSunColor: { value: new THREE.Color(sunColor) },
          uSunPower: { value: sunPower },
        },
      }),
    [top, bottom, sx, sy, sz, sunColor, sunPower],
  )
  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[140, 32, 16]} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/*  Жұмсақ жарық дақ (лава шұғыласы, тұман, күн)                       */
/* ------------------------------------------------------------------ */

let glowTexture: THREE.CanvasTexture | null = null

function getGlowTexture() {
  if (!glowTexture) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.2, 'rgba(255,255,255,0.62)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.17)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    glowTexture = new THREE.CanvasTexture(canvas)
    glowTexture.colorSpace = THREE.SRGBColorSpace
  }
  return glowTexture
}

type GlowProps = Omit<ThreeElements['sprite'], 'scale'> & {
  color: string
  scale?: number | [number, number]
  opacity?: number
  /** false — кәдімгі мөлдірлік (қою тұман, түтін үшін). */
  additive?: boolean
}

export function Glow({ color, scale = 1, opacity = 1, additive = true, ...props }: GlowProps) {
  const [sx, sy] = typeof scale === 'number' ? [scale, scale] : scale
  return (
    <sprite scale={[sx, sy, 1]} dispose={null} {...props}>
      <spriteMaterial
        map={getGlowTexture()}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        fog={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </sprite>
  )
}

/* ------------------------------------------------------------------ */
/*  Негізгі бағытталған жарық + көлеңке                                */
/* ------------------------------------------------------------------ */

const SHADOW_SIZE = IS_TOUCH ? 1024 : 2048

interface SunProps {
  position: V3
  color?: string
  intensity?: number
  /** Көлеңке камерасының жартылай өлшемі. */
  extent?: number
  ref?: Ref<THREE.DirectionalLight>
}

export function Sun({ position, color = '#ffffff', intensity = 2.5, extent = 13, ref }: SunProps) {
  const shadows = useStage((s) => s.quality > 0.4)
  return (
    <directionalLight
      ref={ref}
      position={position}
      color={color}
      intensity={intensity}
      castShadow={shadows}
      shadow-mapSize={[SHADOW_SIZE, SHADOW_SIZE]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.05}
    >
      <orthographicCamera attach="shadow-camera" args={[-extent, extent, extent, -extent, 0.5, 80]} />
    </directionalLight>
  )
}
