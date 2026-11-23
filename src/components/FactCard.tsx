import { motion } from 'framer-motion'
import type { Fact } from '../data/slides'
import { item } from './SlideShell'

/** Слайдтың негізгі «қызықты факт» карточкасы. */
export function FactCard({ fact }: { fact: Fact }) {
  return (
    <motion.aside
      variants={item}
      className="relative overflow-hidden rounded-2xl border border-sand-300/25 bg-linear-to-br from-sand-400/15 via-sand-400/5 to-lava-500/10 p-4"
    >
      <span className="absolute inset-y-0 left-0 w-[3px] bg-linear-to-b from-sand-300 to-lava-400" />
      <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-sand-300">
        <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
          <path d="M12 2l2.1 6.2a2 2 0 0 0 1.3 1.3L22 12l-6.6 2.5a2 2 0 0 0-1.3 1.3L12 22l-2.1-6.2a2 2 0 0 0-1.3-1.3L2 12l6.6-2.5a2 2 0 0 0 1.3-1.3L12 2z" />
        </svg>
        Қызықты факт
      </div>
      <p className="mt-2 text-[13.5px] leading-relaxed text-sand-200/95 lg:text-[15px]">{fact.text}</p>
    </motion.aside>
  )
}
