import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { REDUCED_MOTION } from '../fx'

/**
 * Сахнаның «жасы»: сахна ашылған сәттен бері өткен секунд (кадр секірсе де бірқалыпты өседі).
 * «Қозғалысты азайту» қосулы болса, `skip` секундқа алға жылжытылады — кіріспе анимациялар бірден аяқталған күйде тұрады.
 */
export function useAge(skip = 0) {
  const age = useRef(REDUCED_MOTION ? skip : 0)
  useFrame((_, dt) => {
    age.current += Math.min(dt, 0.05)
  })
  return age
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** t мәні a…b аралығын өткенде 0-ден 1-ге тегіс өседі. */
export function ramp(t: number, a: number, b: number) {
  const x = clamp01((t - a) / (b - a))
  return x * x * (3 - 2 * x)
}

/** Сәл асып барып орнына келетін («серіппелі») өсу, 0…1. */
export function overshoot(x: number, s = 1.7) {
  const u = clamp01(x) - 1
  return 1 + u * u * ((s + 1) * u + s)
}
