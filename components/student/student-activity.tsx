"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { supabase } from "@/lib/supabase"
import { parseActivityConfig } from "@/lib/activity-config"
import { SpeakableText } from "@/components/ui/accessible-tooltip"
import {
  ArrowLeft, Volume2, Check, X, Star, ChevronRight,
  Mic, HelpCircle, Loader2,
} from "lucide-react"

interface StudentActivityProps {
  activityId: string | null
  onBack: () => void
  onComplete: () => void
  onVoiceActivity: () => void
}

interface DBActivity {
  id_actividad: string
  titulo: string
  tipo: string
  instrucciones: string | null
  id_leccion: string
}

type Phase = "loading" | "question" | "result" | "done"

export function StudentActivity({ activityId, onBack, onComplete, onVoiceActivity }: StudentActivityProps) {
  const { user }           = useAuth()
  const { speak, settings } = useAccessibility()

  const [activity,       setActivity]       = useState<DBActivity | null>(null)
  const [phase,          setPhase]          = useState<Phase>("loading")
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [textAnswer,     setTextAnswer]     = useState("")
  const [isCorrect,      setIsCorrect]      = useState(false)
  const [score,          setScore]          = useState(0)           // 0 or 100
  const [error,          setError]          = useState<string | null>(null)

  // Load activity from DB
  useEffect(() => {
    if (!user || !activityId) return
    loadActivity()
  }, [user, activityId])

  async function loadActivity() {
    setPhase("loading")
    setError(null)

    // 1. Fetch activity
    const { data: act, error: actErr } = await supabase
      .from("actividad")
      .select("id_actividad, titulo, tipo, instrucciones, id_leccion")
      .eq("id_actividad", activityId!)
      .single()

    if (actErr || !act) { setError("No se pudo cargar la actividad."); return }

    // Redirect voice activity type
    if (act.tipo === "respuesta_oral") {
      onVoiceActivity()
      return
    }

    setActivity(act)
    setPhase("question")

    // Auto-speak instructions if TTS on
    if (settings.voiceEnabled) {
      const cfg = parseActivityConfig(act.instrucciones)
      if (cfg.instrucciones) setTimeout(() => speak(cfg.instrucciones), 400)
    }
  }

  const config = activity ? parseActivityConfig(activity.instrucciones) : null
  const opciones = config?.opciones ?? []
  const hasOptions = opciones.length > 0
  const isShortAnswer = activity?.tipo === "respuesta_corta"

  function handleSelectOption(texto: string, correcta: boolean) {
    if (phase !== "question") return
    setSelectedAnswer(texto)
    setIsCorrect(correcta)
    setScore(correcta ? 100 : 0)
    setPhase("result")
    speak(correcta ? "¡Muy bien! Respuesta correcta." : "Inténtalo de nuevo. Esa no es la respuesta correcta.")
  }

  function handleSubmitText() {
    if (!textAnswer.trim()) return
    const expected = (config?.respuesta_correcta ?? "").trim().toLowerCase()
    const given    = textAnswer.trim().toLowerCase()
    const correct  = expected ? given.includes(expected) || expected.includes(given) : true
    setIsCorrect(correct)
    setScore(correct ? 100 : 0)
    setPhase("result")
    speak(correct ? "¡Muy bien! Respuesta correcta." : "Respuesta incorrecta. Sigue intentando.")
  }

  async function handleFinish() {
    // Save attempt via API route (uses admin to resolve id_grupo reliably)
    if (user && activityId) {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch("/api/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ activityId, puntaje: score }),
      })
    }
    speak(`¡Actividad completada! Obtuviste ${score} puntos.`)
    onComplete()
  }

  // ── Render ──────────────────────────────────────────────────
  if (phase === "loading") {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={onBack}
              className="h-12 w-12 p-0"
              aria-label="Volver a las actividades"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1 text-center px-4">
              <p className="font-bold text-lg line-clamp-1">{activity?.titulo}</p>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-accent" aria-hidden="true" />
              <span className="text-xl font-bold">{score}</span>
            </div>
          </div>
          <Progress
            value={phase === "done" ? 100 : phase === "result" ? 66 : 33}
            className="h-3 bg-primary-foreground/20"
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Instructions card */}
        <section aria-label="Instrucciones de la actividad">
          <Card className="border-2 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                  <HelpCircle className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <SpeakableText as="h2" className="text-xl font-bold text-foreground mb-1">
                    Instrucciones
                  </SpeakableText>
                  <SpeakableText as="p" className="text-lg text-muted-foreground">
                    {config?.instrucciones || "Lee y responde la siguiente pregunta."}
                  </SpeakableText>
                  {settings.voiceEnabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => speak(config?.instrucciones ?? "")}
                    >
                      <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" />
                      Escuchar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Question / options */}
        {phase === "question" && (
          <section aria-label="Pregunta y opciones de respuesta">
            {/* Multiple choice / image / sound */}
            {hasOptions && (
              <fieldset className="border-0 p-0 m-0">
                <legend className="sr-only">Opciones de respuesta</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {opciones.map((op, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(op.texto, op.correcta)}
                      onMouseEnter={() => {
                        if ((settings.tooltipMode === "voice" || settings.tooltipMode === "both") && settings.voiceEnabled) {
                          speak(`Opción: ${op.texto}`)
                        }
                      }}
                      className="p-6 rounded-2xl border-4 border-border text-xl font-semibold text-foreground bg-card hover:border-primary/50 hover:bg-muted transition-all text-left"
                      aria-label={`Opción ${i + 1}: ${op.texto}`}
                    >
                      <span className="text-primary font-bold mr-3">{String.fromCharCode(65 + i)}.</span>
                      {op.texto}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Short answer */}
            {isShortAnswer && (
              <Card className="border-2">
                <CardContent className="p-6 space-y-4">
                  <label className="text-lg font-medium text-foreground" htmlFor="short-answer">
                    Escribe tu respuesta:
                  </label>
                  <Input
                    id="short-answer"
                    value={textAnswer}
                    onChange={e => setTextAnswer(e.target.value)}
                    placeholder="Tu respuesta…"
                    className="h-14 text-lg"
                    onKeyDown={e => e.key === "Enter" && handleSubmitText()}
                    autoFocus
                  />
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg"
                    onClick={handleSubmitText}
                    disabled={!textAnswer.trim()}
                  >
                    Confirmar respuesta
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* No config — show oral fallback */}
            {!hasOptions && !isShortAnswer && (
              <Card className="border-2">
                <CardContent className="py-10 text-center space-y-4">
                  <Mic className="w-12 h-12 text-primary mx-auto" aria-hidden="true" />
                  <p className="text-lg text-muted-foreground">Esta actividad se responde de forma oral.</p>
                  <Button size="lg" onClick={onVoiceActivity}>
                    Iniciar actividad oral
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* Result */}
        {phase === "result" && (
          <section aria-live="polite" aria-label="Resultado de tu respuesta">
            <Card className={`border-4 shadow-xl ${isCorrect ? "border-green-400 bg-green-50/40" : "border-destructive bg-destructive/5"}`}>
              <CardContent className="p-8 text-center space-y-4">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${isCorrect ? "bg-green-500" : "bg-destructive"}`}>
                  {isCorrect
                    ? <Check className="w-10 h-10 text-white" aria-hidden="true" />
                    : <X    className="w-10 h-10 text-white" aria-hidden="true" />}
                </div>
                <SpeakableText as="h3" className={`text-3xl font-bold ${isCorrect ? "text-green-700" : "text-destructive"}`}>
                  {isCorrect ? "¡Excelente!" : "Inténtalo de nuevo"}
                </SpeakableText>
                <SpeakableText as="p" className="text-lg text-muted-foreground">
                  {isCorrect
                    ? "¡Muy bien! Has respondido correctamente."
                    : config?.respuesta_correcta
                    ? `La respuesta correcta era: ${config.respuesta_correcta}`
                    : "No te preocupes, sigue practicando."}
                </SpeakableText>
                <Button
                  size="lg"
                  className="h-16 text-xl px-12"
                  onClick={handleFinish}
                >
                  Terminar actividad
                  <ChevronRight className="w-6 h-6 ml-3" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  )
}
