import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Footer, Header } from './components/Chrome'
import { Stage } from './components/Stage'
import { slides } from './data/slides'
import { useKeyboardNav } from './hooks/useKeyboardNav'
import { useSwipe } from './hooks/useSwipe'
import { useFitPanel, usePanelZoom } from './layout'
import { registry } from './slides'
import { useStage } from './store/stage'

/**
 * Слайд панелінің ауысу анимациясы. Шыны әсері (backdrop-filter) дәл осы элементте тұр:
 * ата-элементтің opacity/filter-і оны бұзатындықтан, анимация панельдің өзіне қолданылады.
 */
const panel: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: 56 * direction, scale: 0.98 }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.055, delayChildren: 0.12 },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: -56 * direction,
    scale: 0.98,
    transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
  }),
}

/** Бір слайдтың шыны панелі; мазмұны сыймаса, өздігінен сәл кішірейеді (useFitPanel). */
function SlidePanel({ index, direction }: { index: number; direction: number }) {
  const ref = useRef<HTMLElement>(null)
  useFitPanel(ref, useStage.getState().setPanelSpan)
  const Content = registry[index].Content

  return (
    <motion.section
      ref={ref}
      custom={direction}
      variants={panel}
      initial="enter"
      animate="center"
      exit="exit"
      className="slide-panel glass rounded-3xl"
      aria-roledescription="слайд"
      aria-label={`${index + 1}/${slides.length}: ${slides[index].title}`}
    >
      <Content />
    </motion.section>
  )
}

export default function App() {
  const index = useStage((s) => s.index)
  const direction = useStage((s) => s.direction)
  useKeyboardNav()
  useSwipe()
  usePanelZoom()

  // Мекенжай жолында #/7 деп қолмен жазса да, сол слайдқа өтеміз
  useEffect(() => {
    const onHash = () => {
      const n = Number.parseInt(window.location.hash.replace(/^#\/?/, ''), 10)
      if (Number.isFinite(n) && n >= 1 && n <= slides.length) useStage.getState().go(n - 1)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Слайд нөмірін мекенжай жолында сақтаймыз: бетті жаңартқанда сол слайд ашылады
  useEffect(() => {
    window.history.replaceState(null, '', `#/${index + 1}`)
    document.title = `${index + 1}. ${slides[index].title}`
  }, [index])

  return (
    <div className="fixed inset-0 overflow-hidden bg-night">
      <Stage />
      <div className="vignette" />
      <Header />

      <main className="slide-area">
        <AnimatePresence mode="wait" custom={direction}>
          <SlidePanel key={index} index={index} direction={direction} />
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  )
}
