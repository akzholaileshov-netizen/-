import * as THREE from 'three'
import { frond, merge, paint, place } from './geo'
import { lerp, mulberry32, noise3 } from './noise'

/**
 * Өсімдіктер мен тастардың процедуралық геометриялары.
 * Әр функция vertex color-ы бар БІР геометрия қайтарады — оны InstancedMesh арқылы
 * жүздеген рет арзан салуға болады.
 */

const TAU = Math.PI * 2

const bark = (base: string) => {
  const b = new THREE.Color(base)
  return (p: THREE.Vector3, c: THREE.Color) => {
    c.copy(b).offsetHSL(0, 0, (noise3(p.x * 7, p.y * 3, p.z * 7) - 0.5) * 0.12)
  }
}

/** Папоротник (қырыққұлақ): ортадан жан-жаққа иілген вайялар. */
export function fernGeo(seed = 1) {
  const rnd = mulberry32(seed)
  const parts: THREE.BufferGeometry[] = []
  const n = 13
  for (let i = 0; i < n; i++) {
    const inner = i % 3 === 0
    const f = frond({
      length: (inner ? 0.7 : 0.95) + rnd() * 0.35,
      width: 0.15 + rnd() * 0.05,
      teeth: 10,
      zig: 0.38,
      rise: (inner ? 1.7 : 1.0) + rnd() * 0.4,
      droop: (inner ? 1.3 : 1.05) + rnd() * 0.3,
      color: '#1c5631',
      tip: '#6aa655',
    })
    parts.push(place(f, { r: [0, (i / n) * TAU + rnd() * 0.35, 0] }))
  }
  return merge(parts)
}

/** Саговник: жуан діңгек + қауырсын жапырақтар тәжі + ортасындағы бүр. */
export function cycadGeo(seed = 2) {
  const rnd = mulberry32(seed)
  const parts: THREE.BufferGeometry[] = []
  const trunk = new THREE.CylinderGeometry(0.2, 0.27, 0.95, 9, 5)
  trunk.translate(0, 0.475, 0)
  paint(trunk, bark('#5b4530'))
  parts.push(trunk)

  const n = 21
  for (let i = 0; i < n; i++) {
    const tier = i % 3
    const f = frond({
      length: 1.15 + rnd() * 0.35,
      width: 0.12,
      teeth: 14,
      zig: 0.3,
      rise: [1.9, 1.15, 0.55][tier] + rnd() * 0.2,
      droop: [1.35, 1.15, 0.95][tier],
      fold: 0.45,
      color: '#1f5a36',
      tip: '#86b35a',
    })
    parts.push(place(f, { p: [0, 0.92, 0], r: [0, (i / n) * TAU + rnd() * 0.25, 0] }))
  }

  const cone = new THREE.SphereGeometry(0.13, 8, 6)
  paint(cone, '#c79a45')
  parts.push(place(cone, { p: [0, 1.05, 0], s: [1, 1.7, 1] }))
  return merge(parts)
}

/**
 * Қылқан жапырақты ағаш.
 * variant 0 — қабат-қабат конусты; variant 1 — араукария тәрізді қолшатыр бөрікті.
 */
export function coniferGeo(variant: 0 | 1 = 0, seed = 3) {
  const rnd = mulberry32(seed)
  const parts: THREE.BufferGeometry[] = []
  const dark = new THREE.Color('#0f3a26')
  const light = new THREE.Color('#3a7a48')

  const tierCone = (r: number, h: number, y: number, k: number) => {
    const cone = new THREE.ConeGeometry(r, h, 8, 1)
    paint(cone, (p, c) => {
      c.copy(dark).lerp(light, k * 0.75 + (p.y / h + 0.5) * 0.25)
    })
    parts.push(place(cone, { p: [(rnd() - 0.5) * 0.08, y, (rnd() - 0.5) * 0.08], r: [0, rnd() * TAU, 0] }))
  }

  if (variant === 0) {
    const trunk = new THREE.CylinderGeometry(0.06, 0.17, 3.4, 7, 3)
    trunk.translate(0, 1.7, 0)
    paint(trunk, bark('#4a3524'))
    parts.push(trunk)
    const tiers = 6
    for (let i = 0; i < tiers; i++) {
      const k = i / (tiers - 1)
      tierCone(lerp(1.1, 0.32, k), lerp(1.15, 0.8, k), lerp(1.35, 3.85, k), k)
    }
  } else {
    const trunk = new THREE.CylinderGeometry(0.08, 0.2, 4.7, 7, 4)
    trunk.translate(0, 2.35, 0)
    paint(trunk, bark('#4f3a28'))
    parts.push(trunk)
    const tiers = 4
    for (let i = 0; i < tiers; i++) {
      const k = i / (tiers - 1)
      tierCone(lerp(1.45, 0.55, k), 0.5, lerp(3.35, 4.6, k), k)
    }
    tierCone(0.3, 0.7, 5.0, 1)
  }
  return merge(parts, true)
}

/** Ерте гүлді өсімдік (магнолия тектес): сабақ, екі жапырақ, екі қатар күлте. */
export function flowerGeo(seed = 4, petal = '#f8ecd6', blush = '#f1a8a0') {
  const rnd = mulberry32(seed)
  const parts: THREE.BufferGeometry[] = []
  const stem = new THREE.CylinderGeometry(0.016, 0.024, 0.6, 5)
  stem.translate(0, 0.3, 0)
  paint(stem, '#3c7a45')
  parts.push(stem)

  for (let i = 0; i < 2; i++) {
    const leaf = frond({ length: 0.36, width: 0.1, teeth: 3, zig: 1, rise: 0.7, droop: 0.6, color: '#2a6a3a', tip: '#5a9c55' })
    parts.push(place(leaf, { p: [0, 0.1 + i * 0.12, 0], r: [0, i * Math.PI + rnd(), 0] }))
  }
  const outer = 7
  for (let i = 0; i < outer; i++) {
    const p = frond({ length: 0.27, width: 0.09, teeth: 3, zig: 1, power: 0.8, rise: 0.75, droop: 0.6, fold: 0.35, color: blush, tip: petal })
    parts.push(place(p, { p: [0, 0.6, 0], r: [0, (i / outer) * TAU, 0] }))
  }
  const inner = 5
  for (let i = 0; i < inner; i++) {
    const p = frond({ length: 0.18, width: 0.07, teeth: 3, zig: 1, power: 0.8, rise: 1.6, droop: 0.7, fold: 0.35, color: petal, tip: '#fffaf0' })
    parts.push(place(p, { p: [0, 0.6, 0], r: [0, (i / inner) * TAU + 0.3, 0] }))
  }
  const heart = new THREE.SphereGeometry(0.05, 7, 5)
  paint(heart, '#e0a83a')
  parts.push(place(heart, { p: [0, 0.64, 0] }))
  return merge(parts)
}

/** Қырықбуын: буынды сабақ пен шоқ-шоқ бұтақшалар. */
export function horsetailGeo() {
  const parts: THREE.BufferGeometry[] = []
  const stem = new THREE.CylinderGeometry(0.022, 0.036, 1.3, 6)
  stem.translate(0, 0.65, 0)
  paint(stem, '#356e3e')
  parts.push(stem)
  for (let i = 0; i < 6; i++) {
    const whorl = new THREE.ConeGeometry(0.2 - i * 0.022, 0.16, 8, 1, true)
    paint(whorl, i % 2 ? '#4f9a52' : '#3f8748')
    parts.push(place(whorl, { p: [0, 0.3 + i * 0.17, 0], r: [Math.PI, 0, 0] }))
  }
  return merge(parts, true)
}

/** Шөп шоғы немесе (ұзын болса) балдыр. */
export function grassGeo(seed = 5, color = '#3f7a3a', tip = '#a8c064', length = 0.4, blades = 7) {
  const rnd = mulberry32(seed)
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < blades; i++) {
    const L = length * (0.7 + rnd() * 0.6)
    const blade = frond({ length: L, width: L * 0.06, teeth: 3, zig: 1, rise: 0.4, droop: 0.5, fold: 0.2, color, tip })
    parts.push(
      place(blade, {
        p: [(rnd() - 0.5) * length * 0.3, 0, (rnd() - 0.5) * length * 0.3],
        r: [0, rnd() * TAU, 1.0 + rnd() * 0.4],
      }),
    )
  }
  return merge(parts)
}

/** Қырлы тас: шумен деформацияланған икосаэдр. */
export function rockGeo(seed = 6, color = '#6b5a4a', detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail)
  const pos = g.getAttribute('position')
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const k = 0.72 + 0.6 * noise3(v.x * 1.3 + seed, v.y * 1.3 - seed, v.z * 1.3 + seed * 0.5)
    pos.setXYZ(i, v.x * k, v.y * k * 0.75, v.z * k)
  }
  const base = new THREE.Color(color)
  const rnd = mulberry32(seed + 99)
  let shade = 0
  paint(g, (_p, c, i) => {
    if (i % 3 === 0) shade = (rnd() - 0.5) * 0.1
    c.copy(base).offsetHSL(0, 0, shade)
  })
  return merge([g], true)
}

/** Жалпақ жапырақты гүлдеген ағаш (бор кезеңі). */
export function broadleafGeo(seed = 7) {
  const rnd = mulberry32(seed)
  const parts: THREE.BufferGeometry[] = []
  const trunk = new THREE.CylinderGeometry(0.09, 0.19, 1.7, 7, 3)
  trunk.translate(0, 0.85, 0)
  paint(trunk, bark('#54402c'))
  parts.push(trunk)

  const greens = ['#2a6238', '#35733f', '#427f44']
  const blobs: [number, number, number, number][] = []
  for (let i = 0; i < 6; i++) {
    const a = rnd() * TAU
    const r = i === 0 ? 0 : 0.35 + rnd() * 0.45
    blobs.push([Math.cos(a) * r, 2.0 + rnd() * 0.75, Math.sin(a) * r, 0.55 + rnd() * 0.3])
  }
  for (const [x, y, z, s] of blobs) {
    const blob = new THREE.IcosahedronGeometry(1, 1)
    paint(blob, greens[Math.floor(rnd() * greens.length)])
    parts.push(place(blob, { p: [x, y, z], s: [s, s * 0.82, s], r: [rnd(), rnd() * TAU, 0] }))
    // Гүлдер бөріктің бетінде
    for (let k = 0; k < 4; k++) {
      const u = rnd() * TAU
      const w = 0.2 + rnd() * 0.9
      const bloom = new THREE.OctahedronGeometry(0.085, 0)
      paint(bloom, rnd() > 0.5 ? '#f8ecd6' : '#f3b5ad')
      parts.push(
        place(bloom, {
          p: [x + Math.cos(u) * Math.sin(w) * s, y + Math.cos(w) * s * 0.82, z + Math.sin(u) * Math.sin(w) * s],
          r: [rnd() * 3, rnd() * 3, 0],
        }),
      )
    }
  }
  return merge(parts, true)
}
