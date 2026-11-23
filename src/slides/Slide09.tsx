import { FactCard } from '../components/FactCard'
import { FocusList } from '../components/FocusList'
import { SlideShell } from '../components/SlideShell'
import { slides } from '../data/slides'

/** 9. Өсімдіктер әлемі: төрт өсімдік тобының 3D-үлгілері. */
export default function Slide09() {
  const slide = slides[8]
  return (
    <SlideShell slide={slide}>
      {slide.items && <FocusList items={slide.items} />}
      <FactCard fact={slide.fact} />
    </SlideShell>
  )
}
