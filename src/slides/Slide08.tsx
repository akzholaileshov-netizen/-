import { FactCard } from '../components/FactCard'
import { FocusList } from '../components/FocusList'
import { Bullets, SlideShell } from '../components/SlideShell'
import { slides } from '../data/slides'

/** 8. Теңіз және әуе жануарлары: таңдалған жануарға камера ауысады. */
export default function Slide08() {
  const slide = slides[7]
  return (
    <SlideShell slide={slide}>
      {slide.items && <FocusList items={slide.items} />}
      <Bullets items={slide.bullets} />
      <FactCard fact={slide.fact} />
    </SlideShell>
  )
}
