"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { useAccessibility } from "@/lib/accessibility-context"

interface Lesson {
  id_leccion: string
  titulo: string
  pct_completado: number
}

interface VoiceAssistantLessonsButtonProps {
  courseName: string
  lessons: Lesson[]
  onSelectLesson: (id: string, name: string) => void
  onHighlight?: (index: number | null) => void
}

type State = "idle" | "speaking" | "listening"

function getSpeechRecognition() {
  if (typeof window === "undefined") return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

function matchYesNo(t: string): boolean | null {
  const s = t.toLowerCase()
  if (/\b(s[ií]|claro|listo|por\s*supuesto|dale|vamos|ok|okay)\b/.test(s)) return true
  if (/\b(no|nop|negativo|cancela)\b/.test(s)) return false
  return null
}

function matchLessonByIndex(t: string, total: number): number | null {
  const s = t.toLowerCase()
  const map: Record<string, number> = {
    "uno": 0, "1": 0, "primero": 0, "primera": 0,
    "dos": 1, "2": 1, "segundo": 1, "segunda": 1,
    "tres": 2, "3": 2, "tercero": 2, "tercera": 2,
    "cuatro": 3, "4": 3, "cuarto": 3, "cuarta": 3,
    "cinco": 4, "5": 4, "quinto": 4, "quinta": 4,
    "seis": 5, "6": 5, "sexto": 5, "sexta": 5,
    "siete": 6, "7": 6, "ocho": 7, "8": 7,
    "nueve": 8, "9": 8, "diez": 9, "10": 9,
  }
  for (const [word, idx] of Object.entries(map)) {
    if (new RegExp(`\\b${word}\\b`).test(s) && idx < total) return idx
  }
  return null
}

function matchLessonByName(t: string, lessons: Lesson[]): number | null {
  const tWords = t.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (tWords.length === 0) return null

  const scores = lessons.map((l, i) => {
    const nWords = l.titulo.toLowerCase().split(/\s+/).filter(Boolean)
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

function isLocked(lessons: Lesson[], idx: number): boolean {
  if (idx === 0) return false
  const prev = lessons[idx - 1]
  const cur  = lessons[idx]
  return prev.pct_completado < 100 && cur.pct_completado === 0
}

export function VoiceAssistantLessonsButton({
  courseName,
  lessons,
  onSelectLesson,
  onHighlight,
}: VoiceAssistantLessonsButtonProps) {
  const { speak } = useAccessibility()
  const [state, setState] = useState<State>("idle")
  const recognitionRef = useRef<any>(null)
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false })
  const autoRanRef = useRef(false)

  useEffect(() => {
    return () => {
      abortRef.current.aborted = true
      if (recognitionRef.current) { try { recognitionRef.current.abort() } catch {} }
    }
  }, [])

  const listen = useCallback((timeoutMs = 12000): Promise<string | null> => {
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

  const say = useCallback(async (text: string) => {
    if (abortRef.current.aborted) return
    setState("speaking")
    await speak(text)
  }, [speak])

  const runAssistant = useCallback(async (): Promise<void> => {
    if (lessons.length === 0) {
      await say("Este curso aún no tiene lecciones disponibles.")
      return
    }

    // Encontrar la siguiente lección no completada (sugerencia)
    const siguienteIdx = lessons.findIndex(l => l.pct_completado < 100)
    const sugerencia = siguienteIdx >= 0
      ? `Te sugiero la lección ${siguienteIdx + 1}: ${lessons[siguienteIdx].titulo}.`
      : "¡Has completado todas! Puedes repetir cualquiera para ganar más estrellas."

    await say(`¡Estas son las lecciones del curso ${courseName}!`)
    if (abortRef.current.aborted) { onHighlight?.(null); return }

    // Narrar cada lección iluminándola
    for (let i = 0; i < lessons.length; i++) {
      onHighlight?.(i)
      await say(`Lección ${i + 1}: ${lessons[i].titulo}.`)
      if (abortRef.current.aborted) { onHighlight?.(null); return }
    }
    onHighlight?.(null)

    await say(`${sugerencia} ¿Cuál quieres hacer?`)
    if (abortRef.current.aborted) return

    const transcript = await listen(12000)
    if (abortRef.current.aborted) return
    if (!transcript) {
      await say("¡Mmm, no te escuché! Toca el botón cuando estés listo.")
      return
    }

    let idx = matchLessonByIndex(transcript, lessons.length)
    if (idx === null) idx = matchLessonByName(transcript, lessons)
    if (idx === null) {
      await say("¡No reconocí esa lección! Intenta decir el número, por ejemplo: uno, dos o tres. Toca el botón para intentar de nuevo.")
      return
    }

    if (isLocked(lessons, idx)) {
      await say(`La lección ${idx + 1} está bloqueada. Primero termina la lección ${idx} para desbloquearla.`)
      return
    }

    const elegida = lessons[idx]
    await say(`¡Excelente! Vamos a la lección ${elegida.titulo}.`)
    if (abortRef.current.aborted) return
    onSelectLesson(elegida.id_leccion, elegida.titulo)
  }, [lessons, courseName, say, listen, onSelectLesson])

  const handleClick = useCallback(() => {
    if (state !== "idle") {
      abortRef.current.aborted = true
      if (recognitionRef.current) { try { recognitionRef.current.abort() } catch {} }
      onHighlight?.(null)
      setState("idle")
      return
    }
    abortRef.current = { aborted: false }
    runAssistant().finally(() => { onHighlight?.(null); setState("idle") })
  }, [state, runAssistant, onHighlight])

  // Auto-activar si venimos del asistente del dashboard
  useEffect(() => {
    if (autoRanRef.current) return
    if (lessons.length === 0) return
    if (typeof window === "undefined") return
    const chained = sessionStorage.getItem("assistant-chained")
    if (!chained) return

    autoRanRef.current = true

    // Diferir con setTimeout para pasar el ciclo de StrictMode (mount-unmount-remount).
    // Si StrictMode desmonta antes del timer, el cleanup lo cancela y el remount lo reagenda.
    const timer = setTimeout(() => {
      sessionStorage.removeItem("assistant-chained")
      abortRef.current = { aborted: false }
      runAssistant().finally(() => { onHighlight?.(null); setState("idle") })
    }, 0)

    return () => {
      clearTimeout(timer)
      autoRanRef.current = false
    }
  }, [lessons.length, runAssistant, onHighlight])

  const Icon  = state === "listening" ? Mic : state === "speaking" ? Loader2 : MicOff
  const color = state === "listening" ? "from-rose-400 to-red-600 animate-pulse"
              : state === "speaking"  ? "from-blue-400 to-indigo-600"
              :                          "from-emerald-400 to-teal-600"
  const label = state === "listening" ? "Escuchando... toca para cancelar"
              : state === "speaking"  ? "Hablando... toca para cancelar"
              :                          "Activar asistente: elegir lección por voz"

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
