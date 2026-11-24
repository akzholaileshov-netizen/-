import * as THREE from 'three'

/**
 * Кадр сайын өзгеретін кинематографиялық күй.
 * React күйіне салынбайды (әр кадрда қайта рендер болмас үшін): сахналар осында жазады,
 * ал камера (SceneRig), post-processing (Effects) және экран қабаты (ScreenFX) осыдан оқиды.
 */
export const fx = {
  /** Курсордың орны: −1…1 (экран ортасы — 0). Параллакс үшін. */
  pointer: new THREE.Vector2(),
  /** Ыстық ауаның дірілі (heat distortion), 0…1. */
  haze: 0,
  /** Сілкініс амплитудасы, 0…1: камера да, бүкіл экран да дірілдейді. */
  shake: 0,
  /** Жарқыл, 0…1: ақтан қызылға ауысатын толық экранды жарық. */
  flash: 0,
  /** Соққы толқыны: сахнадағы орталығы және 0…1 барысы (теріс мән — өшірулі). */
  shockAt: new THREE.Vector3(),
  shock: -1,
  /** Камера ұшып бара жатқандағы «жылдамдық» әсері, 0…1. */
  warp: 0,
  /** Камераның нысанасы — Depth of Field осы нүктеге фокусталады. */
  focus: new THREE.Vector3(),
}

/** Сахна ауысқанда уақытша әсерлерді бастапқы қалпына келтіреді. */
export function resetFx() {
  fx.haze = 0
  fx.shake = 0
  fx.flash = 0
  fx.shock = -1
}

/** Слайд ауысқандағы камера ұшуының ұзақтығы (секунд): сахнадан шығу және жаңа сахнаға қону. */
export const FLIGHT = { exit: 0.55, enter: 1.8 }

/**
 * 2-слайдтың ырғағы (секунд, слайд ашылған сәттен): уақыт сызығы сол жақтан оңға сызылады,
 * ол жеткен сайын кезеңдер тізбектеліп жанады — HTML шкаласы да (Timeline), 3D қабаттар да (StrataScene).
 */
export const TIMELINE_DRAW = { delay: 1.0, duration: 2.1 }
export const PERIOD_IGNITE = [1.0, 1.58, 2.21]

const media = (query: string) => typeof window !== 'undefined' && window.matchMedia(query).matches

/** Пайдаланушы жүйеде «қозғалысты азайту» баптауын қосқан: анимациялар жеңілдетіледі. */
export const REDUCED_MOTION = media('(prefers-reduced-motion: reduce)')

export const IS_TOUCH = media('(pointer: coarse)')

/** Сапа деңгейлері: бөлшектер мен инстанстардың үлесі, post-processing жиыны (FPS төмендесе азаяды). */
export const QUALITY_LEVELS = [0.35, 0.6, 1] as const

/**
 * Сапаны қолмен бекіту: мекенжайға ?q=low | mid | high қосса, автоматты реттеу өшіп, сол деңгей қалады
 * (мысалы, әлсіз проекторлық ноутбукте бірден ?q=low).
 */
export const FORCED_QUALITY: number | null = (() => {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search).get('q')
  const i = q === null ? -1 : ['low', 'mid', 'high'].indexOf(q)
  return i < 0 ? null : QUALITY_LEVELS[i]
})()

/**
 * Бастапқы сапа деңгейі: құрылғының ядро саны мен экранның пиксель тығыздығына қарай.
 * Әлсіз телефонда бөлшектер мен post-processing бірден азайтылады, қалғанын PerformanceMonitor реттейді.
 */
export function initialQuality(): number {
  if (typeof navigator === 'undefined') return QUALITY_LEVELS[2]
  if (FORCED_QUALITY !== null) return FORCED_QUALITY
  const cores = navigator.hardwareConcurrency || 4
  const dpr = window.devicePixelRatio || 1
  if (IS_TOUCH) return cores <= 4 || dpr >= 3 ? QUALITY_LEVELS[0] : QUALITY_LEVELS[1]
  return cores <= 4 ? QUALITY_LEVELS[1] : QUALITY_LEVELS[2]
}
