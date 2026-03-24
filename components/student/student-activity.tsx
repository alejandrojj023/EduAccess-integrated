"use client"

import { useState, useEffect, useRef } from "react"
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
  Mic, HelpCircle, Loader2, RotateCcw,
} from "lucide-react"
import { motion, LayoutGroup } from "framer-motion"

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
  imagen_url: string | null
  audio_url: string | null
  id_leccion: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
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

  // Sound activity (Duolingo-style) state
  type WordToken = { id: string; text: string }
  const [wordBank,         setWordBank]         = useState<WordToken[]>([])
  const [constructionZone, setConstructionZone] = useState<WordToken[]>([])
  const [soundError,      setSoundError]      = useState<string | null>(null)
  const [soundPregunta,   setSoundPregunta]   = useState<{ respuesta_esperada: string; palabras_distractoras: string | null } | null>(null)

  // Fill activity (completar_oracion) state
  const [fillPregunta,   setFillPregunta]   = useState<{ enunciado: string; respuesta_esperada: string; palabras_distractoras: string | null; oraciones_contexto: string | null } | null>(null)
  const [fillBank,       setFillBank]       = useState<WordToken[]>([])
  const [fillSelected,   setFillSelected]   = useState<WordToken | null>(null)
  const [fillError,      setFillError]      = useState<string | null>(null)
  const [fillAttempts,   setFillAttempts]   = useState(0)
  const [fillHighlighted, setFillHighlighted] = useState<string | null>(null)
  const fillAnimatingRef = useRef(false)   // bloquea clics durante la animación layout

  // Sequence activity (secuenciacion) state
  type SeqItem = { id_pregunta: string; enunciado: string; orden: number; imagen_url: string | null }
  const [seqItems,    setSeqItems]    = useState<SeqItem[]>([])
  const [seqZones,    setSeqZones]    = useState<(SeqItem | null)[]>([])
  const [seqDragging, setSeqDragging] = useState<SeqItem | null>(null)
  const [seqDragOver, setSeqDragOver] = useState<number | null>(null)
  const [seqChecked,  setSeqChecked]  = useState(false)
  const [seqResult,   setSeqResult]   = useState<boolean[]>([])
  const [seqAttempts, setSeqAttempts] = useState(0)


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
      .select("id_actividad, titulo, tipo, instrucciones, imagen_url, audio_url, id_leccion")
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

    // Auto-speak instructions if TTS on (skip sound/fill/sequence — spoken after pregunta loads)
    if (settings.voiceEnabled && act.tipo !== "reconocimiento_sonidos" && act.tipo !== "completar_oracion" && act.tipo !== "secuenciacion") {
      const cfg = parseActivityConfig(act.instrucciones)
      if (cfg.instrucciones) setTimeout(() => speak(cfg.instrucciones), 400)
    }
  }

  // Fetch pregunta and initialize word bank when a sound activity loads
  useEffect(() => {
    if (!activity || activity.tipo !== "reconocimiento_sonidos") return
    setSoundPregunta(null)
    setWordBank([])
    setConstructionZone([])
    setSoundError(null)

    supabase
      .from("pregunta")
      .select("respuesta_esperada, palabras_distractoras")
      .eq("id_actividad", activity.id_actividad)
      .order("orden", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data: pq }) => {
        if (!pq) return
        setSoundPregunta(pq)
        const correct = pq.respuesta_esperada.split(" ").filter(Boolean)
        const distractors = pq.palabras_distractoras?.split("|").filter(Boolean) ?? []
        const tokens = shuffle([...correct, ...distractors]).map((text, i) => ({
          id: `word-${i}-${text}`,
          text,
        }))
        setWordBank(tokens)
        // Auto-speak sentence via Web Speech API after a short delay
        if (settings.voiceEnabled) setTimeout(() => speak(pq.respuesta_esperada), 600)
      })
  }, [activity])

  // Fetch pregunta and initialize fill bank when a fill activity loads
  useEffect(() => {
    if (!activity || activity.tipo !== "completar_oracion") return
    setFillPregunta(null)
    setFillBank([])
    setFillSelected(null)
    setFillError(null)
    setFillAttempts(0)

    supabase
      .from("pregunta")
      .select("enunciado, respuesta_esperada, palabras_distractoras, oraciones_contexto")
      .eq("id_actividad", activity.id_actividad)
      .order("orden", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data: pq }) => {
        if (!pq) return
        setFillPregunta(pq)
        const correct = pq.respuesta_esperada.trim()
        const distractors = pq.palabras_distractoras?.split("|").filter(Boolean) ?? []
        const tokens = shuffle([correct, ...distractors]).map((text, i) => ({
          id: `fill-${i}-${text}`,
          text,
        }))
        setFillBank(tokens)
        // Auto-speak instructions
        if (settings.voiceEnabled) setTimeout(() => speak(activity.instrucciones ?? "Completa la oración"), 400)
      })
  }, [activity])

  // Speak a single word using Web Speech API (respects user voice settings)
  function speakWord(text: string) {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = "es-ES"
    utt.rate = Math.max(0.3, settings.voiceRate)
    if (settings.voiceName) {
      const voice = window.speechSynthesis.getVoices().find((v) => v.name === settings.voiceName)
      if (voice) utt.voice = voice
    }
    window.speechSynthesis.speak(utt)
  }

  function handleFillSelect(token: WordToken) {
    if (fillAnimatingRef.current) return
    fillAnimatingRef.current = true
    setTimeout(() => { fillAnimatingRef.current = false }, 450)

    // If another word is already placed, return it to bank first
    if (fillSelected) {
      setFillBank((prev) => prev.some((t) => t.id === fillSelected!.id) ? prev : [...prev, fillSelected!])
    }
    setFillBank((prev) => prev.filter((t) => t.id !== token.id))
    setFillSelected(token)
    setFillError(null)
    // Read completed sentence
    if (settings.voiceEnabled && fillPregunta) {
      const full = fillPregunta.enunciado.replace("___", token.text)
      setTimeout(() => speakWord(full), 250)
    }
  }

  function handleFillReturn() {
    if (!fillSelected || fillAnimatingRef.current) return
    fillAnimatingRef.current = true
    setTimeout(() => { fillAnimatingRef.current = false }, 450)
    setFillBank((prev) => prev.some((t) => t.id === fillSelected!.id) ? prev : [...prev, fillSelected!])
    setFillSelected(null)
    setFillError(null)
  }

  function handleCheckFill() {
    if (!fillSelected || !fillPregunta) return
    const correct = fillSelected.text.trim().toLowerCase() === fillPregunta.respuesta_esperada.trim().toLowerCase()
    const newAttempts = fillAttempts + 1
    setFillAttempts(newAttempts)
    if (correct) {
      setIsCorrect(true)
      setScore(100)
      setPhase("result")
      speak("¡Muy bien! Respuesta correcta.")
    } else if (newAttempts >= 2) {
      setIsCorrect(false)
      setScore(0)
      setPhase("result")
      if (settings.voiceEnabled) speakWord(`La respuesta correcta es ${fillPregunta.respuesta_esperada}`)
    } else {
      setFillError("Esa no es la respuesta. ¡Inténtalo de nuevo!")
      speak("Esa no es la respuesta. Inténtalo de nuevo.")
    }
  }

  function handleRetryFill() {
    // Return placed word to bank
    if (fillSelected) {
      setFillBank((prev) => [...prev, fillSelected!])
      setFillSelected(null)
    }
    setFillError(null)
  }

  // ── Sequence (secuenciacion) ──────────────────────────────────
  useEffect(() => {
    if (!activity || activity.tipo !== "secuenciacion") return
    setSeqItems([])
    setSeqZones([])
    setSeqDragging(null)
    setSeqDragOver(null)
    setSeqChecked(false)
    setSeqResult([])
    setSeqAttempts(0)

    supabase
      .from("pregunta")
      .select("id_pregunta, enunciado, orden, imagen_url")
      .eq("id_actividad", activity.id_actividad)
      .order("orden", { ascending: true })
      .then(({ data: preguntas }) => {
        if (!preguntas?.length) return
        const shuffled = shuffle(preguntas)
        setSeqItems(shuffled)
        setSeqZones(new Array(shuffled.length).fill(null))
        if (settings.voiceEnabled) setTimeout(() => speak(activity.instrucciones ?? "Ordena las imágenes arrastrándolas"), 400)
      })
  }, [activity])

  function handleSeqDropOnZone(zoneIdx: number) {
    if (!seqDragging) return
    setSeqZones((prev) => {
      const next = [...prev]
      next[zoneIdx] = seqDragging
      return next
    })
    setSeqDragging(null)
    setSeqDragOver(null)
    setSeqChecked(false)
    setSeqResult([])
  }

  function handleSeqReturnToLeft(zoneIdx: number) {
    setSeqZones((prev) => {
      const next = [...prev]
      next[zoneIdx] = null
      return next
    })
    setSeqChecked(false)
    setSeqResult([])
  }

  function handleCheckSeq() {
    const result = seqZones.map((item, idx) => item !== null && item.orden === idx + 1)
    const allCorrect = result.every(Boolean)
    const newAttempts = seqAttempts + 1
    setSeqAttempts(newAttempts)
    setSeqChecked(true)
    setSeqResult(result)

    if (allCorrect) {
      setIsCorrect(true)
      setScore(100)
      setPhase("result")
      speak("¡Excelente! Ordenaste la secuencia correctamente.")
    } else if (newAttempts >= 2) {
      setTimeout(() => {
        const correctZones = Array.from({ length: seqItems.length }, (_, idx) =>
          seqItems.find((item) => item.orden === idx + 1) ?? null
        )
        setSeqZones(correctZones)
        setSeqResult(correctZones.map(() => true))
        setTimeout(() => {
          setIsCorrect(false)
          setScore(0)
          setPhase("result")
          speak("Este es el orden correcto de la secuencia.")
        }, 800)
      }, 600)
    } else {
      speak("Algunas imágenes no están en el orden correcto. ¡Inténtalo de nuevo!")
    }
  }

  function playSoundSentence(rate = 1) {
    if (!soundPregunta) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(soundPregunta.respuesta_esperada)
    utt.lang = "es-ES"
    utt.rate = Math.max(0.3, settings.voiceRate * rate)
    if (settings.voiceName) {
      const voices = window.speechSynthesis.getVoices()
      const selectedVoice = voices.find((v) => v.name === settings.voiceName)
      if (selectedVoice) utt.voice = selectedVoice
    }
    window.speechSynthesis.speak(utt)
  }

  function moveWordToZone(tokenId: string) {
    if (phase !== "question") return
    const token = wordBank.find(w => w.id === tokenId)
    if (!token) return
    setWordBank(prev => prev.filter(w => w.id !== tokenId))
    setConstructionZone(prev => [...prev, token])
    setSoundError(null)
  }

  function moveWordToBank(tokenId: string) {
    if (phase !== "question") return
    const token = constructionZone.find(w => w.id === tokenId)
    if (!token) return
    setConstructionZone(prev => prev.filter(w => w.id !== tokenId))
    setWordBank(prev => [...prev, token])
    setSoundError(null)
  }

  function handleCheckSound() {
    const expected = (soundPregunta?.respuesta_esperada ?? "").trim().toLowerCase()
    const given = constructionZone.map(w => w.text).join(" ").trim().toLowerCase()
    const correct = expected ? given === expected : constructionZone.length > 0
    setIsCorrect(correct)
    setScore(correct ? 100 : 0)
    if (correct) {
      setPhase("result")
      speak("¡Muy bien! Respuesta correcta.")
    } else {
      setSoundError("Esa no es la oración correcta. ¡Inténtalo de nuevo!")
      speak("Esa no es la oración correcta. Inténtalo de nuevo.")
    }
  }

  function handleRetrySound() {
    if (!soundPregunta) return
    const correct = soundPregunta.respuesta_esperada.split(" ").filter(Boolean)
    const distractors = soundPregunta.palabras_distractoras?.split("|").filter(Boolean) ?? []
    const tokens = shuffle([...correct, ...distractors]).map((text, i) => ({
      id: `word-${i}-${text}`,
      text,
    }))
    setWordBank(tokens)
    setConstructionZone([])
    setSoundError(null)
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
                <div className="flex-1 flex items-start gap-4">
                  <div className="flex-1">
                    <SpeakableText as="h2" className="text-xl font-bold text-foreground mb-1">
                      Instrucciones
                    </SpeakableText>
                    <SpeakableText as="p" className="text-lg text-muted-foreground">
                      {config?.instrucciones || "Lee y responde la siguiente pregunta."}
                    </SpeakableText>
                  </div>
                  {settings.voiceEnabled && (
                    <Button
                      variant="outline"
                      className="h-12 px-5 text-base shrink-0 self-center"
                      onClick={() => speak(config?.instrucciones ?? "")}
                      aria-label="Escuchar instrucciones"
                    >
                      <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
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
            {/* Image — only for tipo identificacion */}
            {activity?.tipo === "identificacion" && (
              <figure className="mb-4">
                {activity.imagen_url ? (
                  <img
                    src={activity.imagen_url}
                    alt="Imagen de la actividad"
                    className="w-full max-h-72 object-contain rounded-2xl border-2 border-border bg-muted"
                  />
                ) : (
                  <div
                    className="w-full h-48 rounded-2xl border-2 border-dashed border-border bg-muted flex items-center justify-center"
                    aria-label="Sin imagen"
                  >
                    <p className="text-muted-foreground text-sm">Sin imagen</p>
                  </div>
                )}
                <figcaption className="sr-only">Imagen para identificar</figcaption>
              </figure>
            )}

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

            {/* Sound activity — Duolingo-style sentence builder */}
            {activity?.tipo === "reconocimiento_sonidos" && (
              <div className="space-y-4">
                {/* Audio playback buttons */}
                <div className="flex items-center justify-center gap-4 py-2">
                  <Button
                    size="lg"
                    className="h-20 px-10 text-xl gap-3 rounded-2xl"
                    onClick={() => playSoundSentence(1)}
                    disabled={!soundPregunta}
                    aria-label="Reproducir oración a velocidad normal"
                  >
                    <Volume2 className="w-7 h-7" aria-hidden="true" />
                    Escuchar
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-20 px-8 text-lg gap-3 rounded-2xl border-2"
                    onClick={() => playSoundSentence(0.6)}
                    disabled={!soundPregunta}
                    aria-label="Reproducir oración despacio"
                  >
                    <Volume2 className="w-6 h-6" aria-hidden="true" />
                    Despacio
                  </Button>
                </div>

                <LayoutGroup id="word-tokens">
                  {/* Construction zone */}
                  <Card className="border-2 border-primary/30 bg-primary/5">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Tu oración:</p>
                      <div
                        className="min-h-[56px] flex flex-wrap gap-2 items-center"
                        aria-label="Zona de construcción de oración"
                      >
                        {constructionZone.length === 0 ? (
                          <p className="text-muted-foreground text-sm italic">
                            Toca las palabras de abajo para colocarlas aquí…
                          </p>
                        ) : (
                          constructionZone.map((token) => (
                            <motion.button
                              key={token.id}
                              layoutId={token.id}
                              layout
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              onClick={() => moveWordToBank(token.id)}
                              className="px-4 py-2 rounded-xl border-2 border-primary bg-card text-base font-semibold text-foreground hover:bg-destructive/10 hover:border-destructive"
                              aria-label={`Quitar "${token.text}" de la oración`}
                            >
                              {token.text}
                            </motion.button>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Inline error with retry */}
                  {soundError && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border-2 border-destructive/40">
                      <X className="w-5 h-5 text-destructive shrink-0" aria-hidden="true" />
                      <p className="text-destructive font-medium flex-1">{soundError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetrySound}
                        className="gap-2 shrink-0"
                        aria-label="Reintentar"
                      >
                        <RotateCcw className="w-4 h-4" aria-hidden="true" />
                        Reintentar
                      </Button>
                    </div>
                  )}

                  {/* Word bank */}
                  <Card className="border-2">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Palabras disponibles:</p>
                      <div className="flex flex-wrap gap-2" aria-label="Banco de palabras">
                        {wordBank.map((token) => (
                          <motion.button
                            key={token.id}
                            layoutId={token.id}
                            layout
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            onClick={() => moveWordToZone(token.id)}
                            className="px-4 py-2 rounded-xl border-2 border-border bg-muted text-base font-semibold text-foreground hover:border-primary hover:bg-primary/10"
                            aria-label={`Agregar "${token.text}" a la oración`}
                          >
                            {token.text}
                          </motion.button>
                        ))}
                        {wordBank.length === 0 && !soundError && (
                          <p className="text-muted-foreground text-sm italic">
                            Todas las palabras están en tu oración.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </LayoutGroup>

                {/* Check button */}
                <Button
                  size="lg"
                  className="w-full h-14 text-lg"
                  onClick={handleCheckSound}
                  disabled={constructionZone.length === 0}
                  aria-label="Comprobar mi respuesta"
                >
                  <Check className="w-5 h-5 mr-2" aria-hidden="true" />
                  Comprobar
                </Button>
              </div>
            )}

            {/* Fill activity — completar_oracion */}
            {activity?.tipo === "completar_oracion" && (
              <div className="space-y-5">
                <LayoutGroup id="fill-tokens">
                  {/* Context sentences */}
                  {fillPregunta?.oraciones_contexto && (
                    <Card className="border-2 bg-teal-50/60 border-teal-200 shadow-md rounded-3xl">
                      <CardContent className="p-5">
                        <p className="text-sm font-semibold text-teal-700 mb-3 uppercase tracking-wide">Ejemplos</p>
                        {fillPregunta.oraciones_contexto.split("|").filter(Boolean).map((sentence, si) => (
                          <p key={si} className="text-xl text-foreground leading-relaxed mb-2 last:mb-0 flex flex-wrap gap-x-1">
                            {sentence.split(/\s+/).filter(Boolean).map((word, wi) => {
                              const hKey = `ctx-${si}-${wi}`
                              const isHl = fillHighlighted === hKey
                              const bare = word.replace(/[¿¡.,;:!?«»"']/g, "")
                              return (
                                <span
                                  key={wi}
                                  onClick={() => {
                                    speakWord(bare)
                                    setFillHighlighted(hKey)
                                    setTimeout(() => setFillHighlighted(null), 700)
                                  }}
                                  className={`cursor-pointer rounded px-0.5 transition-colors duration-200 ${isHl ? "bg-teal-300 text-teal-900" : "hover:bg-teal-200"}`}
                                >
                                  {word}
                                </span>
                              )
                            })}
                          </p>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Target sentence with blank */}
                  {fillPregunta && (() => {
                    const parts = fillPregunta.enunciado.split("___")
                    const before = parts[0] ?? ""
                    const after  = parts.slice(1).join("___")
                    return (
                      <Card className="border-2 shadow-lg rounded-3xl">
                        <CardContent className="p-6">
                          <p className="text-base font-medium text-muted-foreground mb-3">Completa la oración:</p>
                          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-2xl font-bold text-foreground leading-relaxed">
                            {before.split(/\s+/).filter(Boolean).map((word, wi) => {
                              const hKey = `tgt-before-${wi}`
                              const isHl = fillHighlighted === hKey
                              const bare = word.replace(/[¿¡.,;:!?«»"']/g, "")
                              return (
                                <span
                                  key={wi}
                                  onClick={() => { speakWord(bare); setFillHighlighted(hKey); setTimeout(() => setFillHighlighted(null), 700) }}
                                  className={`cursor-pointer rounded px-0.5 transition-colors ${isHl ? "bg-primary/20 text-primary" : "hover:text-primary"}`}
                                >
                                  {word}
                                </span>
                              )
                            })}
                            {/* The blank */}
                            {fillSelected ? (
                              <motion.button
                                layoutId={fillSelected.id}
                                layout
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                onClick={handleFillReturn}
                                onMouseEnter={() => settings.voiceEnabled && speakWord(fillSelected.text)}
                                className="px-4 py-1 rounded-xl border-2 border-primary bg-primary/10 text-primary font-bold hover:bg-destructive/10 hover:border-destructive"
                                aria-label={`Quitar "${fillSelected.text}"`}
                              >
                                {fillSelected.text}
                              </motion.button>
                            ) : (
                              <span className="inline-flex items-end min-w-[100px] h-9 border-b-4 border-dashed border-primary mx-1" aria-label="Espacio en blanco" />
                            )}
                            {after.split(/\s+/).filter(Boolean).map((word, wi) => {
                              const hKey = `tgt-after-${wi}`
                              const isHl = fillHighlighted === hKey
                              const bare = word.replace(/[¿¡.,;:!?«»"']/g, "")
                              return (
                                <span
                                  key={wi}
                                  onClick={() => { speakWord(bare); setFillHighlighted(hKey); setTimeout(() => setFillHighlighted(null), 700) }}
                                  className={`cursor-pointer rounded px-0.5 transition-colors ${isHl ? "bg-primary/20 text-primary" : "hover:text-primary"}`}
                                >
                                  {word}
                                </span>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}

                  {/* Inline error */}
                  {fillError && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border-2 border-destructive/40">
                      <X className="w-5 h-5 text-destructive shrink-0" aria-hidden="true" />
                      <p className="text-destructive font-medium flex-1">{fillError}</p>
                      <Button variant="outline" size="sm" onClick={handleRetryFill} className="gap-2 shrink-0">
                        <RotateCcw className="w-4 h-4" aria-hidden="true" />
                        Reintentar
                      </Button>
                    </div>
                  )}

                  {/* Word bank */}
                  <Card className="border-2 rounded-3xl shadow-md">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground mb-4">Elige la palabra correcta:</p>
                      <div className="flex flex-wrap gap-3 justify-center" aria-label="Opciones de palabras">
                        {fillBank.map((token) => (
                          <motion.button
                            key={token.id}
                            layoutId={token.id}
                            layout
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            onClick={() => handleFillSelect(token)}
                            onMouseEnter={() => settings.voiceEnabled && speakWord(token.text)}
                            className="h-14 px-6 rounded-2xl border-2 border-border bg-card text-lg font-bold text-foreground hover:border-primary hover:bg-primary/10 shadow-sm"
                            aria-label={`Seleccionar "${token.text}"`}
                          >
                            {token.text}
                          </motion.button>
                        ))}
                        {fillBank.length === 0 && !fillSelected && (
                          <p className="text-muted-foreground text-sm italic">Todas las palabras están usadas.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </LayoutGroup>

                {/* Check button */}
                <Button
                  size="lg"
                  className="w-full h-14 text-lg"
                  onClick={handleCheckFill}
                  disabled={!fillSelected}
                  aria-label="Comprobar mi respuesta"
                >
                  <Check className="w-5 h-5 mr-2" aria-hidden="true" />
                  Comprobar
                </Button>
              </div>
            )}

            {/* Sequence activity — drag images into numbered zones */}
            {activity?.tipo === "secuenciacion" && seqItems.length > 0 && (() => {
              const placedIds = new Set(seqZones.filter(Boolean).map((z) => z!.id_pregunta))
              const available = seqItems.filter((item) => !placedIds.has(item.id_pregunta))
              const allFilled = seqZones.every((z) => z !== null)
              return (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3 items-start">
                    {/* Left column — draggable image cards */}
                    <div className="space-y-3">
                      {seqItems.map((item) => {
                        const isPlaced = placedIds.has(item.id_pregunta)
                        return (
                          <div
                            key={item.id_pregunta}
                            draggable={!isPlaced}
                            onDragStart={() => !isPlaced && setSeqDragging(item)}
                            onDragEnd={() => setSeqDragging(null)}
                            className={`rounded-2xl border-2 overflow-hidden shadow-md select-none transition-all duration-200 ${
                              isPlaced
                                ? "opacity-30 cursor-default"
                                : seqDragging?.id_pregunta === item.id_pregunta
                                ? "opacity-40 scale-95 cursor-grabbing"
                                : "cursor-grab hover:shadow-lg hover:scale-[1.02] border-border"
                            }`}
                            aria-label={isPlaced ? `${item.enunciado} ya colocada` : `Arrastra ${item.enunciado}`}
                          >
                            {item.imagen_url ? (
                              <img
                                src={item.imagen_url}
                                alt={`Imagen ${item.orden}`}
                                className="w-full h-44 object-contain bg-white"
                                draggable={false}
                              />
                            ) : (
                              <div className="w-full h-44 bg-muted flex items-center justify-center">
                                <p className="text-muted-foreground text-xs">Sin imagen</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Right column — numbered drop zones */}
                    <div className="space-y-3">
                      {seqZones.map((zoneItem, idx) => {
                        const isOver = seqDragOver === idx
                        const slotOk = seqChecked && seqResult.length > idx ? seqResult[idx] : null
                        return (
                          <div
                            key={idx}
                            onDragOver={(e) => { e.preventDefault(); setSeqDragOver(idx) }}
                            onDragLeave={() => setSeqDragOver(null)}
                            onDrop={() => handleSeqDropOnZone(idx)}
                            className={`relative rounded-2xl border-4 overflow-hidden transition-all duration-200 ${
                              slotOk === true
                                ? "border-green-400 bg-green-50/20"
                                : slotOk === false
                                ? "border-destructive bg-destructive/5"
                                : zoneItem
                                ? "border-primary/60 bg-card shadow-md"
                                : isOver
                                ? "border-primary border-solid bg-primary/10 scale-[1.02]"
                                : "border-dashed border-border bg-muted/40"
                            }`}
                            style={{ minHeight: "11rem" }}
                            aria-label={`Zona ${idx + 1}${zoneItem ? `: ${zoneItem.enunciado}` : " vacía"}`}
                          >
                            {/* Zone number badge */}
                            <div className={`absolute top-2 left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center font-black text-base shadow ${
                              slotOk === true ? "bg-green-500 text-white"
                              : slotOk === false ? "bg-destructive text-white"
                              : "bg-primary text-primary-foreground"
                            }`}>
                              {idx + 1}
                            </div>

                            {/* Result icon */}
                            {slotOk !== null && (
                              <div className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center shadow ${slotOk ? "bg-green-500" : "bg-destructive"}`}>
                                {slotOk ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                              </div>
                            )}

                            {zoneItem ? (
                              /* Image placed — click to return */
                              <button
                                onClick={() => handleSeqReturnToLeft(idx)}
                                className="w-full text-left group"
                                aria-label={`Quitar ${zoneItem.enunciado} de la zona ${idx + 1}`}
                              >
                                {zoneItem.imagen_url ? (
                                  <img
                                    src={zoneItem.imagen_url}
                                    alt={`Imagen colocada en zona ${idx + 1}`}
                                    className="w-full h-44 object-contain bg-white group-hover:opacity-80 transition-opacity"
                                    draggable={false}
                                  />
                                ) : (
                                  <div className="w-full h-44 bg-muted flex items-center justify-center">
                                    <p className="text-muted-foreground text-xs">Sin imagen</p>
                                  </div>
                                )}
                              </button>
                            ) : (
                              /* Empty zone */
                              <div className="h-44 flex items-center justify-center">
                                <span className="text-4xl font-black text-muted-foreground/20 select-none">
                                  {idx + 1}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Hint label */}
                  {available.length > 0 && !seqChecked && (
                    <p className="text-center text-sm text-muted-foreground">
                      Arrastra cada imagen a la zona del orden correcto
                    </p>
                  )}

                  {/* Inline error */}
                  {seqChecked && !seqResult.every(Boolean) && seqAttempts < 2 && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border-2 border-destructive/40">
                      <X className="w-5 h-5 text-destructive shrink-0" aria-hidden="true" />
                      <p className="text-destructive font-medium flex-1">
                        Algunas imágenes no están en el orden correcto. ¡Inténtalo de nuevo!
                      </p>
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full h-14 text-lg"
                    onClick={handleCheckSeq}
                    disabled={!allFilled || phase !== "question"}
                    aria-label="Comprobar el orden de las imágenes"
                  >
                    <Check className="w-5 h-5 mr-2" aria-hidden="true" />
                    Comprobar orden
                  </Button>
                </div>
              )
            })()}

            {/* No config — show oral fallback */}
            {!hasOptions && !isShortAnswer && activity?.tipo !== "reconocimiento_sonidos" && activity?.tipo !== "completar_oracion" && activity?.tipo !== "secuenciacion" && (
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
                    : activity?.tipo === "secuenciacion"
                    ? "Puedes ver el orden correcto arriba. ¡Sigue practicando!"
                    : activity?.tipo === "completar_oracion" && fillPregunta
                    ? `La respuesta correcta era: "${fillPregunta.respuesta_esperada}"`
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
