import { create } from 'zustand'
import { MIXES, ambience } from '../audio/ambience'
import { slides } from '../data/slides'
import { IS_TOUCH, QUALITY_LEVELS, initialQuality } from '../fx'

export const TOTAL = slides.length

export { IS_TOUCH, QUALITY_LEVELS }

const clampIndex = (i: number) => Math.min(TOTAL - 1, Math.max(0, i))

const readHash = () => {
  const m = /(\d+)/.exec(window.location.hash)
  return m ? clampIndex(parseInt(m[1], 10) - 1) : 0
}

interface StageState {
  /** Таңдалған (баратын) слайд. */
  index: number
  /** Дәл қазір 3D-сахнасы көрсетіліп тұрған слайд; ауысу кезінде index-тен қалып отырады. */
  shown: number
  direction: 1 | -1
  /** 7–9-слайдтарда таңдалған нысанның индексі. */
  focus: number
  /** 11-слайдтағы анимацияны қайта бастау есептегіші. */
  replay: number
  quality: number
  /** Сапа деңгейі қайта-қайта ауытқыса, жоғарылатуға тыйым салынады. */
  qualityLocked: boolean
  /** Орта шуы (жел, жанартау гүрілі…) қосулы ма. Әдепкіде дыбыссыз. */
  sound: boolean
  /** Мәтін панелінің оң жақ шеті (px); тік бағдарда null. 3D-көріністі жылжытуға керек. */
  panelSpan: number | null
  setPanelSpan: (span: number | null) => void
  go: (i: number) => void
  next: () => void
  prev: () => void
  setShown: (i: number) => void
  setFocus: (i: number) => void
  replayScene: () => void
  toggleSound: () => void
  setQuality: (q: number) => void
  lowerQuality: () => void
  raiseQuality: () => void
  settleQuality: () => void
}

const levelOf = (quality: number) => QUALITY_LEVELS.findIndex((q) => q >= quality)

const start = readHash()

export const useStage = create<StageState>((set, get) => ({
  index: start,
  shown: start,
  direction: 1,
  focus: 0,
  replay: 0,
  quality: initialQuality(),
  qualityLocked: false,
  sound: false,
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
  setShown: (i) => {
    ambience.setMix(MIXES[i])
    set({ shown: i })
  },
  setFocus: (i) => set({ focus: i }),
  replayScene: () => set((s) => ({ replay: s.replay + 1 })),
  // Түйме басылған сәтте тікелей шақырылады: браузер дыбысқа тек пайдаланушы әрекеті ішінде рұқсат береді
  toggleSound: () => {
    const on = !get().sound
    ambience.setEnabled(on, MIXES[get().shown])
    set({ sound: on })
  },

  setQuality: (q) => set({ quality: q }),
  lowerQuality: () => set({ quality: QUALITY_LEVELS[Math.max(0, levelOf(get().quality) - 1)] }),
  raiseQuality: () => {
    if (get().qualityLocked) return
    set({ quality: QUALITY_LEVELS[Math.min(QUALITY_LEVELS.length - 1, levelOf(get().quality) + 1)] })
  },
  // FPS екі деңгейдің арасында ауытқи берсе: төменгісінде тұрақтаймыз
  settleQuality: () =>
    set({ quality: QUALITY_LEVELS[Math.max(0, levelOf(get().quality) - 1)], qualityLocked: true }),
}))
