import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef } from 'react'
import * as THREE from 'three'
import { FLIGHT, IS_TOUCH, REDUCED_MOTION, fx } from '../fx'
import { useStage } from '../store/stage'
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
  /**
   * Баяу алыстау/жақындау: қашықтық көбейткіші `from`-нан `to`-ға дейін `seconds` ішінде өзгереді
   * (жақындату шектерінен тәуелсіз, сондықтан өте алысқа кетуге болады).
   */
  dolly?: { from: number; to: number; seconds: number }
  background: string
  /** Экспоненциалды тұман тығыздығы. */
  fog?: number
  fogColor?: string
}

/** Камераның «ұшу» күйі: негізгі орнына қосылатын ауытқулар (GSAP осыларды анимациялайды). */
interface Flight {
  /** Қашықтықтың қосымша үлесі (1 → екі есе алыс). */
  rad: number
  /** Көлденең бұрыштың ауытқуы (радиан). */
  azi: number
  /** Жоғарыдан қарауға ауысу үлесі, 0…1. */
  pol: number
  /** Көру бұрышының кеңеюі (градус). */
  fov: number
}

const HIGH_ANGLE = 0.32
const spherical = new THREE.Spherical()
const offset = new THREE.Vector3()

/**
 * Әр сахнаның «операторы»: камера орны, шектелген OrbitControls, баяу айналу, фон мен тұман.
 * Тышқан: сол жақ батырма — айналдыру, дөңгелек — жақындату (шектелген).
 * Сенсор: бір саусақ слайд ауыстыруға қалдырылған, сахна екі саусақпен айналады.
 *
 * Кинематография:
 *  · сахна ашылғанда камера алыстан, биіктен доға бойымен ұшып келіп қонады; слайд ауысарда сол бағытта ұшып кетеді (GSAP);
 *  · курсор қозғалса, камера сәл ығысады (параллакс);
 *  · fx.shake — сілкініс, dolly — баяу алыстау.
 * Бұл ауытқулар OrbitControls есептеген «негізгі» орынның үстіне қосылады, сондықтан басқару бұзылмайды.
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
  dolly,
  background,
  fog,
  fogColor,
}: SceneRigProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const portrait = useThree((s) => s.size.width < s.size.height * 0.9)
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const leaving = useStage((s) => s.index !== s.shown)

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
  const spin = REDUCED_MOTION ? autoRotate * 0.35 : autoRotate

  /** OrbitControls есептеген орын (ауытқуларсыз). Әр кадрда басқаруға осы қайтарылады. */
  const base = useRef(new THREE.Vector3())
  const flight = useRef<Flight>({ rad: 0, azi: 0, pol: 0, fov: 0 })
  const parallax = useRef(new THREE.Vector2())
  const age = useRef(0)
  const fovNow = useRef(fov)

  useLayoutEffect(() => {
    const t = desired.current
    base.current.set(t.x + (px - t.x) * k, t.y + (py - t.y) * k, t.z + (pz - t.z) * k)
    camera.position.copy(base.current)
    camera.fov = fovNow.current = fov
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

  // Қону: камера алыстан әрі биіктен доға бойымен сахнаға ұшып келеді
  useLayoutEffect(() => {
    const f = flight.current
    if (REDUCED_MOTION) return
    const dir = useStage.getState().direction
    Object.assign(f, { rad: 1.5, azi: dir * 0.8, pol: 0.5, fov: 11 })
    const tween = gsap.to(f, { rad: 0, azi: 0, pol: 0, fov: 0, duration: FLIGHT.enter, delay: 0.1, ease: 'power3.out' })
    return () => {
      tween.kill()
      gsap.killTweensOf(f)
      fx.warp = 0
    }
  }, [])

  // Ұшып кету: слайд ауысарда камера сол бағытта жылдамдай алыстайды (сахна содан кейін алмасады)
  useEffect(() => {
    if (!leaving || REDUCED_MOTION) return
    const dir = useStage.getState().direction
    gsap.to(flight.current, { rad: 0.85, azi: -dir * 0.55, pol: 0.3, fov: 13, duration: FLIGHT.exit, ease: 'power2.in', overwrite: true })
  }, [leaving])

  useEffect(() => {
    const c = controls.current
    if (!c || !IS_TOUCH) return
    // Бір саусақ — swipe, екі саусақ — айналдыру/жақындату
    c.touches = { ONE: -1 as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE }
  }, [])

  // 1) OrbitControls жаңартылмай тұрып (ол −1 басымдықта жұмыс істейді) камераны «негізгі» орнына қайтарамыз
  useFrame(() => {
    camera.position.copy(base.current)
  }, -2)

  // 2) OrbitControls-тан кейін: нысананы жылжыту, маятник, содан соң кинематографиялық ауытқулар
  useFrame((state, delta) => {
    const c = controls.current
    if (!c) return
    const dt = Math.min(delta, 0.05)
    age.current += dt
    base.current.copy(camera.position)

    const tracked = follow?.()
    if (tracked) desired.current.copy(tracked.position)
    if (c.target.distanceToSquared(desired.current) > 1e-6) {
      c.target.lerp(desired.current, 1 - Math.exp(-2.5 * dt))
    }
    fx.focus.copy(c.target)

    if (limited && spin !== 0) {
      // Маятник: шекке жеткенде бағыт өзгереді, шетке жақындағанда жылдамдық бәсеңдейді
      let d = c.getAzimuthalAngle() - home
      d = Math.atan2(Math.sin(d), Math.cos(d))
      const edge = azimuth - 0.02
      if (d >= edge) sway.current = 1
      else if (d <= -edge) sway.current = -1
      // OrbitControls-та оң жылдамдық бұрышты азайтады
      const room = sway.current > 0 ? d + azimuth : azimuth - d
      c.autoRotateSpeed = spin * sway.current * Math.min(1, Math.max(0.2, room / 0.25))
    }

    // Курсор параллаксі: камера курсорға қарсы бағытта сәл ығысады
    const p = parallax.current
    const still = IS_TOUCH || REDUCED_MOTION
    const ease = 1 - Math.exp(-3 * dt)
    p.x += ((still ? 0 : fx.pointer.x) - p.x) * ease
    p.y += ((still ? 0 : fx.pointer.y) - p.y) * ease

    const f = flight.current
    fx.warp = Math.min(1, f.rad * 1.1)

    let far = 1 + f.rad
    if (dolly) {
      const u = Math.min(1, age.current / dolly.seconds)
      far *= THREE.MathUtils.lerp(dolly.from, dolly.to, u * u * (3 - 2 * u))
    }

    offset.copy(base.current).sub(c.target)
    spherical.setFromVector3(offset)
    spherical.radius *= far
    spherical.theta += f.azi - p.x * 0.05
    spherical.phi = THREE.MathUtils.clamp(THREE.MathUtils.lerp(spherical.phi, HIGH_ANGLE, f.pol) + p.y * 0.03, 0.04, Math.PI - 0.04)
    camera.position.setFromSpherical(spherical).add(c.target)
    camera.lookAt(c.target)

    if (fx.shake > 0.001) {
      const t = state.clock.elapsedTime
      const a = fx.shake * 0.02
      camera.rotateX(Math.sin(t * 61) * a)
      camera.rotateY(Math.sin(t * 53 + 1.7) * a)
      camera.rotateZ(Math.sin(t * 47 + 0.4) * a * 0.6)
    }

    const wanted = fov + f.fov
    if (Math.abs(wanted - fovNow.current) > 0.01) {
      camera.fov = fovNow.current = wanted
      camera.updateProjectionMatrix()
    }
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
        autoRotate={spin !== 0}
        autoRotateSpeed={spin}
      />
    </>
  )
}
