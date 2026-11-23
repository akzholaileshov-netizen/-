import { motion } from 'framer-motion'
import { FactCard } from '../components/FactCard'
import { Bullets, SlideShell, item } from '../components/SlideShell'
import { slides } from '../data/slides'
import { useStage } from '../store/stage'

/** 1. Титул: айналатын Жер глобусы. */
export default function Slide01() {
  const slide = slides[0]
  const next = useStage((s) => s.next)
  return (
    <SlideShell slide={slide} hero>
      <Bullets items={slide.bullets} />
      <FactCard fact={slide.fact} />
      <motion.button
        variants={item}
        type="button"
        onClick={next}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-sand-300 px-5 py-2.5 text-sm font-bold text-night transition hover:bg-sand-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sand-300 active:scale-95"
      >
        Саяхатты бастау
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </motion.button>
    </SlideShell>
  )
}
