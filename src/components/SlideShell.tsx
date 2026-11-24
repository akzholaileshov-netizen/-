import { motion, type Variants } from 'framer-motion'
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import type { Accent, SlideData } from '../data/slides'

const ACCENTS: Record<Accent, string> = {
  sand: '#e2c07a',
  lava: '#ff7a4d',
  jungle: '#5fd49a',
}

const EASE = [0.22, 1, 0.36, 1] as const

/** Панель ішіндегі элементтердің кезекпен шығу анимациясы (App.tsx-тегі stagger-мен бірге). */
export const item: Variants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

/** Тезистер мен таңдалатын карточкалар: бүйірден бірінен соң бірі сырғып келеді. */
export const slideIn: Variants = {
  enter: { opacity: 0, x: -36 },
  center: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

/* ---------- Тақырып: әріптен-әріпке пайда болады ---------- */

const title: Variants = {
  enter: {},
  center: { transition: { staggerChildren: 0.026 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

const heroTitle: Variants = {
  enter: {},
  center: { transition: { staggerChildren: 0.05, delayChildren: 0.35 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

const letter: Variants = {
  enter: { opacity: 0, y: '0.55em', rotateX: -75, filter: 'blur(5px)' },
  center: { opacity: 1, y: '0em', rotateX: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: EASE } },
}

/** Титул слайды: әріптер жарықтың ішінен шығады — қарықтырар бұлдыр шұғыладан айқын әріпке айналады. */
const heroLetter: Variants = {
  enter: { opacity: 0, scale: 1.5, filter: 'blur(16px) brightness(3.2)' },
  center: { opacity: 1, scale: 1, filter: 'blur(0px) brightness(1)', transition: { duration: 1.2, ease: EASE } },
}

/** Тақырыптың артындағы жарық шоғы: жарқ етіп ашылады да, баяу сөнеді. */
const heroLight: Variants = {
  enter: { opacity: 0, scale: 0.25 },
  center: { opacity: [0, 1, 0.9, 0.16], scale: [0.25, 1, 1.25, 1.6], transition: { duration: 3.4, times: [0, 0.22, 0.5, 1], ease: 'easeOut' } },
  exit: { opacity: 0 },
}

function Title({ text, hero }: { text: string; hero: boolean }) {
  const words = text.split(' ')
  return (
    <motion.h1
      variants={hero ? heroTitle : title}
      aria-label={text}
      className={`relative mt-3 text-balance font-bold leading-[1.12] tracking-tight text-white [perspective:600px] ${
        hero ? 'text-[1.9rem] sm:text-4xl lg:text-[2.9rem]' : 'text-2xl sm:text-3xl lg:text-[2.2rem]'
      }`}
    >
      {hero && <motion.span aria-hidden variants={heroLight} className="title-light" />}
      {words.map((word, w) => (
        <Fragment key={w}>
          {/* Сөз тұтас қалады: жол тек сөз арасынан бөлінеді */}
          <span aria-hidden className="relative inline-block whitespace-nowrap">
            {Array.from(word).map((ch, i) => (
              <motion.span key={i} variants={hero ? heroLetter : letter} className="inline-block origin-bottom">
                {ch}
              </motion.span>
            ))}
          </span>
          {w < words.length - 1 && ' '}
        </Fragment>
      ))}
    </motion.h1>
  )
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
        <motion.span
          variants={{ enter: { scaleX: 0 }, center: { scaleX: 1, transition: { duration: 0.7, ease: EASE } } }}
          className="h-px w-8 origin-left bg-[var(--accent)] opacity-60"
        />
        <span>{slide.kicker}</span>
      </motion.div>

      <Title text={slide.title} hero={hero} />

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

/** 3–4 қысқа тезис: бірінен соң бірі сырғып келеді, белгісі бұрала ашылады. */
export function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul className="space-y-2.5">
      {items.map((text) => (
        <motion.li key={text} variants={slideIn} className="flex gap-3 text-[14.5px] leading-snug text-white/85 lg:text-base">
          <motion.span
            variants={{ enter: { scale: 0, rotate: -135 }, center: { scale: 1, rotate: 45, transition: { duration: 0.5, ease: EASE, delay: 0.15 } } }}
            className="mt-[0.45em] size-1.5 shrink-0 bg-[var(--accent)]"
          />
          <span>{text}</span>
        </motion.li>
      ))}
    </ul>
  )
}
