import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef } from 'react'
import * as THREE from 'three'
import { IS_TOUCH } from '../store/stage'
import type { V3 } from './geo'

interface SceneRigProps {
  /** Камераның бастапқы орны. */
  position: V3
  /** Камера айналатын нүкте; өзгерсе, камера соған баяу ауысады. */
  target?: V3
  fov?: number
  /** Жақындату шектері: бастапқы қашықтыққа көбейткіштер [ең жақын, ең алыс]. */
  zoom?: [number, number]
  /** Тік бұрыш шектері (радиан). */
  polar?: [number, number]
  /** Камераның баяу автоматты айналу жылдамдығы. */
  autoRotate?: number
  /**
   * Көлденең айналу шегі: бастапқы бағыттан екі жаққа ± радиан.
   * Камера осы аралықта маятник тәрізді баяу тербеледі. Infinity — толық шеңбер.
   */
  azimuth?: number
  /** Қозғалыстағы нысанды бақылау: қайтарылған нысан камераның нысанасына айналады. */
  follow?: () => THREE.Object3D | null | undefined
  background: string
  /** Экспоненциалды тұман тығыздығы. */
  fog?: number
  fogColor?: string
}

/**
 * Әр сахнаның «операторы»: камера орны, шектелген OrbitControls, баяу айналу, фон мен тұман.
 * Тышқан: сол жақ батырма — айналдыру, дөңгелек — жақындату (шектелген).
 * Сенсор: бір саусақ слайд ауыстыруға қалдырылған, сахна екі саусақпен айналады.
 */
export function SceneRig({
  position,
  target = [0, 0, 0],
  fov = 40,
  zoom = [0.65, 1.35],
  polar = [0.75, 1.52],
  autoRotate = 0.3,
  azimuth = 0.75,
  follow,
  background,
  fog,
  fogColor,
}: SceneRigProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const portrait = useThree((s) => s.size.width < s.size.height * 0.9)
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)

  // Тік экранда нысан кадрға сыюы үшін камераны алыстатамыз
  const k = portrait ? 1.7 : 1
  const [px, py, pz] = position
  const [tx, ty, tz] = target

  const distance = useMemo(() => Math.hypot(px - tx, py - ty, pz - tz) * k, [px, py, pz, tx, ty, tz, k])
  const desired = useRef(new THREE.Vector3(tx, ty, tz))
  desired.current.set(tx, ty, tz)

  // Камераның бастапқы көлденең бұрышы және тербеліс бағыты
  const home = Math.atan2(px - tx, pz - tz)
  const limited = Number.isFinite(azimuth)
  const sway = useRef(1)

  useLayoutEffect(() => {
    const t = desired.current
    camera.position.set(t.x + (px - t.x) * k, t.y + (py - t.y) * k, t.z + (pz - t.z) * k)
    camera.fov = fov
    camera.near = 0.1
    camera.far = 400
    camera.updateProjectionMatrix()
    const c = controls.current
    if (c) {
      c.target.copy(t)
      c.minAzimuthAngle = limited ? home - azimuth : -Infinity
      c.maxAzimuthAngle = limited ? home + azimuth : Infinity
      c.update()
    }
    // Әдейі тек сахна ашылғанда және экран бағдары өзгергенде орындалады:
    // әйтпесе target өзгерген сайын камера бастапқы орнына секіріп кетер еді
  }, [camera, k])

  useEffect(() => {
    const c = controls.current
    if (!c || !IS_TOUCH) return
    // Бір саусақ — swipe, екі саусақ — айналдыру/жақындату
    c.touches = { ONE: -1 as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE }
  }, [])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    const tracked = follow?.()
    if (tracked) desired.current.copy(tracked.position)
    if (c.target.distanceToSquared(desired.current) > 1e-6) {
      c.target.lerp(desired.current, 1 - Math.exp(-2.5 * dt))
    }
    if (!limited || autoRotate === 0) return
    // Маятник: шекке жеткенде бағыт өзгереді, шетке жақындағанда жылдамдық бәсеңдейді
    let d = c.getAzimuthalAngle() - home
    d = Math.atan2(Math.sin(d), Math.cos(d))
    const edge = azimuth - 0.02
    if (d >= edge) sway.current = 1
    else if (d <= -edge) sway.current = -1
    // OrbitControls-та оң жылдамдық бұрышты азайтады
    const room = sway.current > 0 ? d + azimuth : azimuth - d
    c.autoRotateSpeed = autoRotate * sway.current * Math.min(1, Math.max(0.2, room / 0.25))
  })

  return (
    <>
      <color attach="background" args={[background]} />
      {/* Камера алыстаған сайын (тік экран) тұман тығыздығын сол шамаға азайтамыз */}
      {fog !== undefined && <fogExp2 attach="fog" args={[fogColor ?? background, fog / k]} />}
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.5}
        minDistance={distance * zoom[0]}
        maxDistance={distance * zoom[1]}
        minPolarAngle={polar[0]}
        maxPolarAngle={polar[1]}
        autoRotate={autoRotate !== 0}
        autoRotateSpeed={autoRotate}
      />
    </>
  )
}
