import { FactCard } from '../components/FactCard'
import { Bullets, SlideShell } from '../components/SlideShell'
import { slides } from '../data/slides'

/** 6. Бор кезеңі: гүлді өсімдіктер, жылы климат. */
export default function Slide06() {
  const slide = slides[5]
  return (
    <SlideShell slide={slide}>
      <Bullets items={slide.bullets} />
      <FactCard fact={slide.fact} />
    </SlideShell>
  )
}
