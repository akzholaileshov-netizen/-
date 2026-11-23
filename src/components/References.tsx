import { motion } from 'framer-motion'
import { item } from './SlideShell'

export function References({ items }: { items: string[] }) {
  return (
    <motion.section variants={item}>
      <h2 className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/50">Пайдаланылған әдебиеттер</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-snug text-white/60 marker:text-sand-300/70">
        {items.map((ref) => (
          <li key={ref}>{ref}</li>
        ))}
      </ol>
    </motion.section>
  )
}
