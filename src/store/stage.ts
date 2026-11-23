import { create } from 'zustand'
import { slides } from '../data/slides'

export const TOTAL = slides.length

/** Сапа деңгейлері: бөлшектер мен инстанстардың үлесі (FPS төмендесе азаяды). */
export const QUALITY_LEVELS = [0.35, 0.6, 1] as const

export const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const clampIndex = (i: number) => Math.min(TOTAL - 1, Math.max(0, i))

const readHash = () => {
  const m = /(\d+)/.exec(window.location.hash)
  return m ? clampIndex(parseInt(m[1], 10) - 1) : 0
}

interface StageState {
  index: number
  direction: 1 | -1
  /** 7–9-слайдтарда таңдалған нысанның индексі. */
  focus: number
  /** 11-слайдтағы анимацияны қайта бастау есептегіші. */
  replay: number
  quality: number
  /** Мәтін панелінің оң жақ шеті (px); тік бағдарда null. 3D-көріністі жылжытуға керек. */
  panelSpan: number | null
  setPanelSpan: (span: number | null) => void
  go: (i: number) => void
  next: () => void
  prev: () => void
  setFocus: (i: number) => void
  replayScene: () => void
  setQuality: (q: number) => void
  lowerQuality: () => void
  raiseQuality: () => void
}

export const useStage = create<StageState>((set, get) => ({
  index: readHash(),
  direction: 1,
  focus: 0,
  replay: 0,
  quality: IS_TOUCH ? QUALITY_LEVELS[1] : QUALITY_LEVELS[2],
  panelSpan: null,
  setPanelSpan: (span) => {
    if (span !== get().panelSpan) set({ panelSpan: span })
  },

  go: (i) => {
    const current = get().index
    const target = clampIndex(i)
    if (target === current) return
    set({ index: target, direction: target > current ? 1 : -1, focus: 0 })
  },
  next: () => get().go(get().index + 1),
  prev: () => get().go(get().index - 1),
  setFocus: (i) => set({ focus: i }),
  replayScene: () => set((s) => ({ replay: s.replay + 1 })),

  setQuality: (q) => set({ quality: q }),
  lowerQuality: () => {
    const i = QUALITY_LEVELS.findIndex((q) => q >= get().quality)
    set({ quality: QUALITY_LEVELS[Math.max(0, i - 1)] })
  },
  raiseQuality: () => {
    const i = QUALITY_LEVELS.findIndex((q) => q >= get().quality)
    set({ quality: QUALITY_LEVELS[Math.min(QUALITY_LEVELS.length - 1, i + 1)] })
  },
}))
