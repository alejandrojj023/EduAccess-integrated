"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { useAccessibility } from "@/lib/accessibility-context"

interface Course {
  id: string
  name: string
  progress: number
  currentLesson: string
  totalLessons: number
  completedLessons: number
}

interface VoiceAssistantButtonProps {
  firstName: string
  estrellasTotales: number
  nivelActual: number
  nivelNombre: string
  streakDays: number
  courses: Course[]
  onNavigate: (screen: string) => void
  onHighlight?: (option: 1 | 2 | 3 | 4 | null) => void
  onHighlightCourse?: (index: number | null) => void
}

type State = "idle" | "speaking" | "listening"

function getSpeechRecognition() {
  if (typeof window === "undefined") return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

// ── Matchers ──────────────────────────────────────────────────
function matchOption(t: string): 1 | 2 | 3 | 4 | null {
  const s = t.toLowerCase()
  if (/\b(uno|1|lecci[oó]n|lecciones|empezar|iniciar|continuar)\b/.test(s)) return 1
  if (/\b(dos|2|calendario|aventuras)\b/.test(s)) return 2
  if (/\b(tres|3|progreso|estrellas|reporte)\b/.test(s)) return 3
  if (/\b(cuatro|4|curso|unirme|c[oó]digo)\b/.test(s)) return 4
  return null
}

function matchYesNo(t: string): boolean | null {
  const s = t.toLowerCase()
  if (/\b(s[ií]|claro|listo|por\s*supuesto|dale|vamos|ok|okay)\b/.test(s)) return true
  if (/\b(no|nop|negativo|cancela)\b/.test(s)) return false
  return null
}

function matchCourseByIndex(t: string, total: number): number | null {
  const s = t.toLowerCase()
  const map: Record<string, number> = {
    "uno": 0, "1": 0, "primero": 0, "primera": 0,
    "dos": 1, "2": 1, "segundo": 1, "segunda": 1,
    "tres": 2, "3": 2, "tercero": 2, "tercera": 2,
    "cuatro": 3, "4": 3, "cinco": 4, "5": 4,
  }
  for (const [word, idx] of Object.entries(map)) {
    if (new RegExp(`\\b${word}\\b`).test(s) && idx < total) return idx
  }
  return null
}

function matchCourseByName(t: string, courses: Course[]): number | null {
  const tWords = t.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (tWords.length === 0) return null

  const scores = courses.map((c, i) => {
    const nWords = c.name.toLowerCase().split(/\s+/).filter(Boolean)
    let matches = 0
    for (const tw of tWords) {
      if (nWords.some(nw => nw === tw)) matches++
    }
    return { i, score: matches / Math.max(tWords.length, nWords.length) }
  })

  scores.sort((a, b) => b.score - a.score)
  if (scores[0].score === 0) return null
  // Ambiguous: two candidates share the same top score → fall back to number
  if (scores.length > 1 && scores[0].score === scores[1].score) return null
  return scores[0].i
}

const OPTION_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: "iniciar lección",
  2: "ver calendario",
  3: "ver tu progreso",
  4: "unirte a un curso",
}

// ──────────────────────────────────────────────────────────────
export function VoiceAssistantButton({
  firstName,
  estrellasTotales,
  nivelActual,
  nivelNombre,
  streakDays,
  courses,
  onNavigate,
  onHighlight,
  onHighlightCourse,
}: VoiceAssistantButtonProps) {
  const { speak } = useAccessibility()
  const [state, setState] = useState<State>("idle")
  const recognitionRef = useRef<any>(null)
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false })

  useEffect(() => {
    return () => {
      abortRef.current.aborted = true
      if (recognitionRef.current) { try { recognitionRef.current.abort() } catch {} }
    }
  }, [])

  // Escucha al usuario y devuelve transcripción o null
  const listen = useCallback((timeoutMs = 10000): Promise<string | null> => {
    return new Promise((resolve) => {
      const SR = getSpeechRecognition()
      if (!SR) { resolve(null); return }

      setState("listening")
      const recognition = new SR()
      recognition.lang = "es-MX"
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 3
      recognitionRef.current = recognition

      let resolved = false
      const finish = (val: string | null) => {
        if (resolved) return
        resolved = true
        clearTimeout(timer)
        try { recognition.abort() } catch {}
        resolve(val)
      }

      const timer = setTimeout(() => finish(null), timeoutMs)

      recognition.onresult = (event: any) => {
        const alts: string[] = []
        for (let i = 0; i < event.results[0].length; i++) {
          alts.push(event.results[0][i].transcript)
        }
        finish(alts.join(" | "))
      }
      recognition.onerror = () => finish(null)
      recognition.onend = () => finish(null)

      try { recognition.start() } catch { finish(null) }
    })
  }, [])

  // Wrapper para hablar respetando aborted
  const say = useCallback(async (text: string) => {
    if (abortRef.current.aborted) return
    setState("speaking")
    await speak(text)
  }, [speak])

  // ── CASE 1 — Selección de lección ──────────────────────────
  const runCase1 = useCallback(async (): Promise<void> => {
    if (courses.length === 0) {
      await say("¡Aún no tienes cursos! Pídele a tu maestro un código para unirte a uno.")
      return
    }

    const intro = streakDays === 0
      ? `¡Genial! ¡Vamos a recuperar esa racha! Tienes ${courses.length} ${courses.length === 1 ? "curso disponible" : "cursos disponibles"}.`
      : `¡Qué emocionante! Tienes ${courses.length} ${courses.length === 1 ? "curso disponible" : "cursos disponibles"}.`
    await say(intro)
    if (abortRef.current.aborted) { onHighlightCourse?.(null); return }

    // Narrar cada curso iluminándolo
    for (let i = 0; i < courses.length; i++) {
      onHighlightCourse?.(i)
      await say(`Curso ${i + 1}: ${courses[i].name}.`)
      if (abortRef.current.aborted) { onHighlightCourse?.(null); return }
    }
    onHighlightCourse?.(null)

    await say("¿Con cuál quieres empezar hoy?")
    if (abortRef.current.aborted) return

    const transcript = await listen(12000)
    if (abortRef.current.aborted) return
    if (!transcript) {
      await say("¡Mmm, no te escuché! Toca el botón de nuevo cuando estés listo.")
      return
    }

    let idx = matchCourseByIndex(transcript, courses.length)
    if (idx === null) idx = matchCourseByName(transcript, courses)
    if (idx === null) {
      await say("¡No reconocí ese curso! Intenta decir el número, por ejemplo: uno, dos o tres. Toca el botón de nuevo para intentar otra vez.")
      return
    }

    const elegido = courses[idx]
    await say(
      `¡Excelente elección! El curso ${elegido.name} tiene ${elegido.totalLessons} ${elegido.totalLessons === 1 ? "lección" : "lecciones"} en total, ` +
      `y ya has completado ${elegido.completedLessons}. ¡Eres genial! ¿Estás listo para continuar?`
    )
    if (abortRef.current.aborted) return

    const conf = await listen(8000)
    if (abortRef.current.aborted) return
    const yes = conf ? matchYesNo(conf) : null

    if (yes === false) {
      await say("¡Está bien! Volvamos a elegir.")
      return runCase1()
    }
    // Si dijo sí o no respondió claramente, seguir adelante
    await say("¡Súper! ¡Allá vamos!")
    sessionStorage.setItem("assistant-chained", "1")
    onNavigate(`course-${elegido.id}|${elegido.name}`)
  }, [courses, streakDays, say, listen, onNavigate])

  // ── CASE 2 — Calendario ───────────────────────────────────
  const runCase2 = useCallback(async () => {
    await say("¡Vamos a ver tu calendario de aventuras! Allí encontrarás todo lo que has hecho día por día.")
    onNavigate("student-calendar")
  }, [say, onNavigate])

  // ── CASE 3 — Progreso ─────────────────────────────────────
  const runCase3 = useCallback(async () => {
    const estrellas = Math.round(estrellasTotales)
    await say(
      `¡Veamos cómo vas, campeón! Tienes ${estrellas} estrellas brillantes, ` +
      `eres nivel ${nivelActual}, ${nivelNombre}. ¡Estás haciendo un trabajo increíble! ¡Sigue así!`
    )
    onNavigate("student-progress")
  }, [say, estrellasTotales, nivelActual, nivelNombre, onNavigate])

  // ── CASE 4 — Unirse a curso ───────────────────────────────
  const runCase4 = useCallback(async () => {
    await say("¡Perfecto! Vamos a unirte a un curso nuevo. Ingresa el código mágico que te dio tu maestro.")
    onNavigate("join-group")
  }, [say, onNavigate])

  // ── Flujo principal ────────────────────────────────────────
  const runAssistant = useCallback(async () => {
    abortRef.current = { aborted: false }
    const estrellas = Math.round(estrellasTotales)
    const rachaPerdida = streakDays === 0

    const saludo =
      `¡Hola, ${firstName}! ¡Qué alegría verte por aquí! ` +
      `Te cuento cómo vas... ¡tienes ${estrellas} estrellas! ` +
      `¡Eres nivel ${nivelActual}, ${nivelNombre}! `

    const racha = rachaPerdida
      ? `¡Ups! Tu racha se apagó... ¡pero no te preocupes! ¡Hoy podemos encenderla de nuevo juntos! `
      : `¡Y tu racha actual es de ${streakDays} ${streakDays === 1 ? "día increíble" : "días increíbles"}! ¡Sigamos así! `

    const activacion = `¡Aquí estoy para ayudarte! Dime qué quieres hacer hoy... o toca una de las opciones. `

    await say(saludo + racha + activacion)
    if (abortRef.current.aborted) return setState("idle")

    // Opción 1 — iluminar el botón Continuar
    onHighlight?.(1)
    const opcion1 = rachaPerdida
      ? `Opción uno... ¡Oh, no! Tu racha se apagó. ¿Quieres hacer una lección hoy para recuperarla?`
      : `Opción uno... ¡Tu racha está increíble! ¿Quieres iniciar una lección nueva para mantenerla encendida?`
    await say(opcion1)
    if (abortRef.current.aborted) { onHighlight?.(null); return setState("idle") }

    // Opción 2 — calendario
    onHighlight?.(2)
    await say("Opción dos... Ver tu calendario de aventuras.")
    if (abortRef.current.aborted) { onHighlight?.(null); return setState("idle") }

    // Opción 3 — progreso
    onHighlight?.(3)
    await say("Opción tres... Revisar tu progreso y tus estrellas.")
    if (abortRef.current.aborted) { onHighlight?.(null); return setState("idle") }

    // Opción 4 — unirse a curso
    onHighlight?.(4)
    await say("Opción cuatro... ¡Unirte a un curso nuevo!")
    onHighlight?.(null)
    if (abortRef.current.aborted) return setState("idle")

    const transcript = await listen(12000)
    if (abortRef.current.aborted) return setState("idle")

    if (!transcript) {
      await say("¡Oye, sigo aquí! ¿Quieres que repita las opciones? Toca el botón de nuevo.")
      return setState("idle")
    }

    const opt = matchOption(transcript)
    if (!opt) {
      await say("¡Mmm, no te escuché bien! ¿Puedes repetirlo? Toca el botón de nuevo.")
      return setState("idle")
    }

    await say(`¡Escuché ${OPTION_NAMES[opt]}! ¡Vamos allá!`)
    if (abortRef.current.aborted) return setState("idle")

    if (opt === 1) await runCase1()
    else if (opt === 2) await runCase2()
    else if (opt === 3) await runCase3()
    else if (opt === 4) await runCase4()

    setState("idle")
  }, [firstName, estrellasTotales, nivelActual, nivelNombre, streakDays, say, listen, runCase1, runCase2, runCase3, runCase4])

  const handleClick = useCallback(() => {
    if (state !== "idle") {
      // Cancelar todo
      abortRef.current.aborted = true
      if (recognitionRef.current) { try { recognitionRef.current.abort() } catch {} }
      onHighlight?.(null)
      onHighlightCourse?.(null)
      setState("idle")
      return
    }
    runAssistant()
  }, [state, runAssistant, onHighlight, onHighlightCourse])

  const Icon  = state === "listening" ? Mic : state === "speaking" ? Loader2 : MicOff
  const color = state === "listening" ? "from-rose-400 to-red-600 animate-pulse"
              : state === "speaking"  ? "from-blue-400 to-indigo-600"
              :                          "from-emerald-400 to-teal-600"
  const label = state === "listening" ? "Escuchando... toca para cancelar"
              : state === "speaking"  ? "Hablando... toca para cancelar"
              :                          "Activar asistente de voz"

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={`fixed bottom-20 right-5 z-40 w-12 h-12 rounded-full bg-gradient-to-br ${color} text-white shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition-all duration-200 flex items-center justify-center`}
    >
      <Icon className={`w-5 h-5 ${state === "speaking" ? "animate-spin" : ""}`} aria-hidden="true" />
    </button>
  )
}
