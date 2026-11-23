import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import Slide01 from './Slide01'
import Slide02 from './Slide02'
import Slide03 from './Slide03'
import Slide04 from './Slide04'
import Slide05 from './Slide05'
import Slide06 from './Slide06'
import Slide07 from './Slide07'
import Slide08 from './Slide08'
import Slide09 from './Slide09'
import Slide10 from './Slide10'
import Slide11 from './Slide11'
import Slide12 from './Slide12'

type Loader = () => Promise<{ default: ComponentType }>

export interface SlideEntry {
  /** Слайдтың мәтіндік бөлігі (шыны панель ішінде). */
  Content: ComponentType
  /** Слайдтың 3D-сахнасы — қажет болғанда ғана жүктеледі. */
  Scene: LazyExoticComponent<ComponentType>
  /** Сахна модулін алдын ала жүктеу үшін. */
  load: Loader
}

const entry = (Content: ComponentType, load: Loader): SlideEntry => ({ Content, load, Scene: lazy(load) })

export const registry: SlideEntry[] = [
  entry(Slide01, () => import('../scenes/EarthScene')),
  entry(Slide02, () => import('../scenes/StrataScene')),
  entry(Slide03, () => import('../scenes/PangeaScene')),
  entry(Slide04, () => import('../scenes/TriassicScene')),
  entry(Slide05, () => import('../scenes/JurassicScene')),
  entry(Slide06, () => import('../scenes/CretaceousScene')),
  entry(Slide07, () => import('../scenes/DinosaursScene')),
  entry(Slide08, () => import('../scenes/SeaSkyScene')),
  entry(Slide09, () => import('../scenes/PlantsScene')),
  entry(Slide10, () => import('../scenes/ResourcesScene')),
  entry(Slide11, () => import('../scenes/ExtinctionScene')),
  entry(Slide12, () => import('../scenes/FinaleScene')),
]
