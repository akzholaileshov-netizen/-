import { useLayoutEffect, type RefObject } from 'react'

/**
 * Мәтін панелінің орналасу есебі — CSS (.slide-panel) пен 3D камера (ViewOffset) үшін ортақ.
 * Панель экран өлшеміне қарай масштабталады: проекторда іріленеді, шағын ноутбукте кішірейеді.
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Панельдің масштаб коэффициенті (CSS zoom). */
export function panelZoom(w: number, h: number): number {
  if (w < h) return 1
  if (w < 1024) return clamp(h / 520, 0.75, 1)
  return clamp(Math.min(w / 1500, h / 780), 0.85, 1.6)
}

/** Альбомдық бағдарда панель + шеткі бос орын алатын ен (px). */
export function panelSpan(w: number, h: number): number {
  const zoom = panelZoom(w, h)
  return w >= 1024 ? Math.min(560, w * 0.42) * zoom + 40 : w * 0.48 * zoom + 16
}

/**
 * Мазмұны сыймай тұрған панельді (мысалы, әдебиеттер тізімі бар соңғы слайд) кеңейтіп, қажет болса
 * сәл кішірейтіп, айналдырусыз толық көрінетін етеді. Тік (мобильді) бағдарда панель әдеттегідей айналдырылады.
 * onSpan — панельдің оң жақ шеті (px): 3D-көріністің орталығы соған қарай жылжытылады.
 */
export function useFitPanel(ref: RefObject<HTMLElement | null>, onSpan: (rightEdge: number | null) => void) {
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current
      if (!el) return
      const w = window.innerWidth
      const h = window.innerHeight
      applyPanelZoom()
      el.style.zoom = ''
      el.style.maxHeight = ''
      el.style.removeProperty('--panel-widen')
      if (w < h) {
        onSpan(null)
        return
      }
      const wide = w >= 1024
      const base = panelZoom(w, h)
      const baseWidth = wide ? Math.min(560, w * 0.42) : w * 0.48
      const overflows = () => el.scrollHeight > el.clientHeight + 1

      // 1) Алдымен панельді кеңейтеміз (экранның жартысына дейін): жолдар аз бөлінеді, мәтін өлшемі сақталады
      const widest = Math.min(1.25, (w * 0.5) / (baseWidth * base))
      let widen = 1
      while (overflows() && widen < widest) {
        widen = Math.min(widest, widen + 0.0625)
        el.style.setProperty('--panel-widen', widen.toFixed(4))
      }
      // 2) Сонда да сыймаса, масштабты сәл кішірейтеміз.
      //    Телефонның көлденең экранында мәтін онсыз да ұсақ — онда панель айналдырылады
      let zoom = base
      if (wide && overflows()) {
        zoom = base * Math.max(0.74, el.clientHeight / (el.scrollHeight + 4))
        el.style.zoom = zoom.toFixed(3)
        el.style.maxHeight = `${((h - (wide ? 168 : 128)) / zoom).toFixed(1)}px`
      }
      onSpan(Math.round((wide ? 40 : 16) + baseWidth * widen * zoom))
    }
    fit()
    window.addEventListener('resize', fit)
    // Inter шрифті жүктелген соң мәтін биіктігі сәл өзгеруі мүмкін
    void document.fonts?.ready.then(fit)
    return () => window.removeEventListener('resize', fit)
  }, [ref, onSpan])
}

function applyPanelZoom() {
  document.documentElement.style.setProperty('--panel-zoom', panelZoom(window.innerWidth, window.innerHeight).toFixed(3))
}

/** --panel-zoom CSS айнымалысын терезе өлшеміне сай жаңартып отырады. */
export function usePanelZoom() {
  useLayoutEffect(() => {
    applyPanelZoom()
    window.addEventListener('resize', applyPanelZoom)
    return () => window.removeEventListener('resize', applyPanelZoom)
  }, [])
}
