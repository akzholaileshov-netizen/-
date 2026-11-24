import { motion } from 'framer-motion'
import type { FocusItem } from '../data/slides'
import { useStage } from '../store/stage'
import { item, slideIn } from './SlideShell'

/**
 * Таңдалатын тезистер: тезисті басқанда 3D-сахнадағы тиісті нысан алға шығады.
 * Таңдалған индекс zustand қоймасында сақталады — оны сахна да оқиды.
 */
export function FocusList({ items }: { items: FocusItem[] }) {
  const focus = useStage((s) => s.focus)
  const setFocus = useStage((s) => s.setFocus)

  return (
    <div className="space-y-2" role="tablist" aria-label="3D-нысанды таңдау">
      {items.map((it, i) => {
        const active = i === focus
        return (
          <motion.button
            key={it.name}
            variants={slideIn}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setFocus(i)}
            className={`block w-full cursor-pointer rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
              active ? 'border-[var(--accent)] bg-white/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08]'
            }`}
          >
            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className={`text-[15px] font-semibold ${active ? 'text-[var(--accent)]' : 'text-white/90'}`}>
                {it.name}
              </span>
              <span className="text-[11px] font-medium text-white/45">{it.meta}</span>
            </span>
            <span className="mt-0.5 block text-[13.5px] leading-snug text-white/75">{it.text}</span>
          </motion.button>
        )
      })}
      <motion.p variants={item} className="pt-0.5 text-[11px] text-white/40">
        Тезисті басыңыз — 3D-сахна сол нысанға ауысады.
      </motion.p>
    </div>
  )
}
