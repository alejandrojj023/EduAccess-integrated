"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft, Volume2, Mic, RefreshCw, Check, X,
  Loader2, Star,
} from "lucide-react"

interface VoiceActivityProps {
  activityId: string | null
  onBack: () => void
  onComplete: () => void
  /** Contexto de lección — si se pasan, el header muestra "Actividad X de Y" en lugar del contador de estrellas */
  lessonIndex?: number
  lessonTotal?: number
  /** Vista previa (docente): no guarda intentos */
  previewMode?: boolean
}

interface ActivityData {
  id_actividad: string
  titulo: string
  instrucciones: string | null
}

interface PreguntaData {
  enunciado: string
  respuesta_esperada: string   // pipe-separated answer options
}

// ── Helpers ──────────────────────────────────────────────────────
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
}

function isCloseEnough(spoken: string, expected: string): boolean {
  const spokenWords  = normalize(spoken).split(/\s+/).filter(Boolean)
  const expectedWords = normalize(expected).split(/\s+/).filter(Boolean)
  if (expectedWords.length === 0) return true
  const matches = expectedWords.filter((w) => spokenWords.includes(w)).length
  return matches / expectedWords.length >= 0.8
}

function checkAnswer(spoken: string, expected: string): boolean {
  const options = expected.split("|").map((o) => o.trim()).filter(Boolean)
  return options.some((option) => isCloseEnough(spoken, option))
}

const MAX_ATTEMPTS = 2
type Phase = "loading" | "question" | "result"

export function VoiceActivity({ activityId, onBack, onComplete, lessonIndex, lessonTotal, previewMode = false }: VoiceActivityProps) {
  const isLessonMode = lessonIndex !== undefined && lessonTotal !== undefined && lessonTotal > 0
  const lessonProgress = isLessonMode ? Math.round((lessonIndex / lessonTotal) * 100) : 0
  const { user }            = useAuth()
  const { speak, settings } = useAccessibility()

  const [activity,  setActivity]  = useState<ActivityData | null>(null)
  const [pregunta,  setPregunta]  = useState<PreguntaData | null>(null)
  const [phase,     setPhase]     = useState<Phase>("loading")
  const [error,     setError]     = useState<string | null>(null)

  const [isRecording,      setIsRecording]      = useState(false)
  const [isProcessing,     setIsProcessing]     = useState(false)
  const [transcript,       setTranscript]       = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [isCorrect,        setIsCorrect]        = useState(false)
  const [score,            setScore]            = useState(0)
  const [attempts,         setAttempts]         = useState(0)
  const [showCorrect,      setShowCorrect]      = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const activityStartRef = useRef<number>(Date.now())
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Load activity + pregunta ─────────────────────────────────
  useEffect(() => {
    if (!activityId) { setError("No se encontró la actividad."); return }
    loadData()
    return () => clearTimeout(speakTimerRef.current)
  }, [activityId])

  async function loadData() {
    setPhase("loading")
    setError(null)

    const [{ data: act, error: actErr }, { data: pq, error: pqErr }] = await Promise.all([
      supabase
        .from("actividad")
        .select("id_actividad, titulo, instrucciones")
        .eq("id_actividad", activityId!)
        .single(),
      supabase
        .from("pregunta")
        .select("enunciado, respuesta_esperada")
        .eq("id_actividad", activityId!)
        .order("orden", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])

    if (actErr || !act) { setError("No se pudo cargar la actividad."); return }
    if (pqErr || !pq)   { setError("Esta actividad no tiene pregunta configurada."); return }

    setActivity(act)
    setPregunta(pq)
    setPhase("question")

    if (settings.voiceEnabled) speakTimerRef.current = setTimeout(() => speakQuestion(pq.enunciado), 600)
  }

  // ── Speech synthesis ─────────────────────────────────────────
  const speakQuestion = useCallback((text: string) => {
    speak(text)
  }, [speak])

  // ── Speech recognition ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return

    const rec = new SR() as SpeechRecognition
    rec.continuous = true
    rec.interimResults = true
    rec.lang = "es-MX"

    let processTimer: ReturnType<typeof setTimeout>

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ""
      let finalText = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) {
          finalText += r[0].transcript
        } else {
          interim += r[0].transcript
        }
      }
      if (interim) setInterimTranscript(interim)
      if (finalText) {
        rec.stop()
        setInterimTranscript("")
        setTranscript(finalText)
        setIsProcessing(true)
        processTimer = setTimeout(() => {
          if (!pregunta) return
          const correct = checkAnswer(finalText, pregunta.respuesta_esperada)
          const newAttempts = attempts + 1
          setAttempts(newAttempts)
          setIsCorrect(correct)
          setScore(correct ? 100 : 0)
          setPhase("result")
          setIsProcessing(false)
          if (correct) {
            speak("¡Excelente! Eso es correcto.")
          } else if (newAttempts >= MAX_ATTEMPTS) {
            setShowCorrect(true)
            speak("No fue correcto. Escucha la respuesta correcta.")
          } else {
            speak("No fue correcto. Inténtalo de nuevo.")
          }
        }, 400)
      }
    }

    rec.onerror = () => {
      setIsRecording(false)
      setIsProcessing(false)
      setInterimTranscript("")
      speak("No se pudo escuchar tu voz. Inténtalo de nuevo.")
    }

    rec.onend = () => {
      setIsRecording(false)
      setInterimTranscript("")
    }

    recognitionRef.current = rec
    return () => { rec.abort(); clearTimeout(processTimer) }
  }, [pregunta, attempts])

  function handleMic() {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      setTranscript("")
      setInterimTranscript("")
      setIsRecording(true)
      recognitionRef.current?.start()
      speak("Escuchando. Habla ahora.")
    }
  }

  function handleRetry() {
    setTranscript("")
    setInterimTranscript("")
    setIsCorrect(false)
    setScore(0)
    setPhase("question")
    if (pregunta) setTimeout(() => speakQuestion(pregunta.enunciado), 300)
  }

  async function handleFinish() {
    if (!previewMode) {
      if (user && activityId) {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch("/api/attempts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ activityId, puntaje: score, tiempoSegundos: Math.round((Date.now() - activityStartRef.current) / 1000) }),
        })
      }
    }
    onComplete()
  }

  // ── Render: loading ──────────────────────────────────────────
  if (phase === "loading" && !error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando actividad…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="border-2 max-w-md w-full">
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-destructive font-semibold">{error}</p>
            <Button onClick={onBack}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Answer options display (pipe-separated → array)
  const correctOptions = pregunta?.respuesta_esperada.split("|").map((s) => s.trim()).filter(Boolean) ?? []

  // ── Render: main ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              className="h-11 w-11 p-0 rounded-2xl bg-background shadow-sm border-border/60 hover:bg-muted"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center px-4">
              <p className="font-extrabold text-[17px] tracking-tight text-foreground line-clamp-1">
                {activity?.titulo ?? "Respuesta por Voz"}
              </p>
              {isLessonMode && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actividad {lessonIndex! + 1} de {lessonTotal}
                </p>
              )}
            </div>
            {!isLessonMode ? (
              <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2 shadow-sm">
                <Star className="w-5 h-5 text-amber-500" aria-hidden="true" />
                <span className="text-base font-extrabold text-foreground tabular-nums">{score}</span>
              </div>
            ) : (
              <div className="text-right min-w-[72px]">
                <p className="text-[11px] text-muted-foreground">Progreso</p>
                <p className="font-extrabold text-foreground tabular-nums">{lessonProgress}%</p>
              </div>
            )}
          </div>
          <Progress
            value={isLessonMode ? lessonProgress : (phase === "result" ? 100 : 33)}
            className="h-2.5 bg-muted"
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Instructions */}
        <p className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground text-center leading-snug">
          {activity?.instrucciones ?? "Escucha la pregunta y responde en voz alta"}
        </p>

        {/* Question card */}
        <Card className="border border-border/70 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-center">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => speakQuestion(pregunta!.enunciado)}
                  className="w-12 h-12 shrink-0 rounded-2xl border border-border/70 bg-muted/40 hover:bg-muted flex items-center justify-center transition-colors shadow-sm"
                  aria-label="Escuchar pregunta"
                >
                  <Volume2 className="w-5 h-5 text-primary" aria-hidden="true" />
                </button>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground text-center">
                  {pregunta?.enunciado}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Toca el ícono para escuchar la pregunta
            </p>
          </CardContent>
        </Card>

        {/* Attempt indicator */}
        {attempts > 0 && phase === "question" && (
          <p className="text-center text-sm text-muted-foreground">
            Intento {attempts} de {MAX_ATTEMPTS}
          </p>
        )}

        {/* Mic button */}
        {phase === "question" && (
          <div className="flex flex-col items-center gap-5">
            <button
              onClick={handleMic}
              disabled={isProcessing}
              className={`w-28 h-28 rounded-full flex items-center justify-center shadow-lg ring-1 ring-border/60 transition-all ${
                isRecording
                  ? "bg-destructive animate-pulse scale-110"
                  : isProcessing
                  ? "bg-muted cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 active:scale-95"
              }`}
              aria-label={isRecording ? "Detener grabación" : "Toca para hablar"}
            >
              {isProcessing
                ? <Loader2 className="w-14 h-14 text-primary-foreground animate-spin" aria-hidden="true" />
                : <Mic className="w-14 h-14 text-primary-foreground" aria-hidden="true" />
              }
            </button>

            <p className="text-lg font-bold text-foreground">
              {isRecording ? "Escuchando… habla ahora" : isProcessing ? "Procesando…" : "Toca para hablar"}
            </p>

            {isRecording && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-destructive rounded-full animate-ping" />
                <span className="text-base font-medium text-destructive">Grabando</span>
              </div>
            )}
          </div>
        )}

        {/* Interim transcript (real-time while recording) */}
        {isRecording && interimTranscript && (
          <Card className="border border-border/70 rounded-3xl border-dashed bg-card/60">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Escuchando:</p>
              <p className="text-xl font-semibold text-muted-foreground italic">"{interimTranscript}"</p>
            </CardContent>
          </Card>
        )}

        {/* Transcript preview */}
        {transcript && phase === "question" && (
          <Card className="border-2 rounded-2xl">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Lo que dijiste:</p>
              <p className="text-xl font-semibold text-foreground">"{transcript}"</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {phase === "result" && (
          <section aria-live="polite">
            <Card className={`border-4 shadow-xl rounded-3xl ${isCorrect ? "border-success bg-success/5" : "border-destructive bg-destructive/5"}`}>
              <CardContent className="p-8 text-center space-y-5">
                {/* Icon */}
                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${isCorrect ? "bg-success" : "bg-destructive"}`}>
                  {isCorrect
                    ? <Check className="w-12 h-12 text-white" aria-hidden="true" />
                    : <X     className="w-12 h-12 text-white" aria-hidden="true" />}
                </div>

                <h2 className={`text-3xl font-bold ${isCorrect ? "text-success" : "text-destructive"}`}>
                  {isCorrect ? "¡Muy bien!" : attempts >= MAX_ATTEMPTS ? "Sigue practicando" : "Inténtalo de nuevo"}
                </h2>

                {/* Transcript */}
                {transcript && (
                  <div className="text-left bg-muted rounded-2xl p-4 space-y-1">
                    <p className="text-sm text-muted-foreground">Dijiste:</p>
                    <p className="text-xl font-semibold text-foreground">"{transcript}"</p>
                  </div>
                )}

                {/* Correct answer(s) on error after max attempts */}
                {!isCorrect && showCorrect && (
                  <div className="text-left bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {correctOptions.length > 1 ? "Respuestas aceptadas:" : "Respuesta correcta:"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {correctOptions.map((opt) => (
                        <span key={opt} className="px-3 py-1 bg-primary/10 text-primary rounded-lg font-semibold text-lg">
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  {!isCorrect && attempts < MAX_ATTEMPTS && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-14 text-lg border-2 gap-2"
                      onClick={handleRetry}
                    >
                      <RefreshCw className="w-5 h-5" aria-hidden="true" />
                      Intentar de nuevo
                    </Button>
                  )}
                  <Button size="lg" className="h-14 text-lg" onClick={handleFinish}>
                    {isCorrect ? "¡Continuar!" : "Continuar de todas formas"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  )
}
