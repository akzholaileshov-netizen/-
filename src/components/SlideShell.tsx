import { motion, type Variants } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import type { Accent, SlideData } from '../data/slides'

const ACCENTS: Record<Accent, string> = {
  sand: '#e2c07a',
  lava: '#ff7a4d',
  jungle: '#5fd49a',
}

/** Панель ішіндегі элементтердің кезекпен шығу анимациясы (App.tsx-тегі stagger-мен бірге). */
export const item: Variants = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

interface SlideShellProps {
  slide: SlideData
  /** Титул слайдына арналған ірі тақырып. */
  hero?: boolean
  children: ReactNode
}

/** Слайд мазмұнының ортақ қаңқасы: нөмір + бөлім атауы, тақырып, мазмұн, сахнаға ескертпе. */
export function SlideShell({ slide, hero = false, children }: SlideShellProps) {
  return (
    <div className="p-5 sm:p-6 lg:p-8" style={{ '--accent': ACCENTS[slide.accent] } as CSSProperties}>
      <motion.div
        variants={item}
        className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]"
      >
        <span className="tabular-nums">{String(slide.id).padStart(2, '0')}</span>
        <span className="h-px w-8 bg-[var(--accent)] opacity-60" />
        <span>{slide.kicker}</span>
      </motion.div>

      <motion.h1
        variants={item}
        className={`mt-3 text-balance font-bold leading-[1.12] tracking-tight text-white ${
          hero ? 'text-[1.9rem] sm:text-4xl lg:text-[2.9rem]' : 'text-2xl sm:text-3xl lg:text-[2.2rem]'
        }`}
      >
        {slide.title}
      </motion.h1>

      {slide.subtitle && (
        <motion.p variants={item} className="mt-2.5 text-sm font-medium text-sand-200/80 lg:text-base">
          {slide.subtitle}
        </motion.p>
      )}

      <div className="mt-5 space-y-4 lg:mt-6 lg:space-y-5">{children}</div>

      {slide.note && (
        <motion.p variants={item} className="mt-4 text-[11px] leading-snug text-white/40">
          {slide.note}
        </motion.p>
      )}
    </div>
  )
}

/** 3–4 қысқа тезис. */
export function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul className="space-y-2.5">
      {items.map((text) => (
        <motion.li key={text} variants={item} className="flex gap-3 text-[14.5px] leading-snug text-white/85 lg:text-base">
          <span className="mt-[0.45em] size-1.5 shrink-0 rotate-45 bg-[var(--accent)]" />
          <span>{text}</span>
        </motion.li>
      ))}
    </ul>
  )
}
