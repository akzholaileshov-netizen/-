import { FactCard } from '../components/FactCard'
import { Bullets, SlideShell } from '../components/SlideShell'
import { slides } from '../data/slides'

/** 10. Қазба байлықтар мен табылған жерлер: мұнай, көмір, Қаратау. */
export default function Slide10() {
  const slide = slides[9]
  return (
    <SlideShell slide={slide}>
      <Bullets items={slide.bullets} />
      <FactCard fact={slide.fact} />
    </SlideShell>
  )
}
