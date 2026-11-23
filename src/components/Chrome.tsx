import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { slides } from '../data/slides'
import { useFullscreen } from '../hooks/useFullscreen'
import { IS_TOUCH, TOTAL, useStage } from '../store/stage'

/* ---------- Жоғарғы жолақ ---------- */

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="grid h-5 min-w-5 place-items-center rounded border border-white/20 bg-white/5 px-1 font-sans text-[10px] font-semibold text-white/70">
      {children}
    </kbd>
  )
}

export function Header() {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-4 pt-4 sm:px-6 lg:px-10 lg:pt-7">
      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
          <path d="M5 23c4.5-1 6.5-10 11-10s4 5.5 7 5.5S27 15 27 15" fill="none" stroke="#e2c07a" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="23.5" cy="9.5" r="2.2" fill="#ff6a3d" />
        </svg>
        <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/75">Мезозой эрасы</span>
      </div>

      {IS_TOUCH ? (
        <p className="text-right text-[10px] leading-tight text-white/45">
          сырғыту — слайд
          <br />
          екі саусақ — сахнаны айналдыру
        </p>
      ) : (
        <div className="hidden items-center gap-1.5 text-[11px] text-white/50 md:flex">
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
          <span className="mr-2">слайд</span>
          <Kbd>F</Kbd>
          <span className="mr-2">толық экран</span>
          <span>тышқанмен сүйреу — сахнаны айналдыру</span>
        </div>
      )}
    </header>
  )
}

/* ---------- Төменгі жолақ: батырмалар, прогресс, слайд нөмірі ---------- */

interface RoundButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

function RoundButton({ label, onClick, disabled, children }: RoundButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="glass-chip grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-white/80 transition hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-sand-300 active:scale-95 disabled:cursor-default disabled:opacity-30 disabled:hover:border-white/10"
    >
      {children}
    </button>
  )
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
)

export function Footer() {
  const index = useStage((s) => s.index)
  const go = useStage((s) => s.go)
  const next = useStage((s) => s.next)
  const prev = useStage((s) => s.prev)
  const fullscreen = useFullscreen()

  return (
    <footer className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3 sm:px-6 sm:pb-4 lg:px-10 lg:pb-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <RoundButton label="Алдыңғы слайд (←)" onClick={prev} disabled={index === 0}>
          <Icon d="M15 5l-7 7 7 7" />
        </RoundButton>

        <div className="relative mx-1 flex-1">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/12"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={TOTAL}
            aria-valuenow={index + 1}
            aria-label="Презентация барысы"
          >
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-jungle-400 via-sand-300 to-lava-400"
              initial={false}
              animate={{ width: `${((index + 1) / TOTAL) * 100}%` }}
              transition={{ type: 'spring', stiffness: 140, damping: 24 }}
            />
          </div>
          {/* Жолақтың кез келген бөлігін басып, сол слайдқа өтуге болады */}
          <div className="absolute inset-x-0 -top-3 flex h-[30px]">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                title={`${s.id}. ${s.title}`}
                aria-label={`${s.id}-слайдқа өту: ${s.title}`}
                aria-current={i === index ? 'step' : undefined}
                onClick={() => go(i)}
                className="group relative flex-1 cursor-pointer"
              >
                {i < TOTAL - 1 && <span className="absolute right-0 top-1/2 h-1.5 w-px -translate-y-1/2 bg-night/80" />}
                <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/0 transition group-hover:bg-white/25" />
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-[3.4rem] text-center text-sm font-semibold tabular-nums text-white/85" aria-live="polite">
          {index + 1}
          <span className="text-white/40">/{TOTAL}</span>
        </div>

        <RoundButton label="Келесі слайд (→)" onClick={next} disabled={index === TOTAL - 1}>
          <Icon d="M9 5l7 7-7 7" />
        </RoundButton>

        {fullscreen.supported && (
          <RoundButton label={fullscreen.active ? 'Толық экраннан шығу (F)' : 'Толық экран (F)'} onClick={fullscreen.toggle}>
            <Icon d={fullscreen.active ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'} />
          </RoundButton>
        )}
      </div>
    </footer>
  )
}
