import { motion } from 'framer-motion'
import { FactCard } from '../components/FactCard'
import { Bullets, SlideShell, item } from '../components/SlideShell'
import { slides } from '../data/slides'
import { useStage } from '../store/stage'

/** 11. Жойылу себебі: астероид соқтығысуының 3D-анимациясы. */
export default function Slide11() {
  const slide = slides[10]
  const replayScene = useStage((s) => s.replayScene)
  return (
    <SlideShell slide={slide}>
      <Bullets items={slide.bullets} />
      <motion.button
        variants={item}
        type="button"
        onClick={replayScene}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-lava-400/50 bg-lava-500/15 px-4 py-2 text-[13px] font-semibold text-[#ffc3ad] transition hover:bg-lava-500/30 focus-visible:outline-2 focus-visible:outline-lava-400 active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
        </svg>
        Соқтығысуды қайта көрсету
      </motion.button>
      <FactCard fact={slide.fact} />
    </SlideShell>
  )
}
