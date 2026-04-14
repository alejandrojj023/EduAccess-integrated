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
import { TextoConGlosario, type GlosarioEntry } from "@/components/ui/texto-con-glosario"
import {
  ArrowLeft, Volume2, Check, X, Star, ChevronRight,
  Mic, HelpCircle, Loader2, RotateCcw, Clock,
} from "lucide-react"
import { motion, LayoutGroup } from "framer-motion"
import { completarLeccion } from "@/hooks/student/use-lesson-completion"
import { VoiceActivity } from "@/components/student/voice-activity"

const MENSAJES_CORRECTO = [
  "¡Excelente! Lo lograste.",
  "¡Muy bien! Sigue así.",
  "¡Correcto! Eres increíble.",
  "¡Fantástico! Muy buen trabajo.",
  "¡Lo tienes! ¡Sigue adelante!",
]
const RETRY_MESSAGES = [
  "¡Inténtalo de nuevo! Puedes lograrlo.",
  "¡Casi! Vuelve a intentarlo.",
  "¡No te rindas! Intenta una vez más.",
]

interface StudentActivityProps {
  activityId: string | null
  lessonId?: string | null
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

// ── Word search grid generator ─────────────────────────────────
const WS_DIRECTIONS = [
  { dr: 0, dc: 1 },   // horizontal →
  { dr: 1, dc: 0 },   // vertical ↓
  { dr: 1, dc: 1 },   // diagonal ↘
  { dr: 1, dc: -1 },  // diagonal ↙
]
function generateWordSearchGrid(words: string[]): string[][] {
  const longest = words.reduce((m, w) => Math.max(m, w.length), 0)
  const size = Math.max(12, longest + 4)
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""))
  for (const word of words) {
    let placed = false
    let attempts = 0
    while (!placed && attempts < 300) {
      attempts++
      const dir = WS_DIRECTIONS[Math.floor(Math.random() * WS_DIRECTIONS.length)]
      const row = Math.floor(Math.random() * size)
      const col = Math.floor(Math.random() * size)
      const endRow = row + dir.dr * (word.length - 1)
      const endCol = col + dir.dc * (word.length - 1)
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue
      let canPlace = true
      for (let i = 0; i < word.length; i++) {
        const r = row + dir.dr * i
        const c = col + dir.dc * i
        if (grid[r][c] !== "" && grid[r][c] !== word[i]) { canPlace = false; break }
      }
      if (canPlace) {
        for (let i = 0; i < word.length; i++) grid[row + dir.dr * i][col + dir.dc * i] = word[i]
        placed = true
      }
    }
  }
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c] === "") grid[r][c] = letters[Math.floor(Math.random() * letters.length)]
  return grid
}

type Phase = "loading" | "question" | "result" | "done" | "lesson-done"

export function StudentActivity({ activityId, lessonId, onBack, onComplete, onVoiceActivity }: StudentActivityProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()

  const [activity, setActivity] = useState<DBActivity | null>(null)
  const [phase, setPhase] = useState<Phase>("loading")
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [textAnswer, setTextAnswer] = useState("")
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)           // 0 or 100
  const [error, setError] = useState<string | null>(null)

  // Sound activity (Duolingo-style) state
  type WordToken = { id: string; text: string }
  const [wordBank, setWordBank] = useState<WordToken[]>([])
  const [constructionZone, setConstructionZone] = useState<WordToken[]>([])
  const [soundError, setSoundError] = useState<string | null>(null)
  const [soundPregunta, setSoundPregunta] = useState<{ respuesta_esperada: string; palabras_distractoras: string | null } | null>(null)

  // Fill activity (completar_oracion) state
  const [fillPregunta, setFillPregunta] = useState<{ enunciado: string; respuesta_esperada: string; palabras_distractoras: string | null; oraciones_contexto: string | null } | null>(null)
  const [fillBank, setFillBank] = useState<WordToken[]>([])
  const [fillSelected, setFillSelected] = useState<WordToken | null>(null)
  const [fillError, setFillError] = useState<string | null>(null)
  const [fillAttempts, setFillAttempts] = useState(0)
  const [fillHighlighted, setFillHighlighted] = useState<string | null>(null)
  const fillAnimatingRef = useRef(false)   // bloquea clics durante la animación layout

  // Sequence activity (secuenciacion) state
  type SeqItem = { id_pregunta: string; enunciado: string; orden: number; imagen_url: string | null }
  const [seqItems, setSeqItems] = useState<SeqItem[]>([])
  const [seqZones, setSeqZones] = useState<(SeqItem | null)[]>([])
  const [seqDragging, setSeqDragging] = useState<SeqItem | null>(null)
  const [seqDragOver, setSeqDragOver] = useState<number | null>(null)
  const [seqChecked, setSeqChecked] = useState(false)
  const [seqResult, setSeqResult] = useState<boolean[]>([])
  const [seqAttempts, setSeqAttempts] = useState(0)

  // Glosario de la lección
  const [glosario, setGlosario] = useState<GlosarioEntry[]>([])

  // Lesson mode state
  const isLessonMode = !!lessonId
  interface ActivityResult { id: string; correct: boolean; attempts: number }
  const [lessonActivities, setLessonActivities] = useState<DBActivity[]>([])
  const [lessonActIndex, setLessonActIndex] = useState(0)
  const [activityResults, setActivityResults] = useState<ActivityResult[]>([])
  const [actAttempts, setActAttempts] = useState(0)
  const [retryBanner, setRetryBanner] = useState<string | null>(null)
  const [earnedStars, setEarnedStars] = useState(0)
  const [starsAnimated, setStarsAnimated] = useState(0)
  const [resultMessage, setResultMessage] = useState("")

  // Timer — tracks elapsed time per activity and total lesson time
  const activityStartRef = useRef<number>(Date.now())
  const lessonStartRef = useRef<number>(Date.now())
  const [lessonElapsedSecs, setLessonElapsedSecs] = useState(0)

  // Word search (sopa_letras) state
  const [wsGrid, setWsGrid] = useState<string[][]>([])
  const [wsPalabras, setWsPalabras] = useState<string[]>([])
  const [wsStart, setWsStart] = useState<{ row: number; col: number } | null>(null)
  const [wsFoundWords, setWsFoundWords] = useState<Set<string>>(new Set())
  const [wsFoundCells, setWsFoundCells] = useState<Set<string>>(new Set())
  const [wsWrongFlash, setWsWrongFlash] = useState(false)


  // Load activity from DB
  useEffect(() => {
    if (!user) return
    if (isLessonMode ? !lessonId : !activityId) return
    loadActivity()
  }, [user, activityId, lessonId])

  async function loadActivity() {
    setPhase("loading")
    setError(null)
    setRetryBanner(null)
    setActAttempts(0)
    lessonStartRef.current = Date.now()
    activityStartRef.current = Date.now()

    if (isLessonMode && lessonId) {
      // Lesson mode: load all non-voice activities for the lesson
      const [{ data: acts }, { data: glosarioData }] = await Promise.all([
        supabase
          .from("actividad")
          .select("id_actividad, titulo, tipo, instrucciones, imagen_url, audio_url, id_leccion")
          .eq("id_leccion", lessonId)
          .eq("publicado", true)
          .order("orden", { ascending: true }),
        supabase
          .from("glosario")
          .select("palabra, definicion")
          .eq("id_leccion", lessonId),
      ])

      const filtered = acts ?? []
      if (!filtered.length) { setError("No hay actividades disponibles en esta lección."); return }

      setGlosario((glosarioData as GlosarioEntry[]) ?? [])
      setLessonActivities(filtered)
      setLessonActIndex(0)
      setActivityResults([])
      loadActivityData(filtered[0])
    } else if (activityId) {
      // Single mode: existing behavior
      const { data: act, error: actErr } = await supabase
        .from("actividad")
        .select("id_actividad, titulo, tipo, instrucciones, imagen_url, audio_url, id_leccion")
        .eq("id_actividad", activityId)
        .single()

      if (actErr || !act) { setError("No se pudo cargar la actividad."); return }

      if (act.tipo === "respuesta_oral") {
        onVoiceActivity()
        return
      }

      if (act.id_leccion) {
        supabase
          .from("glosario")
          .select("palabra, definicion")
          .eq("id_leccion", act.id_leccion)
          .then(({ data }) => setGlosario((data as GlosarioEntry[]) ?? []))
      }

      loadActivityData(act)
    }
  }

  function loadActivityData(act: DBActivity) {
    setActivity(act)
    setPhase("question")
    setSelectedAnswer(null)
    setTextAnswer("")
    setIsCorrect(false)
    setScore(0)
    setRetryBanner(null)
    setActAttempts(0)
    setResultMessage("")
    activityStartRef.current = Date.now()

    if (settings.voiceEnabled && act.tipo !== "reconocimiento_sonidos" && act.tipo !== "completar_oracion" && act.tipo !== "secuenciacion" && act.tipo !== "sopa_letras") {
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

  // Initialize word search when activity loads
  useEffect(() => {
    if (!activity || activity.tipo !== "sopa_letras") return
    const cfg = parseActivityConfig(activity.instrucciones)
    const words = (cfg.palabras_sopa ?? []).map(w => w.toUpperCase()).filter(Boolean)
    setWsPalabras(words)
    setWsFoundWords(new Set())
    setWsFoundCells(new Set())
    setWsStart(null)
    setWsWrongFlash(false)
    setWsGrid(generateWordSearchGrid(words))
    if (settings.voiceEnabled) setTimeout(() => speak(cfg.instrucciones ?? "Encuentra las palabras en la sopa de letras"), 400)
  }, [activity])

  // Star animation when lesson-done phase starts
  useEffect(() => {
    if (phase !== "lesson-done") return
    setStarsAnimated(0)
    const rounded = Math.round(earnedStars)
    if (rounded === 0) return
    let count = 0
    const timer = setInterval(() => {
      count++
      setStarsAnimated(count)
      if (count >= rounded) clearInterval(timer)
    }, 350)
    return () => clearInterval(timer)
  }, [phase, earnedStars])

  function handleWsCellClick(row: number, col: number) {
    if (phase !== "question") return
    const key = `${row}-${col}`
    if (!wsStart) {
      setWsStart({ row, col })
      return
    }
    // Same cell → deselect
    if (wsStart.row === row && wsStart.col === col) {
      setWsStart(null)
      return
    }
    // Check if selection is a straight line
    const dr = row - wsStart.row
    const dc = col - wsStart.col
    const isStraight = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)
    if (!isStraight) {
      setWsStart({ row, col })
      return
    }
    // Extract letters along path
    const len = Math.max(Math.abs(dr), Math.abs(dc))
    const stepR = dr === 0 ? 0 : dr / Math.abs(dr)
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc)
    let letters = ""
    const pathCells: string[] = []
    for (let i = 0; i <= len; i++) {
      const r = wsStart.row + stepR * i
      const c = wsStart.col + stepC * i
      if (r < 0 || r >= wsGrid.length || c < 0 || c >= wsGrid[0].length) { setWsStart({ row, col }); return }
      letters += wsGrid[r][c]
      pathCells.push(`${r}-${c}`)
    }
    const reversed = letters.split("").reverse().join("")
    const matched = wsPalabras.find(w => !wsFoundWords.has(w) && (letters === w || reversed === w))
    if (matched) {
      const newFound = new Set(wsFoundWords).add(matched)
      const newCells = new Set(wsFoundCells)
      pathCells.forEach(k => newCells.add(k))
      setWsFoundWords(newFound)
      setWsFoundCells(newCells)
      setWsStart(null)
      if (settings.voiceEnabled) speak(`¡Encontraste ${matched}!`)
      // Check if all words found
      if (newFound.size === wsPalabras.length) {
        setIsCorrect(true)
        setScore(100)
        setTimeout(() => setPhase("result"), 400)
        speak("¡Felicidades! Encontraste todas las palabras.")
      }
    } else {
      setWsWrongFlash(true)
      setTimeout(() => { setWsWrongFlash(false); setWsStart(null) }, 600)
    }
  }

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
    if (correcta) {
      setIsCorrect(true)
      setScore(100)
      setRetryBanner(null)
      const msg = MENSAJES_CORRECTO[Math.floor(Math.random() * MENSAJES_CORRECTO.length)]
      setResultMessage(msg)
      setPhase("result")
      if (settings.voiceEnabled) speak(msg)
    } else {
      const newAttempts = actAttempts + 1
      setActAttempts(newAttempts)
      if (newAttempts >= 2) {
        setIsCorrect(false)
        setScore(0)
        setRetryBanner(null)
        setResultMessage("")
        setPhase("result")
        const correctOp = opciones.find((o) => o.correcta)
        if (settings.voiceEnabled && correctOp) speak(`La respuesta correcta es: ${correctOp.texto}`)
      } else {
        const msg = RETRY_MESSAGES[Math.floor(Math.random() * RETRY_MESSAGES.length)]
        setRetryBanner(msg)
        setSelectedAnswer(null)
        if (settings.voiceEnabled) speak(msg)
      }
    }
  }

  function handleSubmitText() {
    if (!textAnswer.trim()) return
    const expected = (config?.respuesta_correcta ?? "").trim().toLowerCase()
    const given = textAnswer.trim().toLowerCase()
    const correct = expected ? given.includes(expected) || expected.includes(given) : true
    if (correct) {
      setIsCorrect(true)
      setScore(100)
      setRetryBanner(null)
      const msg = MENSAJES_CORRECTO[Math.floor(Math.random() * MENSAJES_CORRECTO.length)]
      setResultMessage(msg)
      setPhase("result")
      if (settings.voiceEnabled) speak(msg)
    } else {
      const newAttempts = actAttempts + 1
      setActAttempts(newAttempts)
      if (newAttempts >= 2) {
        setIsCorrect(false)
        setScore(0)
        setRetryBanner(null)
        setResultMessage("")
        setPhase("result")
        if (settings.voiceEnabled && config?.respuesta_correcta) speak(`La respuesta correcta es: ${config.respuesta_correcta}`)
      } else {
        const msg = RETRY_MESSAGES[Math.floor(Math.random() * RETRY_MESSAGES.length)]
        setRetryBanner(msg)
        if (settings.voiceEnabled) speak(msg)
      }
    }
  }

  async function handleFinish() {
    // Guarda el intento individual de la actividad
    const tiempoSeg = Math.round((Date.now() - activityStartRef.current) / 1000)
    if (user && activityId) {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch("/api/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ activityId, puntaje: score, tiempoSegundos: tiempoSeg }),
      })
    }
    speak(`¡Actividad completada!`)
    onComplete()
  }

  function getCorrectAnswer(): string {
    const tipo = activity?.tipo
    if (tipo === "seleccion_guiada" || tipo === "identificacion") {
      return opciones.find((o) => o.correcta)?.texto ?? "—"
    }
    if (tipo === "respuesta_corta") return config?.respuesta_correcta ?? "—"
    if (tipo === "completar_oracion" && fillPregunta) return fillPregunta.respuesta_esperada
    return "—"
  }

  function getStarMessage(stars: number): string {
    if (stars >= 5) return "¡Perfecto! Dominas esta lección."
    if (stars >= 4) return "¡Excelente trabajo! Casi lo tienes perfecto."
    if (stars >= 3) return "¡Muy bien! Sigue practicando para mejorar."
    if (stars >= 2) return "¡Buen esfuerzo! Puedes lograrlo mejor."
    if (stars >= 1) return "¡Lo intentaste! Sigue practicando."
    return "Sigue practicando, lo lograrás la próxima vez."
  }

  async function handleNextActivity() {
    if (!activity) return
    const tiempoSeg = Math.round((Date.now() - activityStartRef.current) / 1000)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch("/api/attempts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ activityId: activity.id_actividad, puntaje: score, tiempoSegundos: tiempoSeg }),
    })

    const result: ActivityResult = {
      id: activity.id_actividad,
      correct: isCorrect,
      attempts: actAttempts || 1,
    }
    const newResults = [...activityResults, result]
    setActivityResults(newResults)

    const nextIndex = lessonActIndex + 1
    if (nextIndex >= lessonActivities.length) {
      await handleLessonComplete(newResults)
    } else {
      setLessonActIndex(nextIndex)
      loadActivityData(lessonActivities[nextIndex])
    }
  }

  async function handleLessonComplete(results: ActivityResult[]) {
    setPhase("loading")
    const totalSecs = Math.round((Date.now() - lessonStartRef.current) / 1000)
    setLessonElapsedSecs(totalSecs)
    const stars = await completarLeccion(user!.id, lessonId!, results, totalSecs)
    setEarnedStars(stars)
    setPhase("lesson-done")
  }

  // Avanza al siguiente paso de la lección sin guardar intento (ya guardado externamente)
  async function handleAdvanceLesson(result: ActivityResult) {
    const newResults = [...activityResults, result]
    setActivityResults(newResults)
    const nextIndex = lessonActIndex + 1
    if (nextIndex >= lessonActivities.length) {
      await handleLessonComplete(newResults)
    } else {
      setLessonActIndex(nextIndex)
      loadActivityData(lessonActivities[nextIndex])
    }
  }

  async function handleRetryLesson() {
    // Increment total_reintentos via admin API (bypasses RLS)
    if (user && lessonId) {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch("/api/complete-lesson", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ lessonId }),
      })
    }

    setActivityResults([])
    setLessonActIndex(0)
    setEarnedStars(0)
    setStarsAnimated(0)
    setLessonElapsedSecs(0)
    lessonStartRef.current = Date.now()
    if (lessonActivities.length > 0) {
      loadActivityData(lessonActivities[0])
    }
  }

  // ── Render ──────────────────────────────────────────────────

  // En modo lección, actividad oral → mostrar VoiceActivity real con contexto de lección
  // Solo durante phase="question": si phase cambia a "loading"/"lesson-done" hay que mostrar esas pantallas
  if (isLessonMode && activity?.tipo === "respuesta_oral" && phase === "question") {
    return (
      <VoiceActivity
        activityId={activity.id_actividad}
        onBack={onBack}
        onComplete={() =>
          handleAdvanceLesson({ id: activity.id_actividad, correct: true, attempts: 1 })
        }
        lessonIndex={lessonActIndex}
        lessonTotal={lessonActivities.length}
      />
    )
  }

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
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1 text-center px-4">
              <p className="font-bold text-lg line-clamp-1">{activity?.titulo}</p>
              {isLessonMode && lessonActivities.length > 0 && (
                <p className="text-sm opacity-80">
                  Actividad {lessonActIndex + 1} de {lessonActivities.length}
                </p>
              )}
            </div>
            {!isLessonMode && (
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-accent" aria-hidden="true" />
                <span className="text-xl font-bold">{score}</span>
              </div>
            )}
            {isLessonMode && lessonActivities.length > 0 && (
              <div className="text-right min-w-[60px]">
                <p className="text-xs opacity-70">Progreso</p>
                <p className="font-bold">
                  {Math.round((lessonActIndex / lessonActivities.length) * 100)}%
                </p>
              </div>
            )}
          </div>
          <Progress
            value={isLessonMode && lessonActivities.length > 0
              ? Math.round((lessonActIndex / lessonActivities.length) * 100)
              : phase === "done" ? 100 : phase === "result" ? 66 : 33}
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
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      <TextoConGlosario
                        texto={config?.instrucciones || "Lee y responde la siguiente pregunta."}
                        glosario={glosario}
                      />
                    </p>
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
            {/* Retry banner — shown after first wrong attempt */}
            {retryBanner && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 mb-4">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <p className="text-amber-800 font-semibold flex-1">{retryBanner}</p>
              </div>
            )}
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
                    const after = parts.slice(1).join("___")
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
                            className={`rounded-2xl border-2 overflow-hidden shadow-md select-none transition-all duration-200 ${isPlaced
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
                                className="w-full h-44 object-contain bg-card"
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
                            className={`relative rounded-2xl border-4 overflow-hidden transition-all duration-200 ${slotOk === true
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
                            <div className={`absolute top-2 left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center font-black text-base shadow ${slotOk === true ? "bg-green-500 text-white"
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
                                    className="w-full h-44 object-contain bg-card group-hover:opacity-80 transition-opacity"
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

            {/* Word search activity — sopa de letras */}
            {activity?.tipo === "sopa_letras" && wsGrid.length > 0 && (
              <div className="space-y-5">
                {/* Word list */}
                <Card className="border-2">
                  <CardContent className="p-5">
                    <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                      Palabras a encontrar ({wsFoundWords.size}/{wsPalabras.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {wsPalabras.map(word => (
                        <span
                          key={word}
                          className={`px-3 py-1.5 rounded-lg border-2 font-bold text-base transition-all ${wsFoundWords.has(word)
                              ? "bg-success/10 border-success text-success line-through"
                              : "bg-muted border-border text-foreground"
                            }`}
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                {/* Grid */}
                <Card className={`border-2 transition-all ${wsWrongFlash ? "border-destructive" : "border-border"}`}>
                  <CardContent className="p-3 overflow-x-auto">
                    <div
                      className="inline-grid gap-0.5"
                      style={{ gridTemplateColumns: `repeat(${wsGrid[0]?.length ?? 12}, minmax(0, 1fr))` }}
                      aria-label="Cuadrícula de sopa de letras"
                    >
                      {wsGrid.map((rowArr, r) =>
                        rowArr.map((letter, c) => {
                          const key = `${r}-${c}`
                          const isFound = wsFoundCells.has(key)
                          const isStart = wsStart?.row === r && wsStart?.col === c
                          return (
                            <button
                              key={key}
                              onClick={() => handleWsCellClick(r, c)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm font-bold rounded flex items-center justify-center transition-all select-none ${isFound
                                  ? "bg-green-400 text-white"
                                  : isStart
                                    ? "bg-primary text-primary-foreground scale-110 z-10 relative"
                                    : wsWrongFlash
                                      ? "bg-destructive/20 text-foreground"
                                      : "bg-muted hover:bg-primary/20 text-foreground"
                                }`}
                              aria-label={`Letra ${letter}`}
                            >
                              {letter}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
                <p className="text-center text-sm text-muted-foreground">
                  Toca la primera y última letra de cada palabra para encontrarla
                </p>
                {/* Give up button */}
                {wsFoundWords.size < wsPalabras.length && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-12 border-2"
                    onClick={() => {
                      setIsCorrect(wsFoundWords.size >= Math.ceil(wsPalabras.length / 2))
                      setScore(Math.round((wsFoundWords.size / wsPalabras.length) * 100))
                      setPhase("result")
                    }}
                  >
                    Terminar con {wsFoundWords.size} de {wsPalabras.length} palabras
                  </Button>
                )}
              </div>
            )}

            {/* No config — show oral fallback */}
            {!hasOptions && !isShortAnswer && activity?.tipo !== "reconocimiento_sonidos" && activity?.tipo !== "completar_oracion" && activity?.tipo !== "secuenciacion" && activity?.tipo !== "sopa_letras" && (
              <Card className="border-2">
                <CardContent className="py-10 text-center space-y-4">
                  <Mic className="w-12 h-12 text-primary mx-auto" aria-hidden="true" />
                  <p className="text-lg text-muted-foreground">Esta actividad se responde de forma oral.</p>
                  {isLessonMode ? (
                    <>
                      <p className="text-sm text-muted-foreground">Responde en voz alta y luego continúa.</p>
                      <Button
                        size="lg"
                        onClick={() => {
                          setIsCorrect(true)
                          setScore(100)
                          setResultMessage("¡Actividad oral completada!")
                          setPhase("result")
                          if (settings.voiceEnabled) speak("Actividad oral completada. Continuemos.")
                        }}
                      >
                        Completar y continuar
                        <ChevronRight className="w-5 h-5 ml-2" aria-hidden="true" />
                      </Button>
                    </>
                  ) : (
                    <Button size="lg" onClick={onVoiceActivity}>
                      Iniciar actividad oral
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* Result */}
        {phase === "result" && (
          <section aria-live="polite" aria-label="Resultado de tu respuesta">
            <Card className={`border-4 shadow-xl ${isCorrect ? "border-green-400 bg-green-50/40" : "border-amber-400 bg-amber-50/40"}`}>
              <CardContent className="p-8 text-center space-y-4">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${isCorrect ? "bg-green-500" : "bg-amber-500"}`}>
                  {isCorrect
                    ? <Check className="w-10 h-10 text-white" aria-hidden="true" />
                    : <X className="w-10 h-10 text-white" aria-hidden="true" />}
                </div>
                <SpeakableText as="h3" className={`text-3xl font-bold ${isCorrect ? "text-green-700" : "text-amber-700"}`}>
                  {isCorrect
                    ? (resultMessage || "¡Excelente!")
                    : activity?.tipo === "sopa_letras"
                      ? "¡Buen intento!"
                      : "¡Casi! Sigue practicando"}
                </SpeakableText>
                <SpeakableText as="p" className="text-lg text-muted-foreground">
                  {isCorrect
                    ? activity?.tipo === "sopa_letras"
                      ? `¡Encontraste todas las palabras! ${wsPalabras.length} de ${wsPalabras.length}.`
                      : "¡Muy bien! Has respondido correctamente."
                    : activity?.tipo === "sopa_letras"
                      ? `Encontraste ${wsFoundWords.size} de ${wsPalabras.length} palabras. ¡Sigue practicando!`
                      : activity?.tipo === "secuenciacion"
                        ? "Puedes ver el orden correcto arriba. ¡Sigue practicando!"
                        : ""}
                </SpeakableText>
                {!isCorrect && activity?.tipo !== "sopa_letras" && activity?.tipo !== "secuenciacion" && (
                  <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4 text-left">
                    <p className="text-sm font-semibold text-amber-700 mb-1">Respuesta correcta:</p>
                    <p className="text-lg font-bold text-amber-900">{getCorrectAnswer()}</p>
                  </div>
                )}
                {isLessonMode ? (
                  <Button
                    size="lg"
                    className="h-16 text-xl px-12"
                    onClick={handleNextActivity}
                  >
                    {lessonActIndex + 1 < lessonActivities.length ? "Siguiente actividad" : "Ver resultado final"}
                    <ChevronRight className="w-6 h-6 ml-3" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="h-16 text-xl px-12"
                    onClick={handleFinish}
                  >
                    Terminar actividad
                    <ChevronRight className="w-6 h-6 ml-3" aria-hidden="true" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Lesson done — star result screen */}
        {phase === "lesson-done" && (
          <section aria-live="polite" aria-label="Resultado de la lección" className="space-y-8 py-4">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-foreground">¡Lección completada!</h2>
              <p className="text-muted-foreground text-lg">Aquí están tus estrellas</p>
            </div>

            {/* Animated stars */}
            <div className="flex justify-center gap-3" role="img" aria-label={`${Math.round(earnedStars)} de 5 estrellas`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-14 h-14 transition-all duration-300 ${i < starsAnimated ? "text-amber-400 fill-amber-400 scale-110" : "text-muted-foreground/30"}`}
                  aria-hidden="true"
                />
              ))}
            </div>

            <p className="text-center text-2xl font-bold text-amber-600">
              {Math.round(earnedStars)} de 5 estrellas
            </p>

            {/* Tiempo empleado */}
            {lessonElapsedSecs > 0 && (
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 bg-muted/60 rounded-full px-5 py-2">
                  <Clock className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  <span className="text-lg font-semibold text-foreground">
                    {lessonElapsedSecs < 60
                      ? `${lessonElapsedSecs} seg`
                      : `${Math.floor(lessonElapsedSecs / 60)}:${String(lessonElapsedSecs % 60).padStart(2, "0")} min`}
                  </span>
                </div>
              </div>
            )}

            <Card className="border-2 shadow-lg">
              <CardContent className="p-6 text-center">
                <p className="text-xl text-foreground font-medium">{getStarMessage(Math.round(earnedStars))}</p>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <Button
                size="lg"
                variant="outline"
                className="h-14 text-lg border-2"
                onClick={handleRetryLesson}
              >
                <RotateCcw className="w-5 h-5 mr-2" aria-hidden="true" />
                Repetir lección
              </Button>
              <Button
                size="lg"
                className="h-14 text-lg"
                onClick={onComplete}
              >
                Continuar
                <ChevronRight className="w-6 h-6 ml-2" aria-hidden="true" />
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
