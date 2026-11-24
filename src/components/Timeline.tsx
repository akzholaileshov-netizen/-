import { motion } from 'framer-motion'
import type { Period } from '../data/slides'
import { PERIOD_IGNITE, TIMELINE_DRAW } from '../fx'
import { item } from './SlideShell'

/**
 * Мезозойдың үш кезеңі: бөліктердің ені ұзақтығына пропорционал.
 * Анимация: жарық сызық сол жақтан оңға сызылады, ол жеткен сайын кезеңдер (Триас → Юра → Бор) тізбектеліп жанады.
 * 3D-сахнадағы қабаттар да осы ырғақпен тұтанады (StrataScene).
 */
export function Timeline({ periods }: { periods: Period[] }) {
  const start = periods[0].from
  const end = periods[periods.length - 1].to
  const span = start - end
  const ticks = [start, ...periods.map((p) => p.to)]
  const at = (value: number) => TIMELINE_DRAW.delay + ((start - value) / span) * TIMELINE_DRAW.duration

  return (
    <motion.div variants={item} aria-label="Мезозой кезеңдерінің уақыт шкаласы">
      {/* Сызылатын сызық және оның жарқыраған ұшы */}
      <div className="relative mb-1.5 h-[3px]">
        <div className="absolute inset-0 rounded-full bg-white/10" />
        <motion.div
          className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-sand-500 via-sand-300 to-sand-200 shadow-[0_0_10px_rgb(226_192_122_/_0.8)]"
          variants={{
            enter: { scaleX: 0 },
            center: { scaleX: 1, transition: { delay: TIMELINE_DRAW.delay, duration: TIMELINE_DRAW.duration, ease: 'linear' } },
          }}
        />
        <motion.span
          aria-hidden
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_14px_5px_rgb(255_226_160_/_0.9)]"
          variants={{
            enter: { left: '0%', opacity: 0 },
            center: {
              left: '100%',
              opacity: [0, 1, 1, 0],
              transition: {
                delay: TIMELINE_DRAW.delay,
                duration: TIMELINE_DRAW.duration,
                ease: 'linear',
                opacity: { delay: TIMELINE_DRAW.delay, duration: TIMELINE_DRAW.duration + 0.5, times: [0, 0.05, 0.85, 1] },
              },
            },
          }}
        />
      </div>

      <div className="flex h-12 overflow-hidden rounded-xl border border-white/10">
        {periods.map((p, i) => (
          <motion.div
            key={p.name}
            className="relative flex min-w-0 flex-col items-center justify-center border-r border-night/40 last:border-r-0"
            style={{ flexGrow: p.from - p.to, flexBasis: 0, background: `linear-gradient(180deg, ${p.color}, ${p.color}b0)` }}
            variants={{
              enter: { filter: 'grayscale(1) brightness(0.3)' },
              center: {
                filter: ['grayscale(1) brightness(0.3)', 'grayscale(0) brightness(2.1)', 'grayscale(0) brightness(1)'],
                transition: { delay: PERIOD_IGNITE[i] ?? at(p.from), duration: 0.9, times: [0, 0.25, 1], ease: 'easeOut' },
              },
            }}
          >
            <span className="text-[13px] font-bold leading-none text-night">{p.name}</span>
            <span className="mt-1 text-[10px] font-semibold leading-none text-night/70">≈ {p.from - p.to} млн жыл</span>
          </motion.div>
        ))}
      </div>

      <div className="relative mt-1.5 h-4 text-[10.5px] font-medium tabular-nums text-white/55">
        {ticks.map((value, i) => {
          const left = ((start - value) / span) * 100
          const shift = i === 0 ? '0%' : i === ticks.length - 1 ? '-100%' : '-50%'
          return (
            <motion.span
              key={value}
              className="absolute top-0 whitespace-nowrap"
              style={{ left: `${left}%`, x: shift }}
              variants={{
                enter: { opacity: 0, y: -6 },
                center: { opacity: 1, y: 0, transition: { delay: at(value), duration: 0.4 } },
              }}
            >
              {value}
            </motion.span>
          )
        })}
      </div>
      <p className="text-[10.5px] text-white/40">млн жыл бұрын</p>
    </motion.div>
  )
}
