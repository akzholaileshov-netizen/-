import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { smoothstep } from './noise'

export type V3 = [number, number, number]

/* ------------------------------------------------------------------ */
/*  Айнымалы радиусты «түтік»: дене, мойын, құйрық, аяқ, мүйіз…        */
/* ------------------------------------------------------------------ */

export interface TubeSpec {
  /** Омыртқа қисығының тірек нүктелері. */
  points: V3[]
  /** Әр тірек нүктедегі радиус. */
  radii: number[]
  segments?: number
  radial?: number
  /** Көлденең қиманың ені (бинормаль бойынша) мен биіктігінің (нормаль бойынша) көбейткіштері. */
  sx?: number
  sy?: number
  color?: THREE.ColorRepresentation
  /** Астыңғы жақтың (құрсақтың) түсі. */
  belly?: THREE.ColorRepresentation
  /** Арқадағы көлденең жолақтар. */
  stripe?: THREE.ColorRepresentation
  stripes?: number
  /** Бастапқы нормальдың бағыты (әдепкіде +Y). */
  up?: V3
}

/**
 * Catmull-Rom қисығы бойымен созылған, радиусы біртіндеп өзгеретін жабық дене.
 * Нормальдар аналитикалық түрде есептеледі, сондықтан жігі білінбейді.
 */
export function tube(spec: TubeSpec): THREE.BufferGeometry {
  const { points, radii } = spec
  const n = points.length
  const segs = spec.segments ?? Math.max(12, (n - 1) * 7)
  const radial = spec.radial ?? 12
  const sx = spec.sx ?? 1
  const sy = spec.sy ?? 1

  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    'centripetal',
  )

  const rAt = (t: number) => {
    const f = Math.min(Math.max(t, 0), 1) * (n - 1)
    const i = Math.min(Math.floor(f), n - 2)
    const k = f - i
    const r0 = radii[Math.max(i - 1, 0)]
    const r1 = radii[i]
    const r2 = radii[i + 1]
    const r3 = radii[Math.min(i + 2, n - 1)]
    const v =
      0.5 *
      (2 * r1 +
        (-r0 + r2) * k +
        (2 * r0 - 5 * r1 + 4 * r2 - r3) * k * k +
        (-r0 + 3 * r1 - 3 * r2 + r3) * k * k * k)
    return Math.max(v, 0.0005)
  }

  const base = new THREE.Color(spec.color ?? '#ffffff')
  const belly = spec.belly ? new THREE.Color(spec.belly) : null
  const stripe = spec.stripe ? new THREE.Color(spec.stripe) : null
  const stripes = spec.stripes ?? 0

  const pos: number[] = []
  const nor: number[] = []
  const col: number[] = []
  const idx: number[] = []

  const P = new THREE.Vector3()
  const T = new THREE.Vector3()
  const N = new THREE.Vector3()
  const B = new THREE.Vector3()
  const prevN = new THREE.Vector3(...(spec.up ?? [0, 1, 0]))
  const Pa = new THREE.Vector3()
  const Pb = new THREE.Vector3()
  const v = new THREE.Vector3()
  const nv = new THREE.Vector3()
  const c = new THREE.Color()
  const d = 0.5 / segs

  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    curve.getPoint(t, P)
    curve.getTangent(t, T)

    // Параллель тасымалдау: алдыңғы нормальды жаңа жанамаға перпендикуляр жазықтыққа проекциялаймыз
    N.copy(prevN).addScaledVector(T, -prevN.dot(T))
    if (N.lengthSq() < 1e-6) N.set(0, 0, 1).addScaledVector(T, -T.z)
    N.normalize()
    B.crossVectors(T, N).normalize()
    prevN.copy(N)

    const r = rAt(t)
    const t0 = Math.max(0, t - d)
    const t1 = Math.min(1, t + d)
    curve.getPoint(t0, Pa)
    curve.getPoint(t1, Pb)
    const slope = (rAt(t1) - rAt(t0)) / Math.max(Pa.distanceTo(Pb), 1e-5)

    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      v.copy(P)
        .addScaledVector(N, ca * r * sy)
        .addScaledVector(B, sa * r * sx)
      nv.set(0, 0, 0)
        .addScaledVector(N, ca / sy)
        .addScaledVector(B, sa / sx)
        .normalize()
        .addScaledVector(T, -slope)
        .normalize()

      c.copy(base)
      if (belly) c.lerp(belly, smoothstep(0.15, -0.6, nv.y))
      if (stripe && stripes > 0) {
        const band = smoothstep(0.3, 0.8, Math.sin(t * stripes * Math.PI * 2))
        c.lerp(stripe, band * smoothstep(-0.1, 0.55, nv.y) * 0.85)
      }

      pos.push(v.x, v.y, v.z)
      nor.push(nv.x, nv.y, nv.z)
      col.push(c.r, c.g, c.b)
    }
  }

  const ring = (i: number, j: number) => i * radial + (j % radial)
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = ring(i, j)
      const b = ring(i + 1, j)
      const c2 = ring(i + 1, j + 1)
      const e = ring(i, j + 1)
      idx.push(a, e, b, b, e, c2)
    }
  }

  // Екі ұшын жабу
  const addCap = (t: number, ringIndex: number, sign: 1 | -1) => {
    curve.getPoint(t, P)
    curve.getTangent(t, T)
    const center = pos.length / 3
    pos.push(P.x, P.y, P.z)
    nor.push(T.x * sign, T.y * sign, T.z * sign)
    const k = ringIndex * radial * 3
    col.push(col[k], col[k + 1], col[k + 2])
    for (let j = 0; j < radial; j++) {
      if (sign < 0) idx.push(center, ring(ringIndex, j + 1), ring(ringIndex, j))
      else idx.push(center, ring(ringIndex, j), ring(ringIndex, j + 1))
    }
  }
  addCap(0, 0, -1)
  addCap(1, segs, 1)

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

/* ------------------------------------------------------------------ */
/*  Геометрияларды бояу, орналастыру және біріктіру                    */
/* ------------------------------------------------------------------ */

type Painter = (p: THREE.Vector3, out: THREE.Color, i: number) => void

/** Геометрияға vertex color береді: тұрақты түс немесе әр төбеге арналған функция. */
export function paint<T extends THREE.BufferGeometry>(geo: T, color: THREE.ColorRepresentation | Painter): T {
  const position = geo.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  const c = new THREE.Color()
  const p = new THREE.Vector3()
  const fn = typeof color === 'function' ? color : null
  if (!fn) c.set(color as THREE.ColorRepresentation)
  for (let i = 0; i < position.count; i++) {
    if (fn) {
      p.fromBufferAttribute(position, i)
      fn(p, c, i)
    }
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()

export interface Placement {
  p?: V3
  r?: V3
  s?: number | V3
}

/** Геометрияны орнына қояды (жылжыту, бұру, масштабтау). */
export function place<T extends THREE.BufferGeometry>(geo: T, { p = [0, 0, 0], r = [0, 0, 0], s = 1 }: Placement): T {
  _p.set(...p)
  _q.setFromEuler(_e.set(...r))
  if (typeof s === 'number') _s.setScalar(s)
  else _s.set(...s)
  geo.applyMatrix4(_m.compose(_p, _q, _s))
  return geo
}

/**
 * Бірнеше бөлікті бір геометрияға біріктіреді (position + normal + color).
 * flat = true болса, қырлы (low-poly) көлеңкелеу үшін нормальдар қайта есептеледі.
 */
export function merge(parts: THREE.BufferGeometry[], flat = false): THREE.BufferGeometry {
  const prepared = parts.map((part) => {
    const g = part.index ? part.toNonIndexed() : part
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'color') g.deleteAttribute(name)
    }
    if (!g.getAttribute('color')) paint(g, '#ffffff')
    if (!g.getAttribute('normal')) g.computeVertexNormals()
    return g
  })
  const merged = mergeGeometries(prepared, false)
  if (flat) merged.computeVertexNormals()
  merged.computeBoundingSphere()
  return merged
}

/* ------------------------------------------------------------------ */
/*  Жапырақ / вайя / күлте                                             */
/* ------------------------------------------------------------------ */

export interface FrondSpec {
  length?: number
  width?: number
  /** Жиектегі «тістер» (қауырсын жапырақшалар) саны. */
  teeth?: number
  /** 1 — тегіс жиек, 0.4 — терең тілімделген. */
  zig?: number
  rise?: number
  droop?: number
  fold?: number
  power?: number
  color?: THREE.ColorRepresentation
  tip?: THREE.ColorRepresentation
}

/**
 * +X бағытында өсіп, доға тәрізді иілетін жапырақ.
 * Папоротник пен саговник вайялары, шөп, гүл күлтелері осыдан жасалады.
 */
export function frond(spec: FrondSpec = {}): THREE.BufferGeometry {
  const L = spec.length ?? 1
  const W = spec.width ?? 0.2
  const teeth = spec.teeth ?? 9
  const zig = spec.zig ?? 0.42
  const rise = spec.rise ?? 1
  const droop = spec.droop ?? 1
  const fold = spec.fold ?? 0.3
  const power = spec.power ?? 0.6
  const c0 = new THREE.Color(spec.color ?? '#1f5a33')
  const c1 = new THREE.Color(spec.tip ?? spec.color ?? '#5fa052')

  const steps = teeth * 2
  const center: V3[] = []
  const left: V3[] = []
  const right: V3[] = []
  for (let i = 0; i <= steps; i++) {
    const s = i / steps
    const x = L * s
    const y = rise * L * s - droop * L * s * s
    const profile = Math.pow(Math.sin(Math.PI * Math.min(1, s * 0.93 + 0.07)), power)
    const w = W * profile * (i % 2 === 1 ? 1 : zig)
    center.push([x, y, 0])
    left.push([x + w * 0.3, y + w * fold, w])
    right.push([x + w * 0.3, y + w * fold, -w])
  }

  const pos: number[] = []
  const col: number[] = []
  const c = new THREE.Color()
  const push = (p: V3, s: number) => {
    pos.push(...p)
    c.copy(c0).lerp(c1, s)
    col.push(c.r, c.g, c.b)
  }
  for (let i = 0; i < steps; i++) {
    const s0 = i / steps
    const s1 = (i + 1) / steps
    // сол жақ (z > 0)
    push(center[i], s0)
    push(left[i], s0)
    push(center[i + 1], s1)
    push(center[i + 1], s1)
    push(left[i], s0)
    push(left[i + 1], s1)
    // оң жақ (z < 0)
    push(center[i], s0)
    push(center[i + 1], s1)
    push(right[i], s0)
    push(center[i + 1], s1)
    push(right[i + 1], s1)
    push(right[i], s0)
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

/* ------------------------------------------------------------------ */
/*  Аммонит: логарифмдік спираль бойымен оралған қабыршақ              */
/* ------------------------------------------------------------------ */

export function ammoniteGeo(color: THREE.ColorRepresentation = '#c9a86a', belly: THREE.ColorRepresentation = '#8a6a3c') {
  const pts: V3[] = []
  const radii: number[] = []
  const N = 72
  const turns = 3.1
  let maxR = 0
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * turns * Math.PI * 2
    const R = 0.06 * Math.exp(0.12 * th)
    pts.push([Math.cos(th) * R, Math.sin(th) * R, 0])
    // Қабырғалы бет үшін радиусты сәл толқындатамыз
    radii.push(R * 0.4 * (1 + 0.09 * Math.sin(th * 13)))
    maxR = R * 1.4
  }
  radii[0] = 0.004
  const g = tube({ points: pts, radii, segments: N * 2, radial: 10, sx: 0.78, color, belly, up: [0, 0, 1] })
  g.scale(1 / maxR, 1 / maxR, 1 / maxR)
  return g
}
