import { clamp01, fbm, lerp, noise3, smoothstep } from './noise'

/**
 * Пангеяның жеңілдетілген (шартты) пішіні.
 * u — шығысқа, v — солтүстікке қарай; құрлық эллипстердің бірігуінен құралады,
 * шығысында Тетис шығанағы ойылған («С» әрпі тәрізді суперматерик).
 */
const LAND: [cx: number, cy: number, rx: number, ry: number][] = [
  [-1.5, 2.1, 1.7, 1.25], // Солтүстік Америка бөлігі
  [1.3, 2.7, 2.6, 1.15], // Еуразия бөлігі (Лавразия)
  [-1.2, 0.5, 1.5, 1.4], // орталық түйіскен жер
  [-1.5, -1.5, 1.35, 1.8], // Оңтүстік Америка бөлігі
  [0.5, -0.9, 1.7, 1.7], // Африка бөлігі
  [1.6, -3.0, 2.7, 1.15], // Үндістан · Антарктида · Аустралия (Гондвана)
]

/** > 0 — құрлық, < 0 — мұхит; шамасы жағадан қашықтықты білдіреді. */
export function pangeaField(u: number, v: number): number {
  let f = -4
  for (const [cx, cy, rx, ry] of LAND) {
    const dx = (u - cx) / rx
    const dy = (v - cy) / ry
    f = Math.max(f, 1 - (dx * dx + dy * dy))
  }
  const tx = (u - 3.5) / 3.0
  const ty = (v - 0.55) / 0.95
  const tethys = 1 - (tx * tx + ty * ty)
  if (tethys > 0) f -= tethys * 1.7
  return f + (fbm(u * 0.9 + 11.3, v * 0.9 - 4.2, 3.7, 4) - 0.5) * 0.75
}

export type RGB = [number, number, number]

const mix = (a: RGB, b: RGB, t: number, out: RGB) => {
  out[0] = lerp(a[0], b[0], t)
  out[1] = lerp(a[1], b[1], t)
  out[2] = lerp(a[2], b[2], t)
}

const SHELF: RGB = [34, 142, 140]
const SEA: RGB = [13, 78, 104]
const DEEP: RGB = [5, 32, 54]
const SAND: RGB = [217, 186, 112]
const GREEN: RGB = [52, 110, 62]
const ARID: RGB = [178, 126, 68]
const RED: RGB = [150, 78, 44]
const ROCK: RGB = [122, 104, 88]

/** Таулардың орналасуы (0…1). */
export function pangeaMountains(f: number, nx: number, ny: number, nz: number) {
  const ridge = 1 - Math.abs(fbm(nx * 1.15 + 7.7, ny * 1.15, nz * 1.15 - 3.1, 3) * 2 - 1)
  return smoothstep(0.84, 0.995, ridge) * smoothstep(0.12, 0.35, f)
}

/**
 * Өріс мәні бойынша беттің түсі (sRGB, 0…255).
 * nx, ny, nz — ұсақ өзгерістерге арналған шу координаталары.
 */
export function pangeaColor(f: number, nx: number, ny: number, nz: number, out: RGB) {
  const n = noise3(nx * 3.1, ny * 3.1, nz * 3.1)
  if (f <= 0) {
    const d = clamp01(-f / 0.9)
    if (d < 0.3) mix(SHELF, SEA, d / 0.3, out)
    else mix(SEA, DEEP, (d - 0.3) / 0.7, out)
    const k = 0.92 + n * 0.16
    out[0] *= k
    out[1] *= k
    out[2] *= k
    return
  }
  mix(SAND, GREEN, smoothstep(0, 0.08, f), out)
  mix(out, ARID, smoothstep(0.2, 0.6, f), out)
  mix(out, RED, smoothstep(0.6, 1.15, f) * 0.65, out)
  mix(out, ROCK, pangeaMountains(f, nx, ny, nz) * 0.7, out)
  const k = 0.86 + n * 0.28
  out[0] *= k
  out[1] *= k
  out[2] *= k
}
