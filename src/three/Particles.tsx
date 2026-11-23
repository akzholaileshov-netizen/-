import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useStage } from '../store/stage'
import type { V3 } from './geo'
import { mulberry32 } from './noise'

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uResY;
  uniform vec3 uBox;
  uniform vec3 uVel;
  uniform float uWobble;
  uniform float uTwinkle;
  attribute float aSeed;
  varying float vAlpha;

  void main() {
    // Қорап ішінде шексіз қозғалыс: шеттен шыққан бөлшек қарсы беттен қайта кіреді
    vec3 p = position + uVel * uTime;
    p = mod(p + uBox * 0.5, uBox) - uBox * 0.5;
    p.x += sin(uTime * 0.7 + aSeed * 31.0) * uWobble;
    p.y += sin(uTime * 0.5 + aSeed * 17.0) * uWobble * 0.6;
    p.z += cos(uTime * 0.6 + aSeed * 23.0) * uWobble;

    vec3 e = abs(p) / (uBox * 0.5);
    float edge = (1.0 - smoothstep(0.75, 1.0, e.x)) * (1.0 - smoothstep(0.75, 1.0, e.y)) * (1.0 - smoothstep(0.75, 1.0, e.z));
    float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 60.0));
    vAlpha = edge * tw;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.45 + aSeed) * projectionMatrix[1][1] * uResY * 0.5 / max(-mv.z, 0.1);
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vAlpha * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

interface ParticlesProps {
  /** Ең жоғары сапа деңгейіндегі бөлшектер саны. */
  count: number
  /** Бөлшектер қозғалатын қораптың өлшемі. */
  box: V3
  position?: V3
  color: string
  /** Бөлшектің шамамен диаметрі (сахна бірлігімен). */
  size?: number
  velocity?: V3
  wobble?: number
  twinkle?: number
  opacity?: number
  blending?: 'add' | 'normal'
  seed?: number
}

/**
 * GPU-да анимацияланатын бөлшектер (шаң, тозаң, ұшқын, көпіршік, күл).
 * FPS төмендесе, drawRange арқылы салынатын бөлшектер саны азайтылады.
 */
export function Particles({
  count,
  box,
  position = [0, 0, 0],
  color,
  size = 0.06,
  velocity = [0, 0, 0],
  wobble = 0.15,
  twinkle = 0.6,
  opacity = 0.8,
  blending = 'add',
  seed = 1,
}: ParticlesProps) {
  const quality = useStage((s) => s.quality)
  const [bx, by, bz] = box
  const [vx, vy, vz] = velocity

  const geometry = useMemo(() => {
    const rnd = mulberry32(seed * 7919)
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rnd() - 0.5) * bx
      positions[i * 3 + 1] = (rnd() - 0.5) * by
      positions[i * 3 + 2] = (rnd() - 0.5) * bz
      seeds[i] = rnd()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.hypot(bx, by, bz) * 0.5 + 1)
    return g
  }, [count, bx, by, bz, seed])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: 0.06 },
          uResY: { value: 800 },
          uBox: { value: new THREE.Vector3(1, 1, 1) },
          uVel: { value: new THREE.Vector3() },
          uWobble: { value: 0 },
          uTwinkle: { value: 0 },
          uColor: { value: new THREE.Color() },
          uOpacity: { value: 1 },
        },
      }),
    [],
  )

  useEffect(() => {
    const u = material.uniforms
    u.uSize.value = size
    u.uBox.value.set(bx, by, bz)
    u.uVel.value.set(vx, vy, vz)
    u.uWobble.value = wobble
    u.uTwinkle.value = twinkle
    u.uColor.value.set(color)
    u.uOpacity.value = opacity
    material.blending = blending === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending
    material.needsUpdate = true
  }, [material, size, bx, by, bz, vx, vy, vz, wobble, twinkle, color, opacity, blending])

  useEffect(() => {
    geometry.setDrawRange(0, Math.max(1, Math.ceil(count * quality)))
  }, [geometry, count, quality])

  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uResY.value = state.gl.domElement.height
  })

  return <points geometry={geometry} material={material} position={position} />
}
