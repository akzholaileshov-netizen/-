import { motion } from 'framer-motion'
import type { Period } from '../data/slides'
import { item } from './SlideShell'

/** Мезозойдың үш кезеңі: бөліктердің ені ұзақтығына пропорционал. */
export function Timeline({ periods }: { periods: Period[] }) {
  const start = periods[0].from
  const end = periods[periods.length - 1].to
  const span = start - end
  const ticks = [start, ...periods.map((p) => p.to)]

  return (
    <motion.div variants={item} aria-label="Мезозой кезеңдерінің уақыт шкаласы">
      <div className="flex h-12 overflow-hidden rounded-xl border border-white/10">
        {periods.map((p) => (
          <div
            key={p.name}
            className="flex min-w-0 flex-col items-center justify-center border-r border-night/40 last:border-r-0"
            style={{ flexGrow: p.from - p.to, flexBasis: 0, background: `linear-gradient(180deg, ${p.color}, ${p.color}b0)` }}
          >
            <span className="text-[13px] font-bold leading-none text-night">{p.name}</span>
            <span className="mt-1 text-[10px] font-semibold leading-none text-night/70">≈ {p.from - p.to} млн жыл</span>
          </div>
        ))}
      </div>
      <div className="relative mt-1.5 h-4 text-[10.5px] font-medium tabular-nums text-white/55">
        {ticks.map((value, i) => {
          const left = ((start - value) / span) * 100
          const shift = i === 0 ? '0%' : i === ticks.length - 1 ? '-100%' : '-50%'
          return (
            <span key={value} className="absolute top-0 whitespace-nowrap" style={{ left: `${left}%`, transform: `translateX(${shift})` }}>
              {value}
            </span>
          )
        })}
      </div>
      <p className="text-[10.5px] text-white/40">млн жыл бұрын</p>
    </motion.div>
  )
}
