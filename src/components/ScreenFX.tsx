import { useEffect, useRef, type RefObject } from 'react'
import { IS_TOUCH, REDUCED_MOTION, fx } from '../fx'

interface ScreenFXProps {
  /** Бүкіл қолданбаның түбір элементі — сілкініс кезінде тұтас дірілдейді. */
  root: RefObject<HTMLElement | null>
  /** Мәтін панелінің қабаты — курсор параллаксімен сәл ығысады. */
  panel: RefObject<HTMLElement | null>
}

/**
 * Экран деңгейіндегі әсерлер (DOM): курсор параллаксі, экран сілкінісі және ақ-қызыл жарқыл.
 * Мәндерді сахналар fx нысанына жазады; мұнда тек стильдер жаңартылады (React қайта рендерсіз).
 */
export function ScreenFX({ root, panel }: ScreenFXProps) {
  const white = useRef<HTMLDivElement>(null)
  const red = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      fx.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const parallax = !IS_TOUCH && !REDUCED_MOTION
    let frame = 0
    let px = 0
    let py = 0
    let shaking = false
    let flashing = false

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)

      // Панель камераға қарсы бағытта, одан сәл баяу жылжиды — тереңдік сезімі
      if (parallax && panel.current) {
        const nx = px + (fx.pointer.x - px) * 0.07
        const ny = py + (fx.pointer.y - py) * 0.07
        if (Math.abs(nx - px) + Math.abs(ny - py) > 0.0004) {
          px = nx
          py = ny
          panel.current.style.transform = `translate3d(${(-px * 12).toFixed(2)}px, ${(-py * 8).toFixed(2)}px, 0)`
        }
      }

      const shake = REDUCED_MOTION ? 0 : fx.shake
      if (root.current) {
        if (shake > 0.004) {
          const a = shake * 16
          const x = Math.sin(now * 0.067) * a + Math.sin(now * 0.113) * a * 0.5
          const y = Math.sin(now * 0.059 + 1.3) * a + Math.sin(now * 0.097) * a * 0.4
          root.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(1 + shake * 0.03).toFixed(4)})`
          shaking = true
        } else if (shaking) {
          root.current.style.transform = ''
          shaking = false
        }
      }

      // Жарқыл: әуелі көз қарықтырар ақ, сөне келе қызылға ауысады
      const flash = fx.flash * (REDUCED_MOTION ? 0.3 : 1)
      if (white.current && red.current) {
        if (flash > 0.004) {
          white.current.style.opacity = Math.min(1, flash * flash * 1.15).toFixed(3)
          red.current.style.opacity = Math.min(0.8, Math.sqrt(flash) * 0.8).toFixed(3)
          flashing = true
        } else if (flashing) {
          white.current.style.opacity = '0'
          red.current.style.opacity = '0'
          flashing = false
        }
      }
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [root, panel])

  return (
    <>
      <div ref={red} aria-hidden className="screen-flash screen-flash-red" />
      <div ref={white} aria-hidden className="screen-flash screen-flash-white" />
    </>
  )
}
