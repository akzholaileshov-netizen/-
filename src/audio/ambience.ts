/**
 * Орта шуы — толығымен процедуралық (Web Audio API), сыртқы дыбыс файлдары жоқ.
 * Төрт қабат: жел, жанартау гүрілі, жаңбыр, теңіз. Әр слайдтың өз қоспасы бар.
 * Әдепкіде дыбыс өшірулі; AudioContext тек пайдаланушы түймені басқанда жасалады.
 */

export type Layer = 'wind' | 'rumble' | 'rain' | 'sea'
export type Mix = Partial<Record<Layer, number>>

const LAYERS: Layer[] = ['wind', 'rumble', 'rain', 'sea']

/** Слайдтардың дыбыстық қоспалары (0…1). */
export const MIXES: Mix[] = [
  { wind: 0.12, rumble: 0.14 }, // 1. ғарыш: әлсіз гуіл
  { wind: 0.22, rumble: 0.3 }, // 2. қабаттар
  { wind: 0.3, rumble: 0.65 }, // 3. Пангея, Сібір трапптары
  { wind: 0.85, rumble: 0.06 }, // 4. триас шөлі
  { wind: 0.35, rain: 0.75 }, // 5. юра орманы, жаңбыр
  { wind: 0.3, sea: 0.4 }, // 6. бор, лагуна
  { wind: 0.16, rumble: 0.55 }, // 7. лава үстіндегі алаң
  { wind: 0.25, sea: 0.9 }, // 8. теңіз
  { wind: 0.3, rain: 0.18 }, // 9. өсімдіктер
  { wind: 0.38, rumble: 0.22 }, // 10. дала, жер қойнауы
  { wind: 0.45, rumble: 0.85 }, // 11. жанартау
  { wind: 0.12, rumble: 0.1 }, // 12. ғарыш
]

const MASTER = 0.55

function noiseBuffer(ctx: AudioContext, brown: boolean) {
  const length = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (brown) {
      // Қоңыр шу: ақ шудың интегралы — төмен жиілікті гүріл
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    } else {
      data[i] = white
    }
  }
  return buffer
}

class Ambience {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private gains = {} as Record<Layer, GainNode>
  private mix: Mix = {}
  private enabled = false
  private hushTimer = 0

  private build() {
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    this.ctx = ctx
    this.master = master

    const white = noiseBuffer(ctx, false)
    const brown = noiseBuffer(ctx, true)
    const loop = (buffer: AudioBuffer) => {
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.loop = true
      src.start()
      return src
    }
    /** Баяу тербеліс (LFO): param мәнін ± depth шамасына өзгертіп тұрады. */
    const lfo = (frequency: number, depth: number, param: AudioParam) => {
      const osc = ctx.createOscillator()
      osc.frequency.value = frequency
      const amount = ctx.createGain()
      amount.gain.value = depth
      osc.connect(amount).connect(param)
      osc.start()
    }
    const filter = (type: BiquadFilterType, frequency: number, q = 0.7) => {
      const f = ctx.createBiquadFilter()
      f.type = type
      f.frequency.value = frequency
      f.Q.value = q
      return f
    }
    const gain = (value: number) => {
      const g = ctx.createGain()
      g.gain.value = value
      return g
    }
    for (const name of LAYERS) {
      this.gains[name] = gain(0)
      this.gains[name].connect(master)
    }

    // Жел: жолақты сүзгіден өткен шу, екпіні мен «ысқырығы» баяу өзгеріп тұрады
    const windBand = filter('bandpass', 520, 0.6)
    const windSwell = gain(0.6)
    lfo(0.07, 260, windBand.frequency)
    lfo(0.113, 0.32, windSwell.gain)
    loop(white).connect(windBand).connect(windSwell).connect(this.gains.wind)

    // Жанартау гүрілі: төмен жиілікті қоңыр шу + әлсіз суб-бас
    const rumbleSwell = gain(0.7)
    lfo(0.13, 0.28, rumbleSwell.gain)
    loop(brown).connect(filter('lowpass', 115)).connect(rumbleSwell).connect(this.gains.rumble)
    const sub = ctx.createOscillator()
    sub.frequency.value = 41
    sub.start()
    sub.connect(gain(0.2)).connect(rumbleSwell)

    // Жаңбыр: жоғары жиілікті сыбдыр
    loop(white).connect(filter('highpass', 1900)).connect(filter('lowpass', 8500)).connect(gain(0.32)).connect(this.gains.rain)

    // Теңіз: баяу соғатын толқын + көбіктің сыбдыры
    const waves = gain(0.5)
    lfo(0.1, 0.42, waves.gain)
    loop(brown).connect(filter('lowpass', 420)).connect(waves).connect(this.gains.sea)
    const surf = gain(0.06)
    lfo(0.1, 0.05, surf.gain)
    loop(white).connect(filter('bandpass', 1500, 0.5)).connect(surf).connect(this.gains.sea)
  }

  private apply(seconds: number) {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    for (const name of LAYERS) {
      const g = this.gains[name].gain
      g.cancelScheduledValues(now)
      g.setTargetAtTime(this.mix[name] ?? 0, now, seconds / 3)
    }
  }

  /** Түймені басқан сәтте (пайдаланушы әрекеті ішінде) шақырылуы тиіс — браузер сонда ғана дыбысқа рұқсат береді. */
  setEnabled(on: boolean, mix?: Mix) {
    this.enabled = on
    if (on && !this.ctx) {
      try {
        this.build()
      } catch {
        return
      }
    }
    if (!this.ctx || !this.master) return
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    if (on) {
      void this.ctx.resume()
      if (mix) this.mix = mix
      this.apply(0.6)
      this.master.gain.setTargetAtTime(MASTER, now, 0.4)
    } else {
      this.master.gain.setTargetAtTime(0, now, 0.15)
      const ctx = this.ctx
      window.setTimeout(() => {
        if (!this.enabled) void ctx.suspend()
      }, 900)
    }
  }

  /** Слайд ауысқанда: жаңа қоспаға баяу өту. */
  setMix(mix: Mix) {
    this.mix = mix
    window.clearTimeout(this.hushTimer)
    if (this.enabled) this.apply(2.4)
  }

  /** Соқтығысу: төмендей түсетін бас соққысы мен жарылыс шуы, одан кейін — тыныштық. */
  impact(silence = 9) {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.enabled) return
    const now = ctx.currentTime

    const boom = ctx.createOscillator()
    boom.frequency.setValueAtTime(78, now)
    boom.frequency.exponentialRampToValueAtTime(24, now + 3.2)
    const boomGain = ctx.createGain()
    boomGain.gain.setValueAtTime(0.0001, now)
    boomGain.gain.exponentialRampToValueAtTime(1.5, now + 0.03)
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2)
    boom.connect(boomGain).connect(this.master)
    boom.start(now)
    boom.stop(now + 4.4)

    const blast = ctx.createBufferSource()
    blast.buffer = noiseBuffer(ctx, true)
    const sweep = ctx.createBiquadFilter()
    sweep.type = 'lowpass'
    sweep.frequency.setValueAtTime(2400, now)
    sweep.frequency.exponentialRampToValueAtTime(70, now + 3)
    const blastGain = ctx.createGain()
    blastGain.gain.setValueAtTime(1.6, now)
    blastGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6)
    blast.connect(sweep).connect(blastGain).connect(this.master)
    blast.start(now)
    blast.stop(now + 3.8)

    // Тыныштық: орта шуы түгел сөнеді де, біраздан соң баяу қайта оралады
    for (const name of LAYERS) {
      const g = this.gains[name].gain
      g.cancelScheduledValues(now)
      g.setTargetAtTime(0, now + 0.4, 0.5)
    }
    window.clearTimeout(this.hushTimer)
    this.hushTimer = window.setTimeout(() => {
      if (this.enabled) this.apply(8)
    }, silence * 1000)
  }
}

export const ambience = new Ambience()
