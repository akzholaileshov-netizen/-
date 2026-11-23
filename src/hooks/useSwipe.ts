import { useEffect } from 'react'
import { useStage } from '../store/stage'

const MIN_DISTANCE = 48
const MAX_DURATION = 900

/**
 * Мобильде бір саусақпен көлденең сырғыту — слайд ауыстыру.
 * Екі саусақ 3D-сахнаны айналдыруға қалдырылған (SceneRig қараңыз).
 */
export function useSwipe() {
  useEffect(() => {
    let x0 = 0
    let y0 = 0
    let t0 = 0
    let tracking = false

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        tracking = false
        return
      }
      tracking = true
      x0 = e.touches[0].clientX
      y0 = e.touches[0].clientY
      t0 = performance.now()
    }

    const onMove = (e: TouchEvent) => {
      if (e.touches.length > 1) tracking = false
    }

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const touch = e.changedTouches[0]
      const dx = touch.clientX - x0
      const dy = touch.clientY - y0
      if (performance.now() - t0 > MAX_DURATION) return
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return
      const { next, prev } = useStage.getState()
      if (dx < 0) next()
      else prev()
    }

    const onCancel = () => {
      tracking = false
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onCancel, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onCancel)
    }
  }, [])
}
