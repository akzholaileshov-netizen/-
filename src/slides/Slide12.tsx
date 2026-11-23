import { FactCard } from '../components/FactCard'
import { References } from '../components/References'
import { Bullets, SlideShell } from '../components/SlideShell'
import { slides } from '../data/slides'

/** 12. Қорытынды және пайдаланылған әдебиеттер. */
export default function Slide12() {
  const slide = slides[11]
  return (
    <SlideShell slide={slide}>
      <Bullets items={slide.bullets} />
      <FactCard fact={slide.fact} />
      {slide.references && <References items={slide.references} />}
    </SlideShell>
  )
}
