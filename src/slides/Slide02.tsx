import { FactCard } from '../components/FactCard'
import { Bullets, SlideShell } from '../components/SlideShell'
import { Timeline } from '../components/Timeline'
import { slides } from '../data/slides'

/** 2. Мезозой дегеніміз не: уақыт шкаласы және үш кезең. */
export default function Slide02() {
  const slide = slides[1]
  return (
    <SlideShell slide={slide}>
      <Bullets items={slide.bullets} />
      {slide.periods && <Timeline periods={slide.periods} />}
      <FactCard fact={slide.fact} />
    </SlideShell>
  )
}
