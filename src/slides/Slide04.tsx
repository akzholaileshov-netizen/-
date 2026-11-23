import { FactCard } from '../components/FactCard'
import { Bullets, SlideShell } from '../components/SlideShell'
import { slides } from '../data/slides'

/** 4. Триас кезеңі: шөлді климат, алғашқы динозаврлар. */
export default function Slide04() {
  const slide = slides[3]
  return (
    <SlideShell slide={slide}>
      <Bullets items={slide.bullets} />
      <FactCard fact={slide.fact} />
    </SlideShell>
  )
}
