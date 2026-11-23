import { FactCard } from '../components/FactCard'
import { FocusList } from '../components/FocusList'
import { SlideShell } from '../components/SlideShell'
import { slides } from '../data/slides'

/** 7. Құрлықтағы динозаврлар: тезисті таңдағанда 3D-модель алмасады. */
export default function Slide07() {
  const slide = slides[6]
  return (
    <SlideShell slide={slide}>
      {slide.items && <FocusList items={slide.items} />}
      <FactCard fact={slide.fact} />
    </SlideShell>
  )
}
