import { useFrame } from '@react-three/fiber'
import { useEffect, useImperativeHandle, useMemo, useRef, type Ref } from 'react'
import * as THREE from 'three'
import type { V3 } from './geo'

/* ------------------------------------------------------------------ */
/*  Шағылысатын су беті                                                */
/* ------------------------------------------------------------------ */

const WATER_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vWave;

  void main() {
    vec3 p = position;
    float a = p.x * 0.9 + uTime * 1.1;
    float b = p.z * 1.1 + uTime * 1.4;
    float c = (p.x + p.z) * 2.3 + uTime * 2.0;
    p.y = sin(a) * 0.06 + cos(b) * 0.05 + sin(c) * 0.015;
    // Толқынның аналитикалық еңісі — нормаль осыдан шығады
    vWave = vec3(cos(a) * 0.054 + cos(c) * 0.0345, 0.0, -sin(b) * 0.055 + cos(c) * 0.0345);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const WATER_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uWater;
  varying vec3 vWorld;
  varying vec3 vWave;

  void main() {
    // Ұсақ жыбыр толқындар: нормальді сәл тербетіп, жарық жолағын «сындырады»
    vec2 q = vWorld.xz;
    vec3 ripple = vec3(
      sin(q.x * 7.0 + uTime * 2.3) + sin(q.y * 5.3 - uTime * 1.7) + sin((q.x - q.y) * 11.0 + uTime * 3.1) * 0.5,
      0.0,
      cos(q.y * 6.1 + uTime * 2.1) + cos(q.x * 4.7 + uTime * 1.3) + cos((q.x + q.y) * 9.0 - uTime * 2.7) * 0.5
    ) * 0.045;
    vec3 n = normalize(vec3(-vWave.x, 1.0, -vWave.z) + ripple);
    vec3 view = normalize(cameraPosition - vWorld);

    vec3 color;
    float alpha;
    if (view.y >= 0.0) {
      // Судың үстінен: қиғаш қараған сайын аспан көбірек шағылысады (Френель)
      float fres = 0.05 + 0.95 * pow(1.0 - max(dot(n, view), 0.0), 4.0);
      vec3 r = reflect(-view, n);
      r.y = abs(r.y);
      float h = smoothstep(-0.12, 0.8, r.y);
      vec3 sky = mix(uBottom, uTop, pow(h, 0.65)) * 1.5;
      float s = max(dot(r, uSunDir), 0.0);
      // Күннің судағы жолағы мен жылт еткен ұшқындары
      vec3 sun = uSunColor * (pow(s, 420.0) * 9.0 + pow(s, 60.0) * 1.1 + pow(s, 8.0) * 0.22);
      color = mix(uWater, sky, fres) + sun;
      alpha = clamp(mix(0.42, 0.94, fres) + dot(sun, vec3(0.33)), 0.0, 1.0);
    } else {
      // Су астынан: бет жарық өткізген жыбырлаған «терезе» болып көрінеді
      float caustic = pow(0.5 + 0.5 * sin(q.x * 3.1 + sin(q.y * 2.3 + uTime * 0.9) * 1.6 + uTime * 1.2), 3.0)
                    * (0.5 + 0.5 * sin(q.y * 2.7 - uTime * 1.1 + sin(q.x * 1.9) * 1.4));
      color = mix(uWater * 1.25, vec3(0.72, 0.95, 1.0), caustic * 0.75);
      alpha = 0.4 + caustic * 0.35;
    }
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

interface WaterSurfaceProps {
  radius: number
  /** Шағылысатын аспанның түстері мен күні — сахнадағы SkyDome-мен бірдей болуы керек. */
  top: string
  bottom: string
  sun: V3
  sunColor?: string
  color?: string
}

/**
 * Су беті: толқын GPU-да есептеледі, беті аспан мен күнді шағылыстырады (Френель + күн жолағы).
 * Нақты айналық рендер жоқ — аспан түсі формуламен алынады, сондықтан әлсіз құрылғыда да арзан.
 */
export function WaterSurface({ radius, top, bottom, sun, sunColor = '#ffffff', color = '#1f8e96' }: WaterSurfaceProps) {
  const [sx, sy, sz] = sun
  const geometry = useMemo(() => {
    const g = new THREE.RingGeometry(0.001, radius, 96, 28)
    g.rotateX(-Math.PI / 2)
    return g
  }, [radius])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: WATER_VERT,
        fragmentShader: WATER_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uTop: { value: new THREE.Color(top) },
          uBottom: { value: new THREE.Color(bottom) },
          uSunDir: { value: new THREE.Vector3(sx, sy, sz).normalize() },
          uSunColor: { value: new THREE.Color(sunColor) },
          uWater: { value: new THREE.Color(color) },
        },
      }),
    [top, bottom, sx, sy, sz, sunColor, color],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })

  return <mesh geometry={geometry} material={material} renderOrder={2} />
}

/* ------------------------------------------------------------------ */
/*  Шашыранды: су бетіндегі шеңбер толқындар мен тамшылар              */
/* ------------------------------------------------------------------ */

export interface SplashHandle {
  /** Су бетінде кеңейіп, сөнетін шеңбер толқын. */
  ripple: (x: number, z: number, size?: number) => void
  /** Шашыраған тамшылар шоғы + шеңбер толқындар. */
  burst: (x: number, z: number, power?: number) => void
}

const RINGS = 16
const DROPS = 72
const dummy = new THREE.Object3D()

interface Ring {
  age: number
  life: number
  size: number
}

interface Drop {
  life: number
  p: THREE.Vector3
  v: THREE.Vector3
}

/** Шағын пул: жаңа нысан жасалмайды, ескі шеңберлер мен тамшылар қайта қолданылады. */
export function Splashes({ ref, level = 0.03 }: { ref?: Ref<SplashHandle>; level?: number }) {
  const rings = useRef<(THREE.Mesh | null)[]>([])
  const drops = useRef<THREE.InstancedMesh>(null)
  const state = useMemo(
    () => ({
      rings: Array.from({ length: RINGS }, (): Ring => ({ age: 1, life: 1, size: 1 })),
      drops: Array.from({ length: DROPS }, (): Drop => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() })),
      ring: 0,
      drop: 0,
    }),
    [],
  )

  useImperativeHandle(ref, () => {
    const ripple = (x: number, z: number, size = 1) => {
      const i = state.ring++ % RINGS
      const r = state.rings[i]
      r.age = 0
      r.life = 1.4 + size * 0.5
      r.size = size
      rings.current[i]?.position.set(x, level, z)
    }
    return {
      ripple,
      burst: (x, z, power = 1) => {
        ripple(x, z, 1.1 * power)
        ripple(x, z, 0.6 * power)
        const n = Math.round(22 * power)
        for (let k = 0; k < n; k++) {
          const d = state.drops[state.drop++ % DROPS]
          const a = Math.random() * Math.PI * 2
          const out = (0.4 + Math.random() * 1.5) * power
          d.life = 0.9 + Math.random() * 0.6
          d.p.set(x + Math.cos(a) * 0.15, level, z + Math.sin(a) * 0.15)
          d.v.set(Math.cos(a) * out, (2.2 + Math.random() * 2.6) * power, Math.sin(a) * out)
        }
      },
    }
  }, [state, level])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    state.rings.forEach((r, i) => {
      const mesh = rings.current[i]
      if (!mesh) return
      r.age += dt
      const u = r.age / r.life
      mesh.visible = u < 1
      if (u >= 1) return
      mesh.scale.setScalar(r.size * (0.25 + 2.4 * Math.sqrt(u)))
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - u) * (1 - u)
    })

    const mesh = drops.current
    if (!mesh) return
    state.drops.forEach((d, i) => {
      if (d.life > 0) {
        d.life -= dt
        d.v.y -= 9.5 * dt
        d.p.addScaledVector(d.v, dt)
        if (d.p.y < level - 0.05) d.life = 0
      }
      dummy.position.copy(d.p)
      dummy.scale.setScalar(d.life > 0 ? 0.035 + Math.min(d.life, 0.5) * 0.06 : 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      {state.rings.map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
          renderOrder={3}
          ref={(el) => {
            rings.current[i] = el
          }}
        >
          <ringGeometry args={[0.86, 1, 48]} />
          <meshBasicMaterial color="#e2fbff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <instancedMesh ref={drops} args={[undefined, undefined, DROPS]} frustumCulled={false} renderOrder={3}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#e6fbff" transparent opacity={0.85} />
      </instancedMesh>
    </>
  )
}
