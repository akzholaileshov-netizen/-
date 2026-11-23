import { FactCard } from '../components/FactCard'
import { Bullets, SlideShell } from '../components/SlideShell'
import { slides } from '../data/slides'

/** 3. Эра басындағы жағдай: пермь жойылуы және Пангея. */
export default function Slide03() {
  const slide = slides[2]
  return (
    <SlideShell slide={slide}>
      <Bullets items={slide.bullets} />
      <FactCard fact={slide.fact} />
    </SlideShell>
  )
}
