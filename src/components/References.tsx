import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { item } from './SlideShell'

/**
 * Пайдаланылған әдебиеттер: тізім фильм титрі сияқты төменнен жоғары баяу жылжиды.
 * Үзіліссіз айналуы үшін тізім екі рет салынады (екінші көшірме экран оқу құралдарынан жасырылған).
 * Курсорды апарса немесе пернетақтамен фокус қойса — тоқтайды; «қозғалысты азайту» режимінде қозғалмайды (index.css).
 */
export function References({ items }: { items: string[] }) {
  // Жылдамдық тізім ұзындығына байланысты емес, шамамен тұрақты болсын
  const style = { '--credits-time': `${Math.max(24, items.length * 7)}s` } as CSSProperties
  return (
    <motion.section variants={item}>
      <h2 className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/50">Пайдаланылған әдебиеттер</h2>
      <div className="credits mt-2" style={style} tabIndex={0} role="group" aria-label="Пайдаланылған әдебиеттер">
        <div className="credits-roll">
          {[false, true].map((copy) => (
            <ol
              key={String(copy)}
              aria-hidden={copy ? 'true' : undefined}
              className="list-decimal space-y-1 py-3 pl-4 text-[11px] leading-snug text-white/60 marker:text-sand-300/70"
            >
              {items.map((ref) => (
                <li key={ref}>{ref}</li>
              ))}
            </ol>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
