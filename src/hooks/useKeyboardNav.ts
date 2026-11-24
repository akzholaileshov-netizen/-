import { useEffect } from 'react'
import { TOTAL, useStage } from '../store/stage'
import { toggleFullscreen } from './useFullscreen'

/** ← → (сондай-ақ PageUp/PageDown, Space, Home/End) — слайд ауыстыру, F — толық экран, M — дыбыс. */
export function useKeyboardNav() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return

      const { next, prev, go } = useStage.getState()
      // e.code қолданылады: кириллица пернетақтасында да F пернесі жұмыс істейді
      switch (e.code) {
        case 'ArrowRight':
        case 'PageDown':
          next()
          break
        case 'ArrowLeft':
        case 'PageUp':
          prev()
          break
        case 'Space':
          if (el?.tagName === 'BUTTON') return
          if (e.shiftKey) prev()
          else next()
          break
        case 'Home':
          go(0)
          break
        case 'End':
          go(TOTAL - 1)
          break
        case 'KeyF':
          toggleFullscreen()
          break
        case 'KeyM':
          useStage.getState().toggleSound()
          break
        default:
          return
      }
      e.preventDefault()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
