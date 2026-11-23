import * as THREE from 'three'
import type { V3 } from './geo'
import { clamp01, fbm, lerp, mulberry32, noise3, smoothstep } from './noise'

export interface TerrainSpec {
  radius: number
  /** Бедердің биіктік амплитудасы. */
  amp: number
  freq: number
  seed: number
  /** Ортадағы тегістеу алаңның радиусы (модельдер тұратын жер). */
  flat?: number
  /** Аласа → орташа → биік жерлердің түстері. */
  colors: [string, string, string]
  /** Шетінің тұманға «батып» кету тереңдігі. */
  sink?: number
}

export type HeightFn = (x: number, z: number) => number

export function heightFn(s: TerrainSpec): HeightFn {
  const ox = s.seed * 17.31
  const oz = s.seed * -9.73
  const sink = s.sink ?? s.radius * 0.2
  return (x, z) => {
    const r = Math.hypot(x, z)
    let h = (fbm(x * s.freq + ox, s.seed * 3.1, z * s.freq + oz, 4) - 0.5) * 2 * s.amp
    if (s.flat) h *= lerp(0.12, 1, smoothstep(s.flat * 0.5, s.flat * 1.8, r))
    const edge = smoothstep(s.radius * 0.8, s.radius, r)
    return h - edge * edge * sink
  }
}

/** Дөңгелек диорама табаны: полярлық тор + шу арқылы бедер + биіктікке қарай бояу. */
export function terrainGeo(s: TerrainSpec, h: HeightFn = heightFn(s)): THREE.BufferGeometry {
  const g = new THREE.RingGeometry(0.0001, s.radius, 96, 44)
  g.rotateX(-Math.PI / 2)
  const pos = g.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
  const [c0, c1, c2] = s.colors.map((c) => new THREE.Color(c))
  const c = new THREE.Color()
  const amp = s.amp || 1

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = h(x, z)
    pos.setY(i, y)
    const k = clamp01((y / amp) * 0.9 + 0.5) + (noise3(x * 0.9 + 3, 1.7, z * 0.9 - 5) - 0.5) * 0.4
    if (k < 0.5) c.copy(c0).lerp(c1, clamp01(k * 2))
    else c.copy(c1).lerp(c2, clamp01((k - 0.5) * 2))
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  g.deleteAttribute('uv')
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

/* ------------------------------------------------------------------ */
/*  Нысандарды жер бетіне шашу                                         */
/* ------------------------------------------------------------------ */

export interface Item {
  p: V3
  r?: V3
  s?: number | V3
}

export interface Sector {
  /** Сектор осінің бағыты (радиан, atan2(z, x)). */
  angle: number
  /** Жарты ені (радиан). */
  half: number
  /** Осы радиустан әрі қарай ғана әсер етеді. */
  from: number
}

/** Камера тұрған жаққа қараған сектор: камера маятник тәрізді тербелетін аймақты ашық қалдырады. */
export function toward(camera: V3, half = 1.05, from = 4.5): Sector {
  return { angle: Math.atan2(camera[2], camera[0]), half, from }
}

export interface ScatterSpec {
  count: number
  rMin?: number
  rMax: number
  seed: number
  h?: HeightFn
  scale?: [number, number]
  /** Бос қалдырылатын дөңгелек аймақтар. */
  avoid?: { x: number; z: number; r: number }[]
  /** Бос қалдырылатын сектор — камера жағы: ірі нысандар көріністі жаппауы үшін. */
  open?: Sector
  /** Тек осы биіктіктен жоғары жерлерге (мысалы, су деңгейінен жоғары). */
  minY?: number
  maxY?: number
  /** Жерге сәл батыру (масштабқа көбейтіледі). */
  sink?: number
  tilt?: number
}

export function scatter(o: ScatterSpec): Item[] {
  const rnd = mulberry32(o.seed)
  const rMin = o.rMin ?? 0
  const [s0, s1] = o.scale ?? [1, 1]
  const out: Item[] = []
  let guard = 0
  while (out.length < o.count && guard++ < o.count * 30) {
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(lerp(rMin * rMin, o.rMax * o.rMax, rnd()))
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const s = lerp(s0, s1, rnd())
    const yaw = rnd() * Math.PI * 2
    const tx = (rnd() - 0.5) * (o.tilt ?? 0)
    const tz = (rnd() - 0.5) * (o.tilt ?? 0)
    if (o.avoid?.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue
    if (o.open && r > o.open.from) {
      const d = a - o.open.angle
      if (Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < o.open.half) continue
    }
    const y = o.h ? o.h(x, z) : 0
    if (o.minY !== undefined && y < o.minY) continue
    if (o.maxY !== undefined && y > o.maxY) continue
    out.push({ p: [x, y - (o.sink ?? 0) * s, z], r: [tx, yaw, tz], s })
  }
  return out
}
