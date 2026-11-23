import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type * as THREE from 'three'
import { panelSpan } from '../layout'
import { registry } from '../slides'
import { IS_TOUCH, QUALITY_LEVELS, useStage } from '../store/stage'

const FADE_MS = 380

/** Сахна толық жүктеліп, алғашқы кадрлары салынған соң хабар береді. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(onReady)
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [onReady])
  return null
}

/**
 * Мәтін панелі экранның бір бөлігін жауып тұрады, сондықтан 3D-нысанның
 * көрінетін орталығын бос аймаққа жылжытамыз (камера айналу осі өзгермейді).
 * Панель ені src/layout.ts-те есептеледі (index.css-тегі өлшемдерге сәйкес).
 */
function ViewOffset() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const measured = useStage((s) => s.panelSpan)

  useLayoutEffect(() => {
    const { width: w, height: h } = size
    if (w >= h) {
      camera.setViewOffset(w, h, -(measured ?? panelSpan(w, h)) / 2, 0, w, h)
    } else {
      // Тік экранда панель төменгі ~54%-ды алады: көріністі жоғарғы бос бөліктің ортасына көтереміз
      camera.setViewOffset(w, h, 0, h * 0.28, w, h)
    }
    return () => camera.clearViewOffset()
  }, [camera, size, measured])

  return null
}

/**
 * Барлық слайдқа ортақ жалғыз WebGL-канвас.
 * Слайд ауысқанда: қараңғы перде жабылады → сахна компоненті алмасады (lazy) → перде ашылады.
 */
export function Stage() {
  const index = useStage((s) => s.index)
  const quality = useStage((s) => s.quality)
  const [shown, setShown] = useState(index)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (index === shown) return
    const id = window.setTimeout(() => {
      setReady(false)
      setShown(index)
    }, FADE_MS)
    return () => window.clearTimeout(id)
  }, [index, shown])

  // Көрші слайдтардың сахналарын алдын ала жүктеп қоямыз
  useEffect(() => {
    if (!ready) return
    void registry[shown + 1]?.load()
    void registry[shown - 1]?.load()
  }, [ready, shown])

  const onReady = useCallback(() => setReady(true), [])
  const veiled = !ready || index !== shown
  const Scene = registry[shown].Scene

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        shadows={quality > 0.4 ? 'percentage' : false}
        // Орташа сапада-ақ пиксель тығыздығы түсіріледі: әлсіз видеокартада ең үлкен ұтыс осыдан келеді
        dpr={quality >= 1 ? [1, 2] : quality >= 0.6 && IS_TOUCH ? [1, 1.5] : 1}
        camera={{ fov: 40, near: 0.1, far: 400, position: [0, 2, 12] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <ViewOffset />
        {/* FPS төмендесе сапаны түсіреміз: бөлшектер, инстанстар, DPR, көлеңкелер азаяды */}
        <PerformanceMonitor
          ms={250}
          iterations={8}
          flipflops={3}
          bounds={(rate) => (rate > 90 ? [50, 85] : [42, 57])}
          onDecline={() => useStage.getState().lowerQuality()}
          onIncline={() => useStage.getState().raiseQuality()}
          onFallback={() => useStage.getState().setQuality(QUALITY_LEVELS[0])}
        />
        <Suspense fallback={null}>
          <Scene key={shown} />
          <Ready key={`ready-${shown}`} onReady={onReady} />
        </Suspense>
      </Canvas>

      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 grid place-items-center bg-night transition-opacity ease-in-out ${
          veiled ? 'opacity-100 duration-300' : 'opacity-0 duration-700'
        }`}
      >
        <span
          className="size-2 rounded-full bg-sand-300"
          style={{ animation: 'pulse-dot 1.1s ease-in-out infinite' }}
        />
      </div>
    </div>
  )
}
