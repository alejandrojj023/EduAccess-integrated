"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Eye, Ear, Volume2, Target, Clock,
  CheckCircle2, AlertTriangle, AlertOctagon, Printer,
  ShieldAlert, ArrowLeft, Check, X, Play, ChevronRight, Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ScreeningTestProps { onBack: () => void }

type Phase = "welcome" | "a1" | "a3" | "pause_ab" | "b1" | "b2" | "b3" | "results"

interface Results {
  a1: { correct: boolean; sizeLevel: number }[]
  a2Presses: number
  a3: { hits: number; total: number }
  b1: { correct: boolean; noise: boolean }[]
  b2: { maxLen: number; errors: number }
  b3: boolean[]
}

/* ─────────────── DATA ─────────────── */

const A1_ITEMS = [
  { emoji: "🏠", opts: ["🚗", "🌸", "⭐", "🏠"] },
  { emoji: "🚗", opts: ["🚗", "🏠", "🐟", "🌙"] },
  { emoji: "⭐", opts: ["🌸", "⭐", "🚗", "🍎"] },
  { emoji: "🐟", opts: ["🏠", "🌙", "🐦", "🐟"] },
  { emoji: "🌙", opts: ["⭐", "🚗", "🌙", "🍎"] },
  { emoji: "🍎", opts: ["🌸", "🐦", "🏠", "🍎"] },
  { emoji: "🌸", opts: ["🍎", "🌸", "⭐", "🐟"] },
  { emoji: "🐦", opts: ["🌸", "🚗", "🐦", "🌙"] },
  { emoji: "☀️", opts: ["⭐", "☀️", "🏠", "🐦"] },
]
const A1_SIZES_PX = [80, 70, 60, 50, 42, 35, 28, 24, 18]

const B1_ITEMS = [
  { word: "casa",   emoji: "🏠", opts: ["🏠", "🚗", "📚", "🌳"], noise: true  },
  { word: "gato",   emoji: "🐱", opts: ["🐶", "🐱", "🐟", "🐦"], noise: true  },
  { word: "árbol",  emoji: "🌳", opts: ["🌵", "🌸", "🌳", "🍎"], noise: true  },
  { word: "libro",  emoji: "📚", opts: ["📚", "🎒", "✏️", "🖊️"], noise: false },
  { word: "pelota", emoji: "⚽", opts: ["⚾", "🏀", "⚽", "🎾"],  noise: false },
  { word: "zapato", emoji: "👟", opts: ["👟", "👒", "🧤", "🧢"],  noise: false },
]

const B2_ROUNDS = [
  { seq: ["🐱", "🐶"],              pool: ["🐱", "🐶", "🌸", "⭐", "🏠", "🚗"] },
  { seq: ["🌸", "⭐", "🏠"],        pool: ["🐱", "🌸", "⭐", "🏠", "🚗", "🍎"] },
  { seq: ["🚗", "🍎", "🌙", "🐟"],  pool: ["🚗", "🍎", "🌙", "🐟", "🐦", "⭐"] },
]

const B3_PATTERNS = [
  { pattern: [true, false]          },
  { pattern: [false, true]          },
  { pattern: [true, true, false]    },
  { pattern: [false, false, true]   },
  { pattern: [true, false, true]    },
  { pattern: [false, true, false]   },
]

/* ─────────────── AUDIO ─────────────── */

function playBeep(high: boolean, durationMs = 400): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = high ? 880 : 440
      osc.type = "sine"
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)
      osc.start(); osc.stop(ctx.currentTime + durationMs / 1000)
      setTimeout(resolve, durationMs + 150)
    } catch { resolve() }
  })
}

function speakWord(word: string, fast = false) {
  if (!("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(word)
  u.lang = "es-ES"; u.rate = fast ? 1.5 : 0.85; u.pitch = fast ? 1.3 : 1.0
  window.speechSynthesis.speak(u)
}

/* ─────────────── SHARED UI ─────────────── */

function DocenteHint({ text }: { text: string }) {
  return (
    <div className="flex gap-3 p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs leading-relaxed">
      <span className="text-base shrink-0 mt-0.5">👨‍🏫</span>
      <p><span className="font-bold">Docente: </span>{text}</p>
    </div>
  )
}

function ModuleTag({ color, text }: { color: string; text: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${color}`}>
      {text}
    </span>
  )
}

function StepDots({ current, total, color = "bg-primary" }: { current: number; total: number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-500 ${
            i < current
              ? `${color} w-2 h-2`
              : i === current
                ? `${color} w-4 h-2 opacity-60`
                : "bg-muted-foreground/20 w-2 h-2"
          }`}
        />
      ))}
      <span className="text-[11px] text-muted-foreground font-medium ml-1">{current + 1}/{total}</span>
    </div>
  )
}

function FeedbackBadge({ correct }: { correct: boolean }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center rounded-2xl transition-all duration-300 ${
      correct ? "bg-green-500/90" : "bg-red-400/90"
    }`}>
      <div className="flex flex-col items-center gap-1">
        {correct
          ? <Check className="w-8 h-8 text-white drop-shadow" />
          : <X className="w-8 h-8 text-white drop-shadow" />}
        <span className="text-white text-xs font-bold">{correct ? "¡Correcto!" : "Incorrecto"}</span>
      </div>
    </div>
  )
}

function A2Button({ presses, onPress }: { presses: number; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl border-2 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 active:scale-95 transition-all shadow-sm shrink-0"
      aria-label="El niño reporta que no ve bien"
    >
      <span className="text-xl leading-none">👁️</span>
      <span className="text-[9px] font-bold leading-tight text-center">No veo<br/>bien</span>
      {presses > 0 && (
        <span className="bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
          {presses}×
        </span>
      )}
    </button>
  )
}

/* ─────────────── A1 ─────────────── */

function A1Screen({ a2Presses, onA2Press, onComplete }: {
  a2Presses: number
  onA2Press: () => void
  onComplete: (r: { correct: boolean; sizeLevel: number }[]) => void
}) {
  const [idx, setIdx] = useState(0)
  const [opts, setOpts] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<"ok" | "err" | null>(null)
  const resultsRef = useRef<{ correct: boolean; sizeLevel: number }[]>([])

  const item = A1_ITEMS[idx]
  const sizePx = A1_SIZES_PX[idx]

  useEffect(() => {
    setOpts([...item.opts].sort(() => Math.random() - 0.5))
    setSelected(null)
    setFeedback(null)
  }, [idx])

  const handlePick = (opt: string) => {
    if (feedback) return
    setSelected(opt)
    const correct = opt === item.emoji
    setFeedback(correct ? "ok" : "err")
    resultsRef.current = [...resultsRef.current, { correct, sizeLevel: idx + 1 }]
    setTimeout(() => {
      if (idx < A1_ITEMS.length - 1) setIdx((i) => i + 1)
      else onComplete(resultsRef.current)
    }, 800)
  }

  const isSmall = idx >= 6

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <ModuleTag color="bg-blue-100 text-blue-700" text="Módulo A · Visión 1" />
          <h2 className="text-xl font-black text-foreground leading-tight">¿Cuál figura<br/>es igual?</h2>
          <StepDots current={idx} total={9} color="bg-blue-500" />
        </div>
        <A2Button presses={a2Presses} onPress={onA2Press} />
      </div>

      <DocenteHint text="Muestra la pantalla a ~40 cm del niño. La figura se hace más pequeña en cada ronda. Pide que toque la imagen idéntica." />

      <div className="relative overflow-hidden rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex flex-col items-center gap-3 shadow-xl shadow-blue-200">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} aria-hidden />
        <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Encuentra esta figura</p>
        <div className="w-32 h-32 rounded-2xl bg-white/95 shadow-2xl flex items-center justify-center border-4 border-white">
          <span style={{ fontSize: sizePx, lineHeight: 1 }} role="img" aria-label="Figura objetivo">{item.emoji}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-1.5 rounded-full transition-all duration-700 ${isSmall ? "bg-amber-300 w-20" : "bg-blue-300 w-12"}`} />
          <span className="text-xs text-blue-200 font-medium">{isSmall ? "⚠️ Tamaño pequeño" : `Nivel ${idx + 1} / 9`}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {opts.map((opt) => {
          const isSel = selected === opt
          const isCorrect = opt === item.emoji
          return (
            <button
              key={opt}
              onClick={() => handlePick(opt)}
              disabled={!!feedback}
              className={`relative rounded-2xl py-7 text-5xl flex items-center justify-center transition-all duration-200 shadow-sm border-2 overflow-hidden ${
                feedback
                  ? isSel
                    ? isCorrect ? "border-green-400 bg-green-50 scale-95 shadow-green-200 shadow-md" : "border-red-400 bg-red-50"
                    : isCorrect ? "border-green-300 bg-green-50/50" : "border-border bg-muted/30 opacity-50"
                  : "border-border bg-card hover:border-blue-400 hover:bg-blue-50 hover:shadow-md active:scale-95 hover:-translate-y-0.5"
              }`}
              aria-label={opt}
            >
              {opt}
              {!!feedback && isSel && <FeedbackBadge correct={isCorrect} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────── A3 ─────────────── */

function A3Screen({ a2Presses, onA2Press, onComplete }: {
  a2Presses: number
  onA2Press: () => void
  onComplete: (r: { hits: number; total: number }) => void
}) {
  const [started, setStarted] = useState(false)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [timeLeft, setTimeLeft] = useState(20)
  const hitsRef  = useRef(0)
  const totalRef = useRef(0)
  const doneRef  = useRef(false)
  const [displayHits, setDisplayHits] = useState(0)

  useEffect(() => {
    if (!started) return
    const iv = setInterval(() => setPos({ x: 14 + Math.random() * 72, y: 14 + Math.random() * 72 }), 1400)
    return () => clearInterval(iv)
  }, [started])

  useEffect(() => {
    if (!started) return
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1 && !doneRef.current) {
          doneRef.current = true
          clearInterval(iv)
          setTimeout(() => onComplete({ hits: hitsRef.current, total: totalRef.current }), 0)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [started, onComplete])

  const handleHit = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    hitsRef.current += 1; totalRef.current += 1
    setDisplayHits((h) => h + 1)
    setPos({ x: 14 + Math.random() * 72, y: 14 + Math.random() * 72 })
  }, [])

  const handleMiss = useCallback(() => { totalRef.current += 1 }, [])

  if (!started) {
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <ModuleTag color="bg-blue-100 text-blue-700" text="Módulo A · Visión 2" />
            <h2 className="text-xl font-black text-foreground">Sigue el punto</h2>
          </div>
          <A2Button presses={a2Presses} onPress={onA2Press} />
        </div>
        <DocenteHint text="Un punto azul se moverá 20 segundos. El niño debe tocarlo cada vez que aparezca." />
        <div className="relative overflow-hidden rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center space-y-5">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} aria-hidden />
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
            <div className="relative w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-2xl text-5xl">🔵</div>
          </div>
          <div>
            <p className="text-xl font-black text-white">¡Toca el círculo azul!</p>
            <p className="text-sm text-blue-200 mt-1">Cada vez que aparezca, tócalo rápido</p>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full">
            <Clock className="w-4 h-4" /> 20 segundos
          </div>
        </div>
        <Button className="w-full h-14 gap-2 text-base font-bold shadow-lg rounded-2xl" onClick={() => setStarted(true)}>
          <Play className="w-5 h-5" /> ¡Comenzar!
        </Button>
      </div>
    )
  }

  const urgent = timeLeft <= 5
  const warn   = timeLeft <= 10 && !urgent

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <ModuleTag color="bg-blue-100 text-blue-700" text="Módulo A · Visión 2" />
          <h2 className="text-lg font-black text-foreground mt-1">¡Toca el punto azul!</h2>
        </div>
        <A2Button presses={a2Presses} onPress={onA2Press} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-4 py-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Target className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wide">Tocados</p>
            <p className="text-3xl font-black text-emerald-700 leading-none">{displayHits}</p>
          </div>
        </div>
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border-2 transition-colors duration-500 ${urgent ? "bg-red-50 border-red-300" : warn ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${urgent ? "bg-red-100" : warn ? "bg-amber-100" : "bg-blue-100"}`}>
            <Clock className={`w-5 h-5 ${urgent ? "text-red-600" : warn ? "text-amber-600" : "text-blue-600"}`} />
          </div>
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-wide ${urgent ? "text-red-600" : warn ? "text-amber-600" : "text-blue-600"}`}>Tiempo</p>
            <p className={`text-3xl font-black leading-none ${urgent ? "text-red-600" : warn ? "text-amber-600" : "text-blue-700"}`}>{timeLeft}s</p>
          </div>
        </div>
      </div>
      <div
        onClick={handleMiss}
        className="relative w-full rounded-3xl overflow-hidden border-2 border-border cursor-crosshair select-none"
        style={{ height: 256, touchAction: "none", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #ede9fe 100%)" }}
        aria-label="Área de juego — toca el punto azul"
      >
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)", backgroundSize: "20px 20px" }} aria-hidden />
        <button
          onClick={handleHit}
          onTouchStart={handleHit as any}
          className="absolute flex items-center justify-center rounded-full text-4xl active:scale-90 border-4 border-blue-100 bg-blue-500"
          style={{
            width: 64, height: 64,
            left: `${pos.x}%`, top: `${pos.y}%`,
            transform: "translate(-50%,-50%)",
            transition: "left 0.45s cubic-bezier(.34,1.56,.64,1), top 0.45s cubic-bezier(.34,1.56,.64,1)",
            boxShadow: "0 8px 32px rgba(59,130,246,0.5)",
          }}
          aria-label="Punto azul"
        >🔵</button>
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted/30">
          <div className={`h-full rounded-full transition-all duration-1000 ${urgent ? "bg-red-500" : warn ? "bg-amber-400" : "bg-blue-500"}`} style={{ width: `${(timeLeft / 20) * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

/* ─────────────── PAUSA ─────────────── */

function ModulePause({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-5 text-center">
      <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-600 p-10">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" aria-hidden />
        <div className="relative space-y-3">
          <div className="text-6xl animate-bounce">🎉</div>
          <h2 className="text-2xl font-black text-white">¡Módulo A completado!</h2>
          <p className="text-emerald-100 text-sm">Excelente trabajo. Tomen un descanso breve.</p>
        </div>
      </div>
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-3xl p-5 text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-200">
            <Ear className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-foreground">Módulo B — Audición</p>
            <p className="text-xs text-muted-foreground">3 actividades · ~6 min</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ahora el niño deberá <strong className="text-foreground">escuchar con atención</strong>. Busca un ambiente silencioso antes de continuar.
        </p>
        <div className="flex gap-2.5 text-xs text-violet-700 bg-violet-100 rounded-2xl p-3 border border-violet-200">
          <span className="text-base shrink-0">🔇</span>
          <span>Cierra puertas y ventanas si es posible. El silencio es clave para este módulo.</span>
        </div>
      </div>
      <Button className="w-full h-14 gap-2 text-base font-bold shadow-lg rounded-2xl bg-violet-600 hover:bg-violet-700" onClick={onContinue}>
        Comenzar Módulo B <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  )
}

/* ─────────────── B1 ─────────────── */

function B1Screen({ onComplete }: { onComplete: (r: { correct: boolean; noise: boolean }[]) => void }) {
  const [idx, setIdx] = useState(0)
  const [opts, setOpts] = useState<string[]>([])
  const [played, setPlayed] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<boolean | null>(null)
  const resultsRef = useRef<{ correct: boolean; noise: boolean }[]>([])
  const item = B1_ITEMS[idx]

  useEffect(() => {
    setOpts([...item.opts].sort(() => Math.random() - 0.5))
    setPlayed(false); setSelected(null); setFeedback(null)
  }, [idx])

  const handlePlay = () => { speakWord(item.word, item.noise); setPlayed(true) }

  const handlePick = (opt: string) => {
    if (!played || feedback !== null) return
    setSelected(opt)
    const correct = opt === item.emoji
    setFeedback(correct)
    resultsRef.current = [...resultsRef.current, { correct, noise: item.noise }]
    setTimeout(() => {
      if (idx < B1_ITEMS.length - 1) setIdx((i) => i + 1)
      else onComplete(resultsRef.current)
    }, 800)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <ModuleTag color="bg-violet-100 text-violet-700" text="Módulo B · Audición 1" />
        <h2 className="text-xl font-black text-foreground">¿Qué palabra escuchas?</h2>
        <StepDots current={idx} total={6} color="bg-violet-500" />
      </div>
      <DocenteHint text={item.noise ? "Palabra a velocidad alta (simula ruido). El niño debe identificar qué escuchó." : "Condición limpia — voz natural. El niño identifica la imagen correspondiente."} />
      <div className={`relative overflow-hidden rounded-3xl border-2 p-6 flex flex-col items-center gap-4 ${item.noise ? "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300" : "bg-gradient-to-br from-violet-500 to-purple-700 border-violet-300"}`}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "20px 20px" }} aria-hidden />
        {item.noise && <span className="relative text-[11px] font-black text-amber-900 bg-amber-200 border border-amber-300 px-3 py-1 rounded-full uppercase tracking-wide">🔊 Con ruido de fondo</span>}
        <div className="relative w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shadow-xl">
          <Volume2 className="w-8 h-8 text-white" />
        </div>
        <button
          onClick={handlePlay}
          className={`relative h-12 px-8 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all active:scale-95 shadow-lg ${played ? "bg-white/20 text-white border-2 border-white/30 hover:bg-white/30" : "bg-white text-gray-800 hover:bg-gray-50 shadow-white/20"}`}
        >
          <Volume2 className="w-4 h-4" />
          {played ? "Escuchar de nuevo" : "Escuchar la palabra"}
        </button>
        {!played && <p className="relative text-xs text-white/80">Toca el botón para escuchar</p>}
      </div>
      <div className={`grid grid-cols-2 gap-3 transition-all duration-300 ${!played ? "opacity-30 pointer-events-none blur-[1px]" : ""}`}>
        {opts.map((opt) => {
          const isSel = selected === opt
          const isCorrect = opt === item.emoji
          return (
            <button
              key={opt}
              onClick={() => handlePick(opt)}
              disabled={!played || feedback !== null}
              className={`relative rounded-2xl py-7 text-5xl flex items-center justify-center transition-all duration-200 shadow-sm border-2 overflow-hidden ${
                feedback !== null
                  ? isSel ? isCorrect ? "border-green-400 bg-green-50 shadow-md scale-95" : "border-red-400 bg-red-50" : isCorrect ? "border-green-300 bg-green-50/50" : "border-border bg-muted/30 opacity-40"
                  : "border-border bg-card hover:border-violet-400 hover:bg-violet-50 hover:shadow-md active:scale-95 hover:-translate-y-0.5"
              }`}
              aria-label={opt}
            >
              {opt}
              {feedback !== null && isSel && <FeedbackBadge correct={isCorrect} />}
            </button>
          )
        })}
      </div>
      {!played && <p className="text-[11px] text-center text-muted-foreground">Escucha la palabra primero para desbloquear las opciones</p>}
    </div>
  )
}

/* ─────────────── B2 ─────────────── */

function B2Screen({ onComplete }: { onComplete: (r: { maxLen: number; errors: number }) => void }) {
  const [roundIdx, setRoundIdx] = useState(0)
  const [phase, setPhase] = useState<"show" | "recall">("show")
  const [showingIdx, setShowingIdx] = useState(-1)
  const [selected, setSelected] = useState<string[]>([])
  const [feedback, setFeedback] = useState<boolean | null>(null)
  const [shuffledPool, setShuffledPool] = useState<string[]>([])
  const maxLenRef = useRef(0)
  const errorsRef = useRef(0)
  const round = B2_ROUNDS[roundIdx]

  useEffect(() => {
    setShuffledPool([...round.pool].sort(() => Math.random() - 0.5))
    setPhase("show"); setSelected([]); setFeedback(null); setShowingIdx(-1)
  }, [roundIdx])

  useEffect(() => {
    if (phase !== "show") return
    setShowingIdx(-1)
    let i = -1
    const iv = setInterval(() => {
      i++
      if (i < round.seq.length) { setShowingIdx(i) }
      else { clearInterval(iv); setTimeout(() => { setShowingIdx(-1); setPhase("recall") }, 700) }
    }, 900)
    return () => clearInterval(iv)
  }, [phase, round])

  const handlePick = (emoji: string) => {
    if (feedback !== null) return
    const next = [...selected, emoji]
    setSelected(next)
    if (next.length === round.seq.length) {
      const correct = next.every((e, i) => e === round.seq[i])
      errorsRef.current += next.filter((e, i) => e !== round.seq[i]).length
      setFeedback(correct)
      if (correct) maxLenRef.current = Math.max(maxLenRef.current, round.seq.length)
      setTimeout(() => {
        if (roundIdx < B2_ROUNDS.length - 1) setRoundIdx((r) => r + 1)
        else onComplete({ maxLen: maxLenRef.current, errors: errorsRef.current })
      }, 900)
    }
  }

  if (phase === "show") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <ModuleTag color="bg-violet-100 text-violet-700" text="Módulo B · Audición 2" />
          <h2 className="text-xl font-black text-foreground">Memoriza el orden</h2>
          <StepDots current={roundIdx} total={3} color="bg-violet-500" />
        </div>
        <DocenteHint text="Las figuras aparecerán de una en una. El niño debe observar con atención el orden." />
        <div className="relative overflow-hidden rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-600 to-purple-700 py-12 flex flex-col items-center gap-6">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} aria-hidden />
          <p className="relative text-sm font-bold text-violet-200 uppercase tracking-wide">Observa el orden</p>
          <div className="relative flex gap-4 flex-wrap justify-center px-6">
            {round.seq.map((e, i) => (
              <div key={i} className={`flex flex-col items-center gap-2 transition-all duration-300 ${i === showingIdx ? "scale-125" : i < showingIdx ? "scale-90 opacity-40" : "scale-90 opacity-10"}`}>
                <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-5xl shadow-lg ${i === showingIdx ? "border-white bg-white shadow-2xl" : "border-white/30 bg-white/10"}`}>
                  {i <= showingIdx ? e : ""}
                </div>
                {i === showingIdx && <span className="text-xs font-black text-white bg-white/20 px-2 py-0.5 rounded-full">{i + 1} de {round.seq.length}</span>}
              </div>
            ))}
          </div>
          {showingIdx < 0 && <p className="relative text-xs text-violet-300 animate-pulse">Preparando...</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <ModuleTag color="bg-violet-100 text-violet-700" text="Módulo B · Audición 2" />
        <h2 className="text-xl font-black text-foreground">¿En qué orden estaban?</h2>
        <StepDots current={roundIdx} total={3} color="bg-violet-500" />
      </div>
      <DocenteHint text="El niño debe tocar las figuras en el mismo orden. Observa si duda o las coloca incorrectamente." />
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-3xl py-5 px-4">
        <p className="text-xs text-center text-violet-600 font-bold mb-4 uppercase tracking-wide">Tu respuesta</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {Array.from({ length: round.seq.length }).map((_, i) => {
            const filled = !!selected[i]
            const correct = filled && selected[i] === round.seq[i]
            let cls = "border-dashed border-violet-200 bg-white/60"
            if (filled) cls = feedback === null ? "border-violet-500 bg-white shadow-lg border-solid" : correct ? "border-green-400 bg-green-50 border-solid" : "border-red-400 bg-red-50 border-solid"
            return (
              <div key={i} className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-4xl transition-all duration-200 ${cls}`}>
                {selected[i] ?? <span className="text-violet-300 text-xl font-black">{i + 1}</span>}
              </div>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {shuffledPool.map((e, i) => {
          const used = selected.includes(e)
          return (
            <button
              key={i}
              onClick={() => handlePick(e)}
              disabled={used || feedback !== null}
              className={`rounded-2xl py-5 text-4xl border-2 shadow-sm transition-all duration-200 ${used ? "opacity-15 cursor-not-allowed border-border bg-muted" : "border-border bg-card hover:border-violet-400 hover:bg-violet-50 hover:shadow-md active:scale-95 hover:-translate-y-0.5"}`}
              aria-label={e}
            >{e}</button>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────── B3 ─────────────── */

function B3Screen({ onComplete }: { onComplete: (r: boolean[]) => void }) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [played, setPlayed] = useState(false)
  const [activeBeep, setActiveBeep] = useState(-1)
  const [feedback, setFeedback] = useState<boolean | null>(null)
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null)
  const [options, setOptions] = useState<boolean[][]>([])
  const resultsRef = useRef<boolean[]>([])
  const pat = B3_PATTERNS[idx]

  useEffect(() => {
    setPlayed(false); setPlaying(false); setActiveBeep(-1); setFeedback(null); setSelectedOpt(null)
    const sameLen = B3_PATTERNS.filter((p, i) => i !== idx && p.pattern.length === pat.pattern.length).map((p) => p.pattern)
    setOptions([...sameLen.slice(0, 2), pat.pattern].sort(() => Math.random() - 0.5))
  }, [idx])

  const handlePlay = async () => {
    setPlaying(true)
    for (let i = 0; i < pat.pattern.length; i++) { setActiveBeep(i); await playBeep(pat.pattern[i], 400) }
    setActiveBeep(-1); setPlayed(true); setPlaying(false)
  }

  const handleAnswer = (oi: number) => {
    if (!played || feedback !== null) return
    setSelectedOpt(oi)
    const correct = JSON.stringify(options[oi]) === JSON.stringify(pat.pattern)
    setFeedback(correct)
    resultsRef.current = [...resultsRef.current, correct]
    setTimeout(() => {
      if (idx < B3_PATTERNS.length - 1) setIdx((i) => i + 1)
      else onComplete(resultsRef.current)
    }, 800)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <ModuleTag color="bg-violet-100 text-violet-700" text="Módulo B · Audición 3" />
        <h2 className="text-xl font-black text-foreground">¿Cómo sonó?</h2>
        <StepDots current={idx} total={6} color="bg-violet-500" />
      </div>
      <DocenteHint text="Sonidos altos (↑) y bajos (↓). El niño escucha la secuencia y elige el patrón correcto." />
      <div className="relative overflow-hidden rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-600 to-purple-700 p-6 flex flex-col items-center gap-5">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "20px 20px" }} aria-hidden />
        <div className="relative flex gap-4 items-end min-h-[72px]">
          {pat.pattern.map((high, i) => {
            const isActive = i === activeBeep
            const wasDone = played && activeBeep < 0
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className={`text-2xl font-black transition-all duration-200 ${isActive ? "text-white scale-150 drop-shadow-lg" : wasDone ? (high ? "text-violet-200" : "text-purple-300") : "text-white/20"}`}>{high ? "↑" : "↓"}</span>
                <div className={`rounded-full transition-all duration-200 ${isActive ? high ? "w-10 bg-yellow-300 shadow-lg shadow-yellow-200" : "w-10 bg-blue-300 shadow-lg shadow-blue-200" : wasDone ? high ? "w-6 bg-violet-300" : "w-6 bg-purple-400/60" : "w-4 bg-white/20"}`}
                  style={{ height: isActive ? (high ? 56 : 36) : wasDone ? (high ? 36 : 24) : 20 }} />
                {isActive && <div className={`w-2 h-2 rounded-full animate-bounce ${high ? "bg-yellow-300" : "bg-blue-300"}`} />}
              </div>
            )
          })}
        </div>
        <button
          onClick={handlePlay}
          disabled={playing}
          className={`relative h-12 px-8 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all active:scale-95 shadow-lg ${played ? "bg-white/20 text-white border-2 border-white/30 hover:bg-white/30" : "bg-white text-gray-800 hover:bg-gray-50"} ${playing ? "opacity-70 cursor-wait" : ""}`}
        >
          <Volume2 className="w-4 h-4" />
          {playing ? "Reproduciendo..." : played ? "Escuchar de nuevo" : "Escuchar los sonidos"}
        </button>
        {!played && !playing && <p className="relative text-xs text-violet-200">Toca para escuchar la secuencia</p>}
      </div>
      <div className={`space-y-2.5 transition-all duration-300 ${!played ? "opacity-25 pointer-events-none" : ""}`}>
        <p className="text-sm font-bold text-center text-foreground">Elige el patrón que escuchaste:</p>
        {options.map((opt, oi) => {
          const isSel = selectedOpt === oi
          const isCorrect = JSON.stringify(opt) === JSON.stringify(pat.pattern)
          return (
            <button
              key={oi}
              onClick={() => handleAnswer(oi)}
              disabled={feedback !== null}
              className={`relative w-full rounded-2xl px-6 py-4 flex items-center justify-between gap-4 transition-all duration-200 shadow-sm border-2 ${
                feedback !== null
                  ? isSel ? isCorrect ? "border-green-400 bg-green-50 shadow-green-100 shadow-md" : "border-red-400 bg-red-50" : isCorrect ? "border-green-300 bg-green-50/40" : "border-border bg-muted/20 opacity-40"
                  : "border-border bg-card hover:border-violet-400 hover:bg-violet-50 hover:shadow-md active:scale-[0.98]"
              }`}
            >
              <span className="text-xs text-muted-foreground font-semibold w-6 shrink-0">{String.fromCharCode(65 + oi)}</span>
              <div className="flex-1 flex items-end justify-center gap-3">
                {opt.map((high, j) => (
                  <div key={j} className="flex flex-col items-center gap-1">
                    <span className={`text-xl font-black ${feedback !== null && isSel ? isCorrect ? "text-green-600" : "text-red-500" : high ? "text-violet-600" : "text-slate-400"}`}>{high ? "↑" : "↓"}</span>
                    <div className={`w-3 rounded-full ${feedback !== null && isSel ? isCorrect ? "bg-green-400" : "bg-red-300" : high ? "bg-violet-500" : "bg-slate-300"}`} style={{ height: high ? 28 : 18 }} />
                  </div>
                ))}
              </div>
              {feedback !== null && isSel
                ? <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow ${isCorrect ? "bg-green-500" : "bg-red-400"}`}>{isCorrect ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}</span>
                : <span className="w-7 shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────── RESULTS ─────────────── */

function AlertRow({ label, detail, alert }: { label: string; detail: string; alert: boolean }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${alert ? "bg-red-400" : "bg-emerald-400"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
      </div>
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${alert ? "bg-red-100" : "bg-emerald-100"}`}>
        {alert ? <X className="w-4 h-4 text-red-500" /> : <Check className="w-4 h-4 text-emerald-600" />}
      </div>
    </div>
  )
}

function Rec({ icon, text, bold = false }: { icon: string; text: string; bold?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="shrink-0 text-base">{icon}</span>
      <span className={bold ? "font-semibold text-foreground" : "text-muted-foreground"}>{text}</span>
    </div>
  )
}

function ResultsScreen({ results, onBack }: { results: Results; onBack: () => void }) {
  const a1Correct   = results.a1.filter((r) => r.correct).length
  const a1MinOk     = results.a1.filter((r) => r.correct).reduce((m, r) => Math.max(m, r.sizeLevel), 0)
  const alertA1     = a1Correct < 6
  const alertA2     = results.a2Presses >= 2
  const alertA3     = results.a3.total > 0 && results.a3.hits / results.a3.total < 0.45
  const visionAlerts = [alertA1, alertA2, alertA3].filter(Boolean).length

  const b1Total     = results.b1.filter((r) => r.correct).length
  const b1Noise     = results.b1.filter((r) => r.correct && r.noise).length
  const alertB1     = b1Total < 4 || b1Noise < 2
  const alertB2     = results.b2.maxLen < 3 || results.b2.errors >= 3
  const b3Correct   = results.b3.filter(Boolean).length
  const alertB3     = b3Correct < 4
  const audioAlerts = [alertB1, alertB2, alertB3].filter(Boolean).length

  const visionMode = visionAlerts >= 2
  const tpacMode   = audioAlerts >= 2
  const total      = visionAlerts + audioAlerts

  type Level = "ok" | "posible" | "requiere"
  const level: Level = total >= 4 || visionMode || tpacMode ? "requiere" : total >= 2 ? "posible" : "ok"

  const lvlCfg = {
    ok:       { label: "Sin señales de dificultad", sub: "El estudiante no presenta indicadores de alerta", Icon: CheckCircle2, gradient: "from-emerald-500 to-teal-600" },
    posible:  { label: "Posible dificultad",         sub: "Se recomienda seguimiento y estrategias de apoyo", Icon: AlertTriangle, gradient: "from-amber-500 to-orange-500" },
    requiere: { label: "Requiere atención",           sub: "Considerar derivación a especialista según el área", Icon: AlertOctagon, gradient: "from-red-500 to-rose-600" },
  }[level]

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h2 className="text-2xl font-black text-foreground">Resultado del tamizaje</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Confidencial · Solo para uso del docente</p>
      </div>
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${lvlCfg.gradient} p-6 text-white shadow-xl`}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-lg">
            <lvlCfg.Icon className="w-9 h-9 text-white" />
          </div>
          <div>
            <p className="text-xl font-black leading-tight">{lvlCfg.label}</p>
            <p className="text-sm text-white/80 mt-0.5 leading-relaxed">{lvlCfg.sub}</p>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-2 mt-4">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${visionAlerts >= 2 ? "bg-red-500/30 text-red-100" : visionAlerts === 1 ? "bg-amber-400/30 text-amber-100" : "bg-white/20 text-white"}`}>
            <Eye className="w-3.5 h-3.5" /> Visión: {visionAlerts} alerta{visionAlerts !== 1 ? "s" : ""}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${audioAlerts >= 2 ? "bg-red-500/30 text-red-100" : audioAlerts === 1 ? "bg-amber-400/30 text-amber-100" : "bg-white/20 text-white"}`}>
            <Ear className="w-3.5 h-3.5" /> Audición: {audioAlerts} alerta{audioAlerts !== 1 ? "s" : ""}
          </span>
          {visionMode && <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-blue-500/30 text-blue-100">→ Modo Alta Visibilidad</span>}
          {tpacMode   && <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-purple-500/30 text-purple-100">→ Modo TPAC</span>}
        </div>
      </div>

      <div className="rounded-3xl border-2 border-blue-100 overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center"><Eye className="w-4 h-4 text-white" /></div>
          <p className="font-black text-foreground text-sm">Módulo A — Visión</p>
          <span className={`ml-auto text-xs font-black px-2.5 py-1 rounded-full ${visionAlerts >= 2 ? "bg-red-100 text-red-700" : visionAlerts === 1 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{visionAlerts} alerta{visionAlerts !== 1 ? "s" : ""}</span>
        </div>
        <div className="divide-y divide-blue-50 px-4">
          <AlertRow label="A1 — Optotipos progresivos" detail={`${a1Correct}/9 correctas · nivel mín. ok: ${a1MinOk}`} alert={alertA1} />
          <AlertRow label="A2 — Autoreporte visual"    detail={`"No veo bien" presionado ${results.a2Presses} ${results.a2Presses === 1 ? "vez" : "veces"}`} alert={alertA2} />
          <AlertRow label="A3 — Seguimiento de punto"  detail={results.a3.total > 0 ? `${results.a3.hits}/${results.a3.total} aciertos (${Math.round((results.a3.hits/results.a3.total)*100)}%)` : "No registrado"} alert={alertA3} />
        </div>
      </div>

      <div className="rounded-3xl border-2 border-violet-100 overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-violet-50 border-b border-violet-100">
          <div className="w-8 h-8 rounded-xl bg-violet-500 flex items-center justify-center"><Ear className="w-4 h-4 text-white" /></div>
          <p className="font-black text-foreground text-sm">Módulo B — Audición</p>
          <span className={`ml-auto text-xs font-black px-2.5 py-1 rounded-full ${audioAlerts >= 2 ? "bg-red-100 text-red-700" : audioAlerts === 1 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{audioAlerts} alerta{audioAlerts !== 1 ? "s" : ""}</span>
        </div>
        <div className="divide-y divide-violet-50 px-4">
          <AlertRow label="B1 — Discriminación figura-fondo" detail={`${b1Total}/6 correctas · con ruido: ${b1Noise}/3`} alert={alertB1} />
          <AlertRow label="B2 — Memoria secuencial"          detail={`Máx. ${results.b2.maxLen} elementos · ${results.b2.errors} errores`} alert={alertB2} />
          <AlertRow label="B3 — Patrones de frecuencia"      detail={`${b3Correct}/6 patrones correctos`} alert={alertB3} />
        </div>
      </div>

      <div className="rounded-3xl border-2 border-border overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-muted/30 border-b border-border">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <p className="font-black text-foreground text-sm">Recomendaciones para el aula</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          {level === "ok" && <><Rec icon="✅" text="Mantener apoyos universales: buena iluminación y consignas breves." /><Rec icon="📅" text="Repetir tamizaje en 3–6 meses o ante cambios conductuales en el aula." /></>}
          {visionAlerts >= 1 && <><Rec icon="🪑" text="Ubicar al estudiante en los primeros lugares, al centro frente al pizarrón." /><Rec icon="🖨️" text="Material impreso con fuente mínimo 16 pt y alto contraste." /></>}
          {visionAlerts >= 2 && <Rec icon="⚠️" text="Sugerir evaluación con oftalmólogo u optómetra a la brevedad." bold />}
          {audioAlerts >= 1 && <><Rec icon="🗣️" text="Hablar de frente en voz clara y confirmar comprensión con preguntas cortas." /><Rec icon="🔇" text="Reducir el ruido ambiental durante actividades de escucha activa." /></>}
          {audioAlerts >= 2 && <Rec icon="⚠️" text="Sugerir evaluación audiológica o con especialista en Procesamiento Auditivo Central." bold />}
          {level === "requiere" && <Rec icon="📋" text="Comunicar hallazgos con lenguaje claro a la familia y documentar en el expediente escolar." bold />}
        </div>
      </div>

      <div className="flex gap-2.5 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-xs leading-relaxed">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Resultado orientativo para apoyo educativo. No reemplaza evaluación clínica por especialista. Información confidencial.</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 border-2 rounded-2xl gap-2 h-12" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Imprimir
        </Button>
        <Button variant="outline" className="flex-1 border-2 rounded-2xl gap-2 h-12" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
      </div>
    </div>
  )
}

/* ─────────────── STEP INDICATOR ─────────────── */

const STEPS = [
  { phase: "a1",  label: "Optotipos",      color: "bg-blue-500"    },
  { phase: "a3",  label: "Seguimiento",    color: "bg-blue-500"    },
  { phase: "b1",  label: "Discriminación", color: "bg-violet-500"  },
  { phase: "b2",  label: "Memoria",        color: "bg-violet-500"  },
  { phase: "b3",  label: "Patrones",       color: "bg-violet-500"  },
]

function GlobalProgress({ phase }: { phase: Phase }) {
  const stepIdx = STEPS.findIndex((s) => s.phase === phase)
  if (stepIdx < 0) return null
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1 items-center">
        {STEPS.map((s, i) => {
          const done   = i < stepIdx
          const active = i === stepIdx
          return (
            <div key={s.phase} className="flex items-center gap-1">
              <div className={`transition-all duration-500 rounded-full flex items-center justify-center ${done ? `${s.color} w-5 h-5` : active ? `${s.color} w-6 h-6 shadow-lg` : "bg-muted w-4 h-4"}`}>
                {done   && <Check className="w-3 h-3 text-white" />}
                {active && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 rounded-full transition-all duration-700 ${done ? s.color : "bg-muted"}`} style={{ width: 16 }} />}
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Actividad {stepIdx + 1} de {STEPS.length} · {STEPS[stepIdx].label}
      </p>
    </div>
  )
}

/* ─────────────── MAIN ─────────────── */

export function ScreeningTest({ onBack }: ScreeningTestProps) {
  const [phase, setPhase] = useState<Phase>("welcome")
  const [a2Presses, setA2Presses] = useState(0)
  const [results, setResults] = useState<Results>({
    a1: [], a2Presses: 0, a3: { hits: 0, total: 0 },
    b1: [], b2: { maxLen: 0, errors: 0 }, b3: [],
  })
  const handleA2 = useCallback(() => setA2Presses((p) => p + 1), [])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/6 blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-violet-500/6 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-5 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" /> Salir
          </button>
          {phase !== "welcome" && phase !== "pause_ab" && phase !== "results" && (
            <div className="flex-1"><GlobalProgress phase={phase} /></div>
          )}
        </div>

        {phase === "welcome" && (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-center">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} aria-hidden />
              <div className="relative space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 rounded-[1.5rem] bg-primary/40 blur-xl scale-125" aria-hidden />
                  <div className="relative w-24 h-24 rounded-[1.5rem] bg-primary flex items-center justify-center shadow-2xl">
                    <img src="/2.svg" alt="EduAccess" className="w-full h-full object-cover" aria-hidden />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">Test de Tamizaje</h1>
                  <p className="text-slate-400 text-sm mt-1">Evaluación orientativa visual y auditiva · 6 a 9 años</p>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full font-semibold">👁️ Módulo Visual</span>
                  <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-3 py-1 rounded-full font-semibold">👂 Módulo Auditivo</span>
                  <span className="text-xs bg-slate-700 text-slate-300 border border-slate-600 px-3 py-1 rounded-full font-semibold">⏱️ ~10 min</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-xs leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <p><strong>Aviso ético:</strong> Este instrumento no es un diagnóstico médico. Es una herramienta de orientación educativa. Los resultados deben manejarse con confidencialidad.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative overflow-hidden rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 space-y-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div><p className="font-black text-blue-800 text-sm">Módulo A</p><p className="text-xs text-blue-600 font-medium">Visión · 2 actividades</p></div>
                <ul className="text-[11px] text-blue-500 space-y-1">
                  <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400" />Optotipos</li>
                  <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400" />Seguimiento visual</li>
                </ul>
              </div>
              <div className="relative overflow-hidden rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4 space-y-3">
                <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center shadow-md shadow-violet-200">
                  <Ear className="w-5 h-5 text-white" />
                </div>
                <div><p className="font-black text-violet-800 text-sm">Módulo B</p><p className="text-xs text-violet-600 font-medium">Audición · 3 actividades</p></div>
                <ul className="text-[11px] text-violet-500 space-y-1">
                  <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-violet-400" />Figura-fondo</li>
                  <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-violet-400" />Memoria secuencial</li>
                  <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-violet-400" />Patrones FPT</li>
                </ul>
              </div>
            </div>

            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
              <p className="font-bold text-foreground text-sm">Antes de comenzar:</p>
              <div className="space-y-2">
                {[{ icon: "💡", text: "Ambiente tranquilo y con buena iluminación" }, { icon: "📏", text: "Niño sentado frente a la pantalla a ≈ 40 cm" }, { icon: "🔊", text: "Volumen del dispositivo al máximo" }].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="text-base">{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full h-14 gap-2 text-base font-bold shadow-lg rounded-2xl" onClick={() => setPhase("a1")}>
              Comenzar evaluación <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {phase === "a1"       && <A1Screen a2Presses={a2Presses} onA2Press={handleA2} onComplete={(a1) => { setResults((r) => ({ ...r, a1 })); setPhase("a3") }} />}
        {phase === "a3"       && <A3Screen a2Presses={a2Presses} onA2Press={handleA2} onComplete={(a3) => { setResults((r) => ({ ...r, a3, a2Presses })); setPhase("pause_ab") }} />}
        {phase === "pause_ab" && <ModulePause onContinue={() => setPhase("b1")} />}
        {phase === "b1"       && <B1Screen onComplete={(b1) => { setResults((r) => ({ ...r, b1 })); setPhase("b2") }} />}
        {phase === "b2"       && <B2Screen onComplete={(b2) => { setResults((r) => ({ ...r, b2 })); setPhase("b3") }} />}
        {phase === "b3"       && <B3Screen onComplete={(b3) => { setResults((r) => ({ ...r, b3 })); setPhase("results") }} />}
        {phase === "results"  && <ResultsScreen results={results} onBack={onBack} />}
      </div>
    </div>
  )
}
