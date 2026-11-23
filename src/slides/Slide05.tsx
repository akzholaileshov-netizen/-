import { FactCard } from '../components/FactCard'
import { Bullets, SlideShell } from '../components/SlideShell'
import { slides } from '../data/slides'

/** 5. Юра кезеңі: ылғалды климат, қылқан жапырақты орман. */
export default function Slide05() {
  const slide = slides[4]
  return (
    <SlideShell slide={slide}>
      <Bullets items={slide.bullets} />
      <FactCard fact={slide.fact} />
    </SlideShell>
  )
}
