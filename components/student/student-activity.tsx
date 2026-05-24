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
  Mic, HelpCircle, Loader2, RotateCcw, Clock, Turtle,
} from "lucide-react"
import { motion, LayoutGroup, useReducedMotion } from "framer-motion"
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
  lessonName?: string
  onBack: () => void
  onComplete: () => void
  onVoiceActivity: () => void
  /** Vista previa (docente): no guarda intentos ni completa lección */
  previewMode?: boolean
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

function playWordFoundSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + i * 0.1)
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.1 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.22)
      osc.start(now + i * 0.1)
      osc.stop(now + i * 0.1 + 0.22)
    })
  } catch {}
}

// Variable de módulo para el audio del modal — accesible fuera del ciclo de vida de React
let _modalAudio: HTMLAudioElement | null = null
let _modalCancelled = false

function _stopModalAudio() {
  _modalCancelled = true
  if (_modalAudio) {
    _modalAudio.pause()
    _modalAudio.src = ""
    _modalAudio = null
  }
}

interface BackConfirmModalProps {
  isPlayingModal: boolean
  onSpeak: () => void
  onContinue: () => void
  onExit: () => void
}

function BackConfirmModal({ isPlayingModal, onSpeak, onContinue, onExit }: BackConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="w-full max-w-sm rounded-3xl bg-background border-2 border-primary/20 shadow-2xl p-6 space-y-4 text-center"
      >
        <h2 className="text-xl font-black text-foreground" aria-hidden="true">¡Oh, espera! ¿Ya te vas?</h2>
        <div className="flex flex-col items-center gap-1 py-1">
          <div className="relative">
            <motion.button
              whileTap={{ scale: 1.25 }}
              transition={{ type: "spring", stiffness: 500, damping: 10 }}
              onClick={onSpeak}
              className="relative w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 hover:scale-105 transition-all duration-150"
              aria-label="Escuchar mensaje"
            >
              <Volume2 className="w-7 h-7" aria-hidden="true" />
            </motion.button>
          </div>
          <span className="text-sm font-semibold text-foreground" aria-hidden="true">Toca para repetir</span>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <Button size="lg" className="h-11 text-base font-black" onClick={onContinue}>
            ¡SÍ, QUIERO SEGUIR!
          </Button>
          <Button size="lg" variant="ghost" className="h-11 text-base text-muted-foreground hover:text-foreground" onClick={onExit}>
            Terminar por ahora
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export function StudentActivity({ activityId, lessonId, lessonName, onBack, onComplete, onVoiceActivity, previewMode = false }: StudentActivityProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()
  const prefersReducedMotion = useReducedMotion()

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
  const fillBankOriginalRef = useRef<WordToken[]>([])
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
  interface ActivityResult { id: string; correct: boolean; attempts: number; puntaje?: number; intentoId?: string }
  const [lessonActivities, setLessonActivities] = useState<DBActivity[]>([])
  const [lessonActIndex, setLessonActIndex] = useState(0)
  const [activityResults, setActivityResults] = useState<ActivityResult[]>([])
  const [actAttempts, setActAttempts] = useState(0)
  const [retryBanner, setRetryBanner] = useState<string | null>(null)
  const [earnedStars, setEarnedStars] = useState(0)
  const [starsAnimated, setStarsAnimated] = useState(0)
  const [starPopping, setStarPopping] = useState<number | null>(null)
  const [isCompletingLesson, setIsCompletingLesson] = useState(false)
  const [fadeActive, setFadeActive] = useState(false)
  const [resultVisible, setResultVisible] = useState(false)
  const [lessonDoneVisible, setLessonDoneVisible] = useState(false)
  const [retryVisible, setRetryVisible] = useState(false)
  const [showBackConfirm, setShowBackConfirm] = useState(false)
  const [isPlayingModal, setIsPlayingModal] = useState(false)
  const [resultMessage, setResultMessage] = useState("")

  // Timer — tracks elapsed time per activity and total lesson time
  const activityStartRef = useRef<number>(Date.now())
  const lessonStartRef = useRef<number>(Date.now())
  const currentAttemptsRef = useRef<number>(1)
  const answerRef = useRef<string>("")
  const soundActxRef = useRef<{ actx: AudioContext; source: AudioBufferSourceNode } | null>(null)
  const [lessonElapsedSecs, setLessonElapsedSecs] = useState(0)

  // Word search (sopa_letras) state
  const [wsGrid, setWsGrid] = useState<string[][]>([])
  const [wsPalabras, setWsPalabras] = useState<string[]>([])
  const [wsStart, setWsStart] = useState<{ row: number; col: number } | null>(null)
  const [wsFoundWords, setWsFoundWords] = useState<Set<string>>(new Set())
  const [wsFoundCells, setWsFoundCells] = useState<Set<string>>(new Set())
  const [wsWrongFlash, setWsWrongFlash] = useState(false)
  const [wsWordColors, setWsWordColors] = useState<Map<string, number>>(new Map())
  const [wsCellWord, setWsCellWord]     = useState<Map<string, string>>(new Map())
  const [wsAnimatingCells, setWsAnimatingCells] = useState<Set<string>>(new Set())

  const WS_COLORS = [
    { bg: "bg-emerald-400", border: "border-emerald-400", text: "text-emerald-700", light: "bg-emerald-400/20" },
    { bg: "bg-blue-400",    border: "border-blue-400",    text: "text-blue-700",    light: "bg-blue-400/20"    },
    { bg: "bg-violet-400",  border: "border-violet-400",  text: "text-violet-700",  light: "bg-violet-400/20"  },
    { bg: "bg-amber-400",   border: "border-amber-400",   text: "text-amber-700",   light: "bg-amber-400/20"   },
    { bg: "bg-pink-400",    border: "border-pink-400",    text: "text-pink-700",    light: "bg-pink-400/20"    },
    { bg: "bg-orange-400",  border: "border-orange-400",  text: "text-orange-700",  light: "bg-orange-400/20"  },
  ]


  // Load activity from DB
  useEffect(() => {
    if (!user) return
    if (isLessonMode ? !lessonId : !activityId) return
    loadActivity()
  }, [user, activityId, lessonId])

  // Auto-speak modal de confirmación al abrirse (DUA Principio 1)
  useEffect(() => {
    if (showBackConfirm) {
      handleModalSpeak()
    } else {
      stopModalAudio()
    }
  }, [showBackConfirm])

  async function handleModalSpeak() {
    _stopModalAudio()
    _modalCancelled = false
    setIsPlayingModal(true)
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "¡Lo estás haciendo increíble! Si te quedas un poquito más, estarás más cerca de completar la lección. Si sales ahora, tendrás que empezar de nuevo. ¿Seguimos aprendiendo?" }),
      })
      if (_modalCancelled) return
      if (!res.ok) { setIsPlayingModal(false); return }
      const { audio } = await res.json()
      if (_modalCancelled) return
      const audioEl = new Audio(`data:audio/mp3;base64,${audio}`)
      _modalAudio = audioEl
      audioEl.onended = () => { setIsPlayingModal(false); _modalAudio = null }
      await audioEl.play()
    } catch {
      setIsPlayingModal(false)
    }
  }

  function stopModalAudio() {
    _stopModalAudio()
    setIsPlayingModal(false)
  }

  // ── Session storage helpers ────────────────────────────────
  function lessonKey() { return lessonId ? `lesson_progress_${lessonId}` : null }

  function saveLessonProgress(index: number, results: ActivityResult[]) {
    const key = lessonKey()
    if (!key) return
    sessionStorage.setItem(key, JSON.stringify({
      lessonActIndex: index,
      activityResults: results,
      lessonStartTime: lessonStartRef.current,
    }))
  }

  function clearLessonProgress() {
    const key = lessonKey()
    if (key) sessionStorage.removeItem(key)
  }

  function savePendingResult(correct: boolean, scoreVal: number, attempts: number) {
    if (!isLessonMode || !activity) return
    currentAttemptsRef.current = attempts
    const tiempoSeg = Math.round((Date.now() - activityStartRef.current) / 1000)
    const key = lessonKey()
    if (!key) return
    try {
      const raw = sessionStorage.getItem(key)
      const saved = raw ? JSON.parse(raw) : {}
      sessionStorage.setItem(key, JSON.stringify({
        ...saved,
        pendingResult: { id: activity.id_actividad, correct, score: scoreVal, attempts, tiempoSeg },
      }))
    } catch { /* ignore */ }
  }

  async function loadActivity() {
    setPhase("loading")
    setError(null)
    setRetryBanner(null)
    setActAttempts(0)
    currentAttemptsRef.current = 1
    answerRef.current = ""
    activityStartRef.current = Date.now()

    if (isLessonMode && lessonId) {
      if (previewMode) {
        setError("La vista previa del docente no soporta modo lección todavía.")
        return
      }
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

      // Restore saved progress if exists (refresh mid-lesson)
      const savedRaw = sessionStorage.getItem(`lesson_progress_${lessonId}`)
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw)
          const savedIndex = Math.min(saved.lessonActIndex ?? 0, filtered.length - 1)
          const savedResults: ActivityResult[] = saved.activityResults ?? []
          lessonStartRef.current = saved.lessonStartTime ?? Date.now()

          if (saved.pendingResult) {
            // Activity was answered (result shown) but Siguiente not clicked — auto-advance
            const pr = saved.pendingResult
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
              await fetch("/api/attempts", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ activityId: pr.id, puntaje: pr.score, tiempoSegundos: pr.tiempoSeg }),
              })
            }
            const result: ActivityResult = { id: pr.id, correct: pr.correct, attempts: pr.attempts }
            const newResults = [...savedResults, result]
            const nextIndex = savedIndex + 1
            if (nextIndex >= filtered.length) {
              clearLessonProgress()
              await handleLessonComplete(newResults)
            } else {
              clearLessonProgress()
              saveLessonProgress(nextIndex, newResults)
              setLessonActIndex(nextIndex)
              setActivityResults(newResults)
              loadActivityData(filtered[nextIndex])
            }
          } else {
            setLessonActIndex(savedIndex)
            setActivityResults(savedResults)
            loadActivityData(filtered[savedIndex])
          }
          return
        } catch {
          sessionStorage.removeItem(`lesson_progress_${lessonId}`)
        }
      }

      // Fresh start
      lessonStartRef.current = Date.now()
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
        if (previewMode) {
          // En vista previa del docente, renderizamos la actividad de voz inline (sin guardar intentos)
          setActivity(act)
          setPhase("question")
          return
        } else {
          onVoiceActivity()
          return
        }
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
    currentAttemptsRef.current = 1
    setResultMessage("")
    activityStartRef.current = Date.now()

    if (settings.voiceEnabled && act.tipo !== "reconocimiento_sonidos" && act.tipo !== "completar_oracion" && act.tipo !== "secuenciacion" && act.tipo !== "respuesta_oral") {
      const cfg = parseActivityConfig(act.instrucciones)
      const instrToSpeak = act.tipo === "sopa_letras"
        ? (cfg.instrucciones?.trim() || "Busca las palabras en la sopa de letras")
        : cfg.instrucciones
      if (instrToSpeak) setTimeout(() => speak(instrToSpeak), 400)
    }
  }

  // Fetch pregunta and initialize word bank when a sound activity loads
  useEffect(() => {
    if (!activity || activity.tipo !== "reconocimiento_sonidos") return
    setSoundPregunta(null)
    setWordBank([])
    setConstructionZone([])
    setSoundError(null)
    let timerId: ReturnType<typeof setTimeout>

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
        // Auto-speak: lee instrucciones del docente, no la oración a reconstruir
        if (settings.voiceEnabled) {
          const cfg = parseActivityConfig(activity.instrucciones)
          timerId = setTimeout(() => speak(cfg.instrucciones || "Escucha la oración y ordena las palabras"), 600)
        }
      })

    return () => clearTimeout(timerId)
  }, [activity])

  // Initialize word search grid when activity loads
  useEffect(() => {
    if (!activity || activity.tipo !== "sopa_letras") return
    const cfg = parseActivityConfig(activity.instrucciones)
    const words = (cfg.palabras_sopa ?? []).map(w => w.toUpperCase()).filter(Boolean)
    setWsPalabras(words)
    setWsFoundWords(new Set())
    setWsFoundCells(new Set())
    setWsStart(null)
    setWsWrongFlash(false)
    setWsWordColors(new Map())
    setWsCellWord(new Map())
    setWsAnimatingCells(new Set())
    setWsGrid(generateWordSearchGrid(words))
  }, [activity])


  // Star animation when lesson-done phase starts
  useEffect(() => {
    if (phase !== "lesson-done") return
    setStarsAnimated(0)
    setStarPopping(null)
    const total = Math.ceil(earnedStars)
    if (total === 0) return
    let count = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    const timer = setInterval(() => {
      count++
      setStarsAnimated(count)
      setStarPopping(count - 1)
      const t = setTimeout(() => setStarPopping(null), 300)
      timers.push(t)
      if (count >= total) clearInterval(timer)
    }, 380)
    return () => { clearInterval(timer); timers.forEach(clearTimeout) }
  }, [phase, earnedStars])

  // Audio announcement on lesson completion (always plays, independent of voiceEnabled setting)
  useEffect(() => {
    if (phase !== "lesson-done") return
    if (!("speechSynthesis" in window)) return
    const rounded = Math.round(earnedStars)
    const displayStars = earnedStars % 1 === 0 ? earnedStars : earnedStars.toFixed(1)
    const starMsg =
      rounded >= 5 ? "¡Perfecto! Dominas esta lección." :
      rounded >= 4 ? "¡Excelente trabajo! Casi lo tienes perfecto." :
      rounded >= 3 ? "¡Muy bien! Sigue practicando para mejorar." :
      rounded >= 2 ? "¡Buen esfuerzo! Puedes lograrlo mejor." :
      rounded >= 1 ? "¡Lo intentaste! Sigue practicando." :
                     "Sigue practicando, lo lograrás la próxima vez."
    const text = `¡Lección completada! Obtuviste ${displayStars} estrella${earnedStars !== 1 ? "s" : ""}. ${starMsg}`
    const t = setTimeout(() => { speak(text) }, 600)
    return () => { clearTimeout(t) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, earnedStars])

  // Fade-in del resultado al aparecer
  useEffect(() => {
    if (phase === "result") {
      setResultVisible(false)
      const t = setTimeout(() => setResultVisible(true), 30)
      return () => clearTimeout(t)
    } else {
      setResultVisible(false)
    }
  }, [phase])

  // Fade-in de lección completada
  useEffect(() => {
    if (phase === "lesson-done") {
      setLessonDoneVisible(false)
      const t = setTimeout(() => setLessonDoneVisible(true), 30)
      return () => clearTimeout(t)
    } else {
      setLessonDoneVisible(false)
    }
  }, [phase])

  // Fade-in del banner de reintento
  useEffect(() => {
    if (retryBanner) {
      setRetryVisible(false)
      const t = setTimeout(() => setRetryVisible(true), 30)
      return () => clearTimeout(t)
    } else {
      setRetryVisible(false)
    }
  }, [retryBanner])

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
      playWordFoundSound()
      const newFound = new Set(wsFoundWords).add(matched)
      const newCells = new Set(wsFoundCells)
      pathCells.forEach(k => newCells.add(k))

      // Assign a distinct color to the found word
      const colorIdx = wsWordColors.size % WS_COLORS.length
      const newWordColors = new Map(wsWordColors).set(matched, colorIdx)
      const newCellWord = new Map(wsCellWord)
      pathCells.forEach(k => newCellWord.set(k, matched))

      // Animate newly found cells briefly
      setWsAnimatingCells(prev => { const s = new Set(prev); pathCells.forEach(k => s.add(k)); return s })
      setTimeout(() => {
        setWsAnimatingCells(prev => { const s = new Set(prev); pathCells.forEach(k => s.delete(k)); return s })
      }, 600)

      setWsFoundWords(newFound)
      setWsFoundCells(newCells)
      setWsWordColors(newWordColors)
      setWsCellWord(newCellWord)
      setWsStart(null)
      // Check if all words found
      if (newFound.size === wsPalabras.length) {
        answerRef.current = [...newFound].join(", ")
        setIsCorrect(true)
        setScore(100)
        savePendingResult(true, 100, 1)
        if (settings.voiceEnabled) speak(`¡Encontraste ${matched}! ¡Felicidades! Encontraste todas las palabras.`)
        setTimeout(() => setPhase("result"), 2500)
      } else {
        if (settings.voiceEnabled) speak(`¡Encontraste ${matched}!`)
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
    let timerId: ReturnType<typeof setTimeout>

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
        fillBankOriginalRef.current = tokens
        // Auto-speak instructions
        if (settings.voiceEnabled) timerId = setTimeout(() => speak(activity.instrucciones ?? "Completa la oración"), 400)
      })

    return () => clearTimeout(timerId)
  }, [activity])

  // Speak a single word using Web Speech API (respects user voice settings)
  function speakWord(text: string) {
    speak(text)
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
    answerRef.current = fillSelected.text.trim()
    const correct = fillSelected.text.trim().toLowerCase() === fillPregunta.respuesta_esperada.trim().toLowerCase()
    const newAttempts = fillAttempts + 1
    setFillAttempts(newAttempts)
    if (correct) {
      setIsCorrect(true)
      setScore(100)
      savePendingResult(true, 100, newAttempts)
      setPhase("result")
      speak("¡Muy bien! Respuesta correcta.")
    } else if (newAttempts >= 2) {
      setIsCorrect(false)
      setScore(0)
      savePendingResult(false, 0, newAttempts)
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

    let timerId: ReturnType<typeof setTimeout>

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
        if (settings.voiceEnabled) timerId = setTimeout(() => speak(activity.instrucciones ?? "Ordena las imágenes arrastrándolas"), 400)
      })

    return () => clearTimeout(timerId)
  }, [activity])

  function playPlacementSound() {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(520, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.22)
      osc.onended = () => ctx.close()
    } catch {}
  }

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
    playPlacementSound()
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
    answerRef.current = seqZones.map(z => z?.enunciado ?? "?").join(" → ")
    const result = seqZones.map((item, idx) => item !== null && item.orden === idx + 1)
    const allCorrect = result.every(Boolean)
    const newAttempts = seqAttempts + 1
    setSeqAttempts(newAttempts)
    setSeqChecked(true)
    setSeqResult(result)

    if (allCorrect) {
      setIsCorrect(true)
      setScore(100)
      savePendingResult(true, 100, newAttempts)
      setPhase("result")
      speak("¡Excelente! Ordenaste la secuencia correctamente.")
    } else if (newAttempts >= 2) {
      setTimeout(() => {
        const correctZones = Array.from({ length: seqItems.length }, (_, idx) =>
          seqItems.find((item) => item.orden === idx + 1) ?? null
        )
        setSeqZones(correctZones)
        setSeqResult(correctZones.map(() => true))
        speak("Este es el orden correcto de la secuencia.")
        setTimeout(() => {
          setIsCorrect(false)
          setScore(0)
          savePendingResult(false, 0, newAttempts)
          setPhase("result")
        }, 3000)
      }, 600)
    } else {
      speak("Algunas imágenes no están en el orden correcto. ¡Inténtalo de nuevo!")
    }
  }

  async function playSoundSentence(speakingRate = 1) {
    if (!soundPregunta) return
    // Detener audio previo antes de iniciar uno nuevo
    if (soundActxRef.current) {
      try { soundActxRef.current.source.stop() } catch {}
      try { soundActxRef.current.actx.close() } catch {}
      soundActxRef.current = null
    }
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: soundPregunta.respuesta_esperada, speakingRate }),
      })
      if (!res.ok) return
      const { audio } = await res.json()
      const bytes   = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0)).buffer
      const actx    = new AudioContext()
      const decoded = await actx.decodeAudioData(bytes)
      const source  = actx.createBufferSource()
      source.buffer = decoded
      source.connect(actx.destination)
      soundActxRef.current = { actx, source }
      source.onended = () => {
        actx.close()
        if (soundActxRef.current?.actx === actx) soundActxRef.current = null
      }
      source.start(0)
    } catch {}
  }

  function moveWordToZone(tokenId: string) {
    if (phase !== "question") return
    const token = wordBank.find(w => w.id === tokenId)
    if (!token) return
    setWordBank(prev => prev.filter(w => w.id !== tokenId))
    setConstructionZone(prev => [...prev, token])
    setSoundError(null)
    speak(token.text)
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
    answerRef.current = constructionZone.map(w => w.text).join(" ").trim()
    const correct = expected ? given === expected : constructionZone.length > 0
    setIsCorrect(correct)
    setScore(correct ? 100 : 0)
    if (correct) {
      savePendingResult(true, 100, actAttempts + 1)
      setPhase("result")
      speak("¡Muy bien! Respuesta correcta.")
    } else {
      const newAttempts = actAttempts + 1
      setActAttempts(newAttempts)
      if (newAttempts >= 2) {
        savePendingResult(false, 0, newAttempts)
        setPhase("result")
        if (settings.voiceEnabled) speak("La respuesta correcta era: " + (soundPregunta?.respuesta_esperada ?? ""))
      } else {
        setSoundError("Esa no es la oración correcta. ¡Inténtalo de nuevo!")
        speak("Esa no es la oración correcta. Inténtalo de nuevo.")
      }
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
    answerRef.current = texto
    if (correcta) {
      setIsCorrect(true)
      setScore(100)
      setRetryBanner(null)
      const msg = MENSAJES_CORRECTO[Math.floor(Math.random() * MENSAJES_CORRECTO.length)]
      setResultMessage(msg)
      savePendingResult(true, 100, actAttempts + 1)
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
        savePendingResult(false, 0, newAttempts)
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
    answerRef.current = textAnswer.trim()
    const alternatives = (config?.respuesta_correcta ?? "").split("|").map(a => a.trim().toLowerCase()).filter(Boolean)
    const given = textAnswer.trim().toLowerCase()
    const correct = alternatives.length > 0
      ? alternatives.some(exp => given.includes(exp) || exp.includes(given))
      : true
    if (correct) {
      setIsCorrect(true)
      setScore(100)
      setRetryBanner(null)
      const msg = MENSAJES_CORRECTO[Math.floor(Math.random() * MENSAJES_CORRECTO.length)]
      setResultMessage(msg)
      savePendingResult(true, 100, actAttempts + 1)
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
        savePendingResult(false, 0, newAttempts)
        setPhase("result")
        if (settings.voiceEnabled && alternatives.length > 0) speak(`La respuesta correcta es: ${alternatives.join(" o ")}`)
      } else {
        const msg = RETRY_MESSAGES[Math.floor(Math.random() * RETRY_MESSAGES.length)]
        setRetryBanner(msg)
        if (settings.voiceEnabled) speak(msg)
      }
    }
  }

  async function handleFinish() {
    if (!previewMode) {
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
    }
    speak(`¡Actividad completada!`)
    onComplete()
  }

  function getCorrectAnswer(): string {
    const tipo = activity?.tipo
    if (tipo === "seleccion_guiada" || tipo === "identificacion") {
      return opciones.find((o) => o.correcta)?.texto ?? "—"
    }
    if (tipo === "respuesta_corta") {
      const alts = (config?.respuesta_correcta ?? "").split("|").filter(Boolean)
      return alts.length > 0 ? alts.join(" o ") : "—"
    }
    if (tipo === "completar_oracion" && fillPregunta) return fillPregunta.respuesta_esperada
    if (tipo === "reconocimiento_sonidos" && soundPregunta) return soundPregunta.respuesta_esperada
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
    if (previewMode) {
      onComplete()
      return
    }
    const tiempoSeg = Math.round((Date.now() - activityStartRef.current) / 1000)
    const { data: { session } } = await supabase.auth.getSession()
    const attemptRes = await fetch("/api/attempts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        activityId:      activity.id_actividad,
        puntaje:         score,
        tiempoSegundos:  tiempoSeg,
        respuestaAlumno: answerRef.current || undefined,
        esCorrecta:      isCorrect,
        tipoActividad:   activity.tipo,
      }),
    })
    const attemptData = attemptRes.ok ? await attemptRes.json() : {}

    const result: ActivityResult = {
      id:        activity.id_actividad,
      correct:   isCorrect,
      attempts:  currentAttemptsRef.current,
      intentoId: attemptData.id_intento ?? undefined,
      ...(activity.tipo === "sopa_letras" && { puntaje: score }),
    }
    const newResults = [...activityResults, result]
    setActivityResults(newResults)

    const nextIndex = lessonActIndex + 1
    if (nextIndex >= lessonActivities.length) {
      await handleLessonComplete(newResults)
    } else {
      saveLessonProgress(nextIndex, newResults)
      setLessonActIndex(nextIndex)
      loadActivityData(lessonActivities[nextIndex])
    }
  }

  async function handleLessonComplete(results: ActivityResult[]) {
    if (previewMode) {
      onComplete()
      return
    }
    clearLessonProgress()
    setIsCompletingLesson(true)
    setPhase("loading")
    const totalSecs = Math.round((Date.now() - lessonStartRef.current) / 1000)
    setLessonElapsedSecs(totalSecs)
    const stars = await completarLeccion(user!.id, lessonId!, results, totalSecs, new Date(lessonStartRef.current).toISOString())
    setEarnedStars(stars)
    setIsCompletingLesson(false)
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
      setFadeActive(true)
      setTimeout(() => {
        saveLessonProgress(nextIndex, newResults)
        setLessonActIndex(nextIndex)
        loadActivityData(lessonActivities[nextIndex])
        setTimeout(() => setFadeActive(false), 50)
      }, 180)
    }
  }

  function handleBackPress() {
    if (isLessonMode && (activityResults.length > 0 || phase === "result")) {
      setShowBackConfirm(true)
    } else {
      onBack()
    }
  }

  async function handleRetryLesson() {
    clearLessonProgress()

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
      <>
        <VoiceActivity
          activityId={activity.id_actividad}
          onBack={handleBackPress}
          onComplete={(result) =>
            handleAdvanceLesson({ id: activity.id_actividad, correct: result?.correct ?? true, attempts: result?.attempts ?? 1, intentoId: result?.intentoId })
          }
          lessonIndex={lessonActIndex}
          lessonTotal={lessonActivities.length}
        />
        {showBackConfirm && (
          <BackConfirmModal
            isPlayingModal={isPlayingModal}
            onSpeak={handleModalSpeak}
            onContinue={() => setShowBackConfirm(false)}
            onExit={() => { _stopModalAudio(); clearLessonProgress(); onBack() }}
          />
        )}
      </>
    )
  }

  // Vista previa docente, actividad oral individual → mostrar VoiceActivity sin guardar intentos
  if (previewMode && !isLessonMode && activity?.tipo === "respuesta_oral" && phase === "question") {
    return (
      <VoiceActivity
        activityId={activity.id_actividad}
        onBack={onBack}
        onComplete={onComplete}
        previewMode
      />
    )
  }

  if (phase === "loading") {
    if (isCompletingLesson) {
      return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-4" aria-label="Calculando resultado">
          <div className="flex gap-3">
            {[0, 1, 2, 3, 4].map(i => (
              <Star
                key={i}
                className="w-12 h-12 text-amber-400 fill-amber-400"
                style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="text-base font-semibold text-muted-foreground">Calculando tus estrellas…</p>
        </main>
      )
    }

    return (
      <div className="min-h-screen bg-background">
        {/* Header skeleton */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md" aria-hidden="true">
          <div className="max-w-3xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="h-11 w-11 rounded-2xl bg-muted animate-pulse" />
              <div className="flex-1 text-center space-y-1.5">
                <div className="h-4 w-32 rounded-full bg-muted animate-pulse mx-auto" />
                <div className="h-3 w-20 rounded-full bg-muted/60 animate-pulse mx-auto" />
              </div>
              <div className="h-8 w-14 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="h-1.5 rounded-full bg-muted animate-pulse mt-2" />
          </div>
        </header>

        {/* Content skeleton */}
        <main className="max-w-3xl mx-auto px-4 py-6 space-y-4" aria-label="Cargando actividad" aria-busy="true">
          {/* Instruction card skeleton */}
          <div className="rounded-3xl border-2 border-border bg-card p-5 space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded-full bg-muted" />
                <div className="h-3 w-48 rounded-full bg-muted/60" />
              </div>
            </div>
          </div>

          {/* Main activity card skeleton */}
          <div className="rounded-3xl border-2 border-border bg-card p-6 space-y-4 animate-pulse">
            <div className="h-5 w-3/4 rounded-full bg-muted mx-auto" />
            <div className="h-4 w-1/2 rounded-full bg-muted/60 mx-auto" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 rounded-2xl bg-muted" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4" aria-label="Error al cargar actividad">
        <Card className="border-2 max-w-md w-full">
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-destructive font-semibold">{error}</p>
            <Button onClick={onBack}>Volver</Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ── Pantalla completa de lección completada ─────────────────
  if (phase === "lesson-done") {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8" aria-label="Lección completada">
        <div className={`w-full max-w-md space-y-4 transition-opacity duration-500 ${lessonDoneVisible ? "opacity-100" : "opacity-0"}`}>
          <section aria-live="polite" aria-label="Resultado de la lección" className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-card shadow-xl p-6 space-y-4">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-amber-300/20 blur-2xl" aria-hidden />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-orange-300/20 blur-xl" aria-hidden />

              <div className="relative text-center space-y-1">
                {lessonName && (
                  <p className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-widest mb-1">{lessonName}</p>
                )}
                <h2 className="text-2xl font-black text-amber-700 dark:text-amber-400">¡Lección completada!</h2>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80">Aquí están tus estrellas</p>
              </div>

              <div className="relative flex justify-center gap-3" role="img" aria-label={`${earnedStars % 1 === 0 ? earnedStars : earnedStars.toFixed(1)} de 5 estrellas`}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const fill = Math.min(1, Math.max(0, earnedStars - i))
                  const revealed = i < starsAnimated
                  const isPopping = i === starPopping
                  const scale = isPopping ? "scale-150 drop-shadow-lg" : "scale-100"
                  if (!revealed) {
                    return <Star key={i} className="w-12 h-12 text-muted-foreground/30 transition-all duration-300" aria-hidden="true" />
                  }
                  if (fill >= 1) {
                    return <Star key={i} className={`w-12 h-12 text-amber-400 fill-amber-400 transition-all duration-300 ${scale}`} aria-hidden="true" />
                  }
                  // Estrella parcial
                  return (
                    <div key={i} className={`relative w-12 h-12 transition-all duration-300 ${scale}`} aria-hidden="true">
                      <Star className="w-12 h-12 text-muted-foreground/30 absolute inset-0" />
                      <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                        <Star className="w-12 h-12 text-amber-400 fill-amber-400" />
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="relative text-center text-xl font-black text-amber-600 dark:text-amber-400">
                {earnedStars % 1 === 0 ? earnedStars : earnedStars.toFixed(1)} de 5 estrellas
              </p>
              {lessonElapsedSecs > 0 && (
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {lessonElapsedSecs < 60
                        ? `${lessonElapsedSecs} seg`
                        : `${Math.floor(lessonElapsedSecs / 60)}:${String(lessonElapsedSecs % 60).padStart(2, "0")} min`}
                    </span>
                  </div>
                </div>
              )}

              <p className="relative text-center text-base text-orange-700 dark:text-orange-400 font-semibold border-t border-amber-500/30 pt-4">
                {getStarMessage(Math.round(earnedStars))}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button size="lg" variant="outline" className="h-11 text-base border-2" onClick={handleRetryLesson}>
                <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                Repetir lección
              </Button>
              <Button size="lg" className="h-11 text-base" onClick={onComplete}>
                Continuar
                <ChevronRight className="w-5 h-5 ml-2" aria-hidden="true" />
              </Button>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleBackPress}
              className="h-11 w-11 p-0 rounded-2xl bg-card shadow-sm border-border hover:bg-muted active:bg-muted"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center px-4">
              <p className="font-extrabold text-[17px] tracking-tight text-foreground line-clamp-1">
                {activity?.titulo}
              </p>
              {isLessonMode && lessonActivities.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actividad {lessonActIndex + 1} de {lessonActivities.length}
                </p>
              )}
            </div>
            {!isLessonMode && (
              <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2 shadow-sm">
                <Star className="w-5 h-5 text-amber-500" aria-hidden="true" />
                <span className="text-base font-extrabold text-foreground tabular-nums">{score}</span>
              </div>
            )}
            {isLessonMode && lessonActivities.length > 0 && (
              <div className="text-right min-w-[72px]">
                <p className="text-xs text-muted-foreground">Progreso</p>
                <p className="font-extrabold text-foreground tabular-nums">
                  {Math.round(((lessonActIndex + (phase === "result" ? 1 : 0)) / lessonActivities.length) * 100)}%
                </p>
              </div>
            )}
          </div>
          <Progress
            value={isLessonMode && lessonActivities.length > 0
              ? Math.round(((lessonActIndex + (phase === "result" ? 1 : 0)) / lessonActivities.length) * 100)
              : phase === "done" ? 100 : phase === "result" ? 66 : 33}
            className="h-1.5 bg-muted mt-2 [&>div]:transition-all [&>div]:duration-500 [&>div]:ease-out"
          />
        </div>
      </header>

      <main className={`max-w-3xl mx-auto px-4 py-2 space-y-3 transition-opacity duration-150 ${fadeActive ? "opacity-0" : "opacity-100"}`}>

        {/* Instructions card */}
        <section aria-label="Instrucciones de la actividad">
          <Card className="border border-border/70 shadow-sm rounded-3xl">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl border border-border/70 bg-muted/40 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <div className="flex-1 flex items-start gap-4">
                  <div className="flex-1">
                    <SpeakableText as="h2" className="text-base font-extrabold tracking-tight text-foreground mb-0.5">
                      Instrucciones
                    </SpeakableText>
                    <p className="text-[15px] sm:text-base text-muted-foreground leading-relaxed">
                      <TextoConGlosario
                        texto={config?.instrucciones || "Lee y responde la siguiente pregunta."}
                        glosario={glosario}
                      />
                    </p>
                  </div>
                  {settings.voiceEnabled && (
                    <Button
                      variant="outline"
                      className="h-11 px-4 text-sm shrink-0 self-center rounded-2xl border-border bg-card shadow-sm hover:bg-muted active:bg-muted"
                      onClick={() => speak(config?.instrucciones || "Lee y responde la siguiente pregunta.")}
                      aria-label="Escuchar instrucciones"
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
            {/* Retry banner — shown after first wrong attempt */}
            {retryBanner && (
              <div className={`flex items-center gap-3 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 mb-4 shadow-sm transition-opacity duration-300 ${retryVisible ? "opacity-100" : "opacity-0"}`}>
                <div className="w-9 h-9 bg-amber-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                  <RotateCcw className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <p className="text-foreground font-semibold flex-1">{retryBanner}</p>
              </div>
            )}
            {/* Image — only for tipo identificacion */}
            {activity?.tipo === "identificacion" && activity.imagen_url && (
              <figure className="mb-4">
                <img
                  src={activity.imagen_url}
                  alt="Imagen de la actividad"
                  className="w-full max-h-72 object-contain rounded-2xl border-2 border-border bg-muted"
                />
                <figcaption className="sr-only">Imagen para identificar</figcaption>
              </figure>
            )}

            {/* Multiple choice / image / sound */}
            {hasOptions && (
              <fieldset className="border-0 p-0 m-0">
                <legend className="sr-only">Opciones de respuesta</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {opciones.map((op, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(op.texto, op.correcta)}
                      onMouseEnter={() => {
                        if ((settings.tooltipMode === "voice" || settings.tooltipMode === "both") && settings.voiceEnabled) {
                          speak(`Opción: ${op.texto}`)
                        }
                      }}
                      onKeyDown={(e) => {
                        const total = opciones.length
                        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                          e.preventDefault()
                          const next = (i + 1) % total
                          ;(e.currentTarget.parentElement?.children[next] as HTMLElement)?.focus()
                        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                          e.preventDefault()
                          const prev = (i - 1 + total) % total
                          ;(e.currentTarget.parentElement?.children[prev] as HTMLElement)?.focus()
                        }
                      }}
                      className="group relative rounded-3xl border border-border/70 bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring p-6"
                      aria-label={`Opción ${i + 1}: ${op.texto}`}
                    >
                      <span className="absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-primary/25 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-border bg-muted text-foreground text-sm font-black shadow-sm">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="font-extrabold tracking-tight text-foreground leading-snug text-[17px] sm:text-lg">
                          {op.texto}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Short answer */}
            {isShortAnswer && (
              <Card className="border border-border/70 shadow-sm rounded-3xl">
                <CardContent className="px-6 pt-5 pb-5 space-y-4">
                  <label className="text-lg font-bold text-foreground" htmlFor="short-answer">
                    Escribe tu respuesta:
                  </label>
                  <Input
                    id="short-answer"
                    value={textAnswer}
                    onChange={e => setTextAnswer(e.target.value)}
                    placeholder="Tu respuesta…"
                    className="h-16 text-3xl rounded-2xl border-border/70 bg-background shadow-sm focus-visible:ring-2 focus-visible:ring-ring px-5"
                    onKeyDown={e => e.key === "Enter" && handleSubmitText()}
                    autoFocus
                  />
                  <Button
                    size="lg"
                    className="w-full h-12 text-base rounded-2xl font-bold"
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
                <div className="flex items-end justify-center gap-5">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => playSoundSentence(1)}
                      disabled={!soundPregunta}
                      className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                      aria-label="Reproducir oración a velocidad normal"
                    >
                      <Volume2 className="w-7 h-7" aria-hidden="true" />
                    </button>
                    <span className="text-sm font-semibold text-foreground">Escuchar</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => playSoundSentence(0.6)}
                      disabled={!soundPregunta}
                      className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                      aria-label="Reproducir oración despacio"
                    >
                      <Turtle className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <span className="text-xs font-semibold text-muted-foreground">Despacio</span>
                  </div>
                </div>

                <LayoutGroup id="word-tokens">
                  <Card className="border-2">
                    <CardContent className="px-3 py-2 space-y-2">

                      {/* Oración */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tu oración</p>
                        <div
                          className="h-12 flex flex-wrap gap-2 items-center px-2 py-1 rounded-xl bg-primary/5 border border-primary/20 overflow-hidden"
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
                                transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
                                onClick={() => moveWordToBank(token.id)}
                                className="px-4 py-2 rounded-xl border-2 border-primary bg-card text-base font-semibold text-foreground hover:bg-destructive/10 hover:border-destructive"
                                aria-label={`Quitar "${token.text}" de la oración`}
                              >
                                {token.text}
                              </motion.button>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Error */}
                      {soundError && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40">
                          <RotateCcw className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
                          <p className="text-foreground font-medium flex-1 text-sm">{soundError}</p>
                          <Button variant="outline" size="sm" onClick={handleRetrySound} className="gap-2 shrink-0" aria-label="Reintentar">
                            <RotateCcw className="w-4 h-4" aria-hidden="true" />
                            Reintentar
                          </Button>
                        </div>
                      )}

                      {/* Banco de palabras */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Palabras disponibles</p>
                        <div className="flex flex-wrap gap-2" aria-label="Banco de palabras">
                          {wordBank.map((token) => (
                            <motion.button
                              key={token.id}
                              layoutId={token.id}
                              layout
                              transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
                              onClick={() => moveWordToZone(token.id)}
                              className="px-5 py-2.5 rounded-xl border-2 border-border bg-muted text-base font-semibold text-foreground hover:border-primary hover:bg-primary/10"
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
                      </div>

                    </CardContent>
                  </Card>
                </LayoutGroup>

                {/* Check button */}
                <Button
                  size="lg"
                  className="w-full h-11 text-base"
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
              <div className="space-y-3">
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

                  {/* Target sentence + word bank — una sola card */}
                  {fillPregunta && (() => {
                    const parts = fillPregunta.enunciado.split("___")
                    const before = parts[0] ?? ""
                    const after = parts.slice(1).join("___")
                    return (
                      <Card className="border-2 shadow-lg rounded-3xl">
                        <CardContent className="p-4 space-y-4">

                          {/* Oración */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Completa la oración</p>
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
                              {fillSelected ? (
                                <motion.button
                                  layoutId={fillSelected.id}
                                  layout
                                  transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
                                  onClick={handleFillReturn}
                                  onMouseEnter={() => settings.voiceEnabled && speakWord(fillSelected.text)}
                                  className="h-9 px-4 inline-flex items-center rounded-xl border-2 border-primary bg-primary/10 text-primary font-bold hover:bg-destructive/10 hover:border-destructive"
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
                          </div>

                          {/* Error */}
                          {fillError && (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40">
                              <RotateCcw className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
                              <p className="text-foreground font-medium flex-1 text-sm">{fillError}</p>
                              <Button variant="outline" size="sm" onClick={handleRetryFill} className="gap-2 shrink-0">
                                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                                Reintentar
                              </Button>
                            </div>
                          )}

                          {/* Divisor */}
                          <div className="border-t border-border/50" />

                          {/* Palabras */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Palabras disponibles</p>
                            <div className="flex flex-wrap gap-3 justify-center" aria-label="Opciones de palabras">
                              {fillBankOriginalRef.current.map((token) => {
                                const isSelected = fillSelected?.id === token.id
                                const inBank = fillBank.some(t => t.id === token.id)
                                if (isSelected) {
                                  return (
                                    <div
                                      key={token.id}
                                      className="h-11 px-5 rounded-2xl border-2 border-dashed border-border/50 bg-muted/30 flex items-center"
                                      aria-hidden="true"
                                    >
                                      <span className="text-base font-bold invisible">{token.text}</span>
                                    </div>
                                  )
                                }
                                if (!inBank) return null
                                return (
                                  <motion.button
                                    key={token.id}
                                    layoutId={token.id}
                                    layout
                                    transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
                                    onClick={() => handleFillSelect(token)}
                                    onMouseEnter={() => settings.voiceEnabled && speakWord(token.text)}
                                    className="h-11 px-5 rounded-2xl border-2 border-border bg-card text-base font-bold text-foreground hover:border-primary hover:bg-primary/10 shadow-sm"
                                    aria-label={`Seleccionar "${token.text}"`}
                                  >
                                    {token.text}
                                  </motion.button>
                                )
                              })}
                              {fillBank.length === 0 && !fillSelected && (
                                <p className="text-muted-foreground text-sm italic">Todas las palabras están usadas.</p>
                              )}
                            </div>
                          </div>

                        </CardContent>
                      </Card>
                    )
                  })()}
                </LayoutGroup>

                {/* Check button */}
                <Button
                  size="lg"
                  className="w-full h-11 text-base"
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
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 items-start">
                    {/* Left column — draggable image cards */}
                    <div className="space-y-2">
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
                                className="w-full h-36 object-contain bg-card"
                                draggable={false}
                              />
                            ) : (
                              <div className="w-full h-36 bg-muted flex items-center justify-center">
                                <p className="text-muted-foreground text-xs">Sin imagen</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Right column — numbered drop zones */}
                    <div className="space-y-2">
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
                                  ? "border-amber-500 bg-amber-500/5"
                                  : zoneItem
                                    ? "border-primary/60 bg-card shadow-md"
                                    : isOver
                                      ? "border-primary border-solid bg-primary/10 scale-[1.02]"
                                      : "border-dashed border-border bg-muted/40"
                              }`}
                            style={{ minHeight: "9rem" }}
                            aria-label={`Zona ${idx + 1}${zoneItem ? `: ${zoneItem.enunciado}` : " vacía"}`}
                          >
                            {/* Zone number badge */}
                            <div className={`absolute top-2 left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center font-black text-base shadow ${slotOk === true ? "bg-green-500 text-white"
                                : slotOk === false ? "bg-amber-500 text-white"
                                  : "bg-primary text-primary-foreground"
                              }`}>
                              {idx + 1}
                            </div>

                            {/* Result icon */}
                            {slotOk !== null && (
                              <div className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center shadow ${slotOk ? "bg-green-500" : "bg-amber-500"}`}>
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
                                    className="w-full h-36 object-contain bg-card group-hover:opacity-80 transition-opacity"
                                    draggable={false}
                                  />
                                ) : (
                                  <div className="w-full h-36 bg-muted flex items-center justify-center">
                                    <p className="text-muted-foreground text-xs">Sin imagen</p>
                                  </div>
                                )}
                              </button>
                            ) : (
                              /* Empty zone */
                              <div className="h-36 flex items-center justify-center">
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
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/40">
                      <RotateCcw className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />
                      <p className="text-foreground font-medium flex-1">
                        Algunas imágenes no están en el orden correcto. ¡Inténtalo de nuevo!
                      </p>
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full h-11 text-base"
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
              <div className="space-y-3">
                {/* Instruction text — above the grid */}
                <p className="text-center text-xs text-muted-foreground">
                  Toca la primera y última letra de cada palabra
                </p>

                {/* Grid — full width */}
                <Card className={`border-2 transition-all ${wsWrongFlash ? "border-destructive" : "border-border"}`}>
                    <CardContent className="p-2 flex justify-center overflow-x-auto">
                      <div
                        className="inline-grid gap-1"
                        style={{ gridTemplateColumns: `repeat(${wsGrid[0]?.length ?? 12}, minmax(0, 1fr))` }}
                        aria-label="Cuadrícula de sopa de letras"
                      >
                        {wsGrid.map((rowArr, r) =>
                          rowArr.map((letter, c) => {
                            const key = `${r}-${c}`
                            const isFound = wsFoundCells.has(key)
                            const wordKey = wsCellWord.get(key)
                            const colorIdx = wordKey !== undefined ? wsWordColors.get(wordKey) : undefined
                            const color = colorIdx !== undefined ? WS_COLORS[colorIdx] : null
                            const isAnimating = wsAnimatingCells.has(key)
                            const isStart = wsStart?.row === r && wsStart?.col === c
                            return (
                              <button
                                key={key}
                                onClick={() => handleWsCellClick(r, c)}
                                className={`w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm font-bold rounded flex items-center justify-center transition-all select-none ${isFound && color
                                    ? `${color.bg} text-white${isAnimating ? " scale-125 shadow-md" : ""}`
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

                {/* Word list — horizontal, centered below the grid */}
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  <p className="w-full text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {wsFoundWords.size}/{wsPalabras.length} palabras encontradas
                  </p>
                  {wsPalabras.map(word => {
                    const colorIdx = wsWordColors.get(word)
                    const color = colorIdx !== undefined ? WS_COLORS[colorIdx] : null
                    return (
                      <span
                        key={word}
                        className={`px-2 py-1 rounded-lg border-2 font-bold text-sm text-center transition-all ${
                          color
                            ? `${color.light} ${color.border} ${color.text} line-through`
                            : "bg-muted border-border text-foreground"
                        }`}
                      >
                        {word}
                      </span>
                    )
                  })}
                </div>
                {/* Give up button */}
                {wsFoundWords.size < wsPalabras.length && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-9 border-2"
                    onClick={() => {
                      const wsCorrect = wsFoundWords.size >= Math.ceil(wsPalabras.length / 2)
                      const wsScore = Math.round((wsFoundWords.size / wsPalabras.length) * 100)
                      answerRef.current = [...wsFoundWords].join(", ")
                      setIsCorrect(wsCorrect)
                      setScore(wsScore)
                      savePendingResult(wsCorrect, wsScore, 1)
                      setPhase("result")
                      if (settings.voiceEnabled) speak(`Encontraste ${wsFoundWords.size} de ${wsPalabras.length} palabras. ¡Sigue practicando!`)
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
                          savePendingResult(true, 100, 1)
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
          <section
            aria-live="polite"
            aria-label="Resultado de tu respuesta"
            className={`transition-opacity duration-300 ${resultVisible ? "opacity-100" : "opacity-0"}`}
          >
            <Card className={`border-4 shadow-xl ${isCorrect ? "border-emerald-500 bg-emerald-500/10" : "border-amber-500 bg-amber-500/10"}`}>
              <CardContent className="p-8 text-center space-y-4">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${isCorrect ? "bg-green-500" : "bg-amber-500"}`}>
                  {isCorrect
                    ? <Check className="w-10 h-10 text-white" aria-hidden="true" />
                    : <X className="w-10 h-10 text-white" aria-hidden="true" />}
                </div>
                <SpeakableText as="h3" className={`text-3xl font-bold ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {isCorrect
                    ? (resultMessage || "¡Excelente!")
                    : activity?.tipo === "sopa_letras"
                      ? "¡Buen intento!"
                      : "¡Casi! Sigue practicando"}
                </SpeakableText>
                <SpeakableText as="p" className="text-lg text-muted-foreground">
                  {isCorrect
                    ? activity?.tipo === "sopa_letras"
                      ? wsFoundWords.size === wsPalabras.length
                        ? `¡Encontraste todas las ${wsPalabras.length} palabras!`
                        : `¡Encontraste ${wsFoundWords.size} de ${wsPalabras.length} palabras!`
                      : "¡Muy bien! Has respondido correctamente."
                    : activity?.tipo === "sopa_letras"
                      ? `¡Encontraste ${wsFoundWords.size} de ${wsPalabras.length} palabras!`
                      : activity?.tipo === "secuenciacion"
                        ? "Puedes ver el orden correcto arriba. ¡Sigue practicando!"
                        : ""}
                </SpeakableText>
                {!isCorrect && activity?.tipo !== "sopa_letras" && activity?.tipo !== "secuenciacion" && (
                  <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-4 text-left">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">Respuesta correcta:</p>
                    <p className="text-lg font-bold text-amber-900 dark:text-amber-300">{getCorrectAnswer()}</p>
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

      </main>

      {showBackConfirm && (
        <BackConfirmModal
          isPlayingModal={isPlayingModal}
          onSpeak={handleModalSpeak}
          onContinue={() => setShowBackConfirm(false)}
          onExit={() => { clearLessonProgress(); onBack() }}
        />
      )}
    </div>
  )
}
