import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { useThree } from '@react-three/fiber'
import { DepthOfFieldEffect, ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo } from 'react'
import { HalfFloatType, UnsignedByteType } from 'three'
import { IS_TOUCH, fx } from '../fx'
import { useStage } from '../store/stage'
import { CinematicEffect } from '../three/CinematicEffect'

/**
 * Post-processing тізбегі: жеңіл Depth of Field → Bloom → сахналық әсерлер → Vignette → тон картасы.
 *
 * Сапа деңгейіне қарай жеңілдейді (өлшеу нәтижесі бойынша ең қымбаты — HDR-буфер, MSAA және DoF):
 *  - жоғары деңгей: HDR (half-float) буфер, MSAA, Depth of Field, кең Bloom;
 *  - ортаңғы деңгей: 8-биттік буфер, MSAA-сыз, DoF-сыз, тар Bloom;
 *  - төменгі деңгейде бұл компонент мүлде қосылмайды (Stage.tsx), виньетканы CSS салады.
 */
export default function Effects() {
  const camera = useThree((s) => s.camera)
  const full = useStage((s) => s.quality >= 1) && !IS_TOUCH

  const cinematic = useMemo(() => new CinematicEffect(), [])
  cinematic.camera = camera
  useEffect(() => () => cinematic.dispose(), [cinematic])

  // Фокус әрдайым камераның нысанасында (SceneRig жаңартып отырады): негізгі нысан анық, алыс фон сәл бұлдыр
  const dof = useMemo(() => {
    if (!full) return null
    const effect = new DepthOfFieldEffect(camera, { focusRange: 22, bokehScale: 1.6, resolutionScale: 0.5 })
    effect.target = fx.focus
    return effect
  }, [camera, full])
  useEffect(() => () => dof?.dispose(), [dof])

  return (
    <EffectComposer multisampling={full ? 2 : 0} frameBufferType={full ? HalfFloatType : UnsignedByteType}>
      {dof ? <primitive object={dof} dispose={null} /> : <></>}
      <Bloom
        mipmapBlur
        luminanceThreshold={full ? 0.92 : 0.8}
        luminanceSmoothing={0.25}
        intensity={0.7}
        radius={0.78}
        levels={full ? 7 : 5}
      />
      <primitive object={cinematic} dispose={null} />
      <Vignette offset={0.3} darkness={0.6} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
