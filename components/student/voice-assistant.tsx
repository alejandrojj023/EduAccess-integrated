"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { useAccessibility } from "@/lib/accessibility-context"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Course {
  id: string
  name: string
  progress: number
  currentLesson: string
  totalLessons: number
  completedLessons: number
}

interface Lesson {
  id_leccion: string
  titulo: string
  pct_completado: number
}

type MenuOption = 1 | 2 | 3 | 4 | 5 | 6
type HighlightOpt = 1 | 2 | 3 | 4 | 5 | 6 | null

interface VoiceAssistantProps {
  // Dashboard data
  firstName: string
  estrellasTotales: number
  nivelActual: number
  nivelNombre: string
  streakDays: number
  courses: Course[]
  invitacionesCount?: number
  leccionesCompletadas?: number
  promedio?: number
  intentos?: number
  progresoGeneral?: number
  onNavigate: (screen: string) => void
  onHighlight?: (opt: HighlightOpt) => void
  onHighlightCourse?: (idx: number | null) => void
  // Lessons data — if provided → lessons mode
  courseName?: string
  lessons?: Lesson[]
  onSelectLesson?: (id: string, name: string) => void
  onHighlightLesson?: (idx: number | null) => void
  onBack?: () => void
  // Subpage mode — calendar / progress / join-group
  subpageName?: "calendario" | "progreso" | "unirse"
  subpageMessage?: string   // custom narration (overrides hardcoded default)
}

type State = "idle" | "speaking" | "listening"

// ── Pure matchers ─────────────────────────────────────────────────────────────


function matchYesNo(t: string): boolean | null {
  const s = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  const esPositivo =
    /\b(si|claro|listo|dale|vamos|ok|okay|por\s*supuesto|bueno|perfecto|adelante|ya|sale|ándale|andale|andele|simón|simon|sep|sepe|sip|sipi|aja|ajam|ajá|correcto|correto|quiero|puedo|empezamos|empiezo|comenzamos|empieza)\b/.test(s)
  if (esPositivo) return true
  if (/\b(no|nop|negativo|cancela|nel|neta|nop|todavia|todavía|espera|ahorita)\b/.test(s)) return false
  return null
}

function matchRepeatOrReturn(t: string): "repeat" | "return" | null {
  const s = t.toLowerCase()
  if (/\b(repite?|repetir|de\s*nuevo|otra\s*vez|repete|repeti|repita|repito|repitir|otra|nuev[ao]mente)\b/.test(s)) return "repeat"
  if (/\b(regresar|regresa|regreza|gresar|gresa|volver|vuelve|panel|inicio|principal|no|volver|güelve)\b/.test(s)) return "return"
  return null
}

function matchMenuOption(t: string): MenuOption | null {
  const s = t.toLowerCase().trim()

  // Opción 1 — continuar / lección
  if (/\b(uno|un|unu|1|continuar|continar|continua|iniciar|empezar|lección|leccion|leción|lesión|leson|lecciones|leciones|lesiones)\b/.test(s) || /mi\s*lecci[oó]n?/.test(s) || /opci[oó]n\s*(1|uno)/.test(s)) return 1

  // Opción 2 — mis cursos
  if (/\b(dos|do|2|mis?\s*cursos?|mi?\s*curso|micurso|curzo|elegir)\b/.test(s) || /opci[oó]n\s*(2|dos)/.test(s)) return 2

  // Opción 3 — calendario
  if (/\b(tres|tress|tles|tre|3|calendario|carendario|calendaro|calendrio|calndario|aventuras?)\b/.test(s) || /mi\s*calendari[oa]?/.test(s) || /opci[oó]n\s*(3|tres)/.test(s)) return 3

  // Opción 4 — progreso
  if (/\b(cuatro|cuato|cuatlo|4|progreso|pogreso|progeso|estrellas?|estreya|reporte|repote)\b/.test(s) || /mi\s*progres[oa]?/.test(s) || /opci[oó]n\s*(4|cuatro)/.test(s)) return 4

  // Opción 5 — unirme a un curso
  if (/\b(cinco|sinco|cinc|singo|5|unirme|unime|unirse|unise|curso\s*nuevo|cursonuevo|código|codico)\b/.test(s) || /unirme\s*a\s*un\s*curso/.test(s) || /opci[oó]n\s*(5|cinco)/.test(s)) return 5

  // Opción 6 — repetir opciones
  if (/\b(seis|6|repetir|repite?|repita|otra\s*vez|de\s*nuevo|las\s*opciones|repite\s*las\s*opciones|repite\s*todo|no\s*entend[ií])\b/.test(s) || /opci[oó]n\s*(6|seis)/.test(s)) return 6

  return null
}

function normalizeWord(w: string): string {
  return w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

function matchByWordScore(transcript: string, names: string[]): number | null {
  const tWords = transcript.trim().split(/\s+/).filter(Boolean).map(normalizeWord)
  if (tWords.length === 0) return null

  const scores = names.map((name, i) => {
    const nWords = name.split(/\s+/).filter(Boolean).map(normalizeWord)
    let matches = 0
    for (const tw of tWords) if (nWords.includes(tw)) matches++
    return { i, score: matches / Math.max(tWords.length, nWords.length) }
  })
  scores.sort((a, b) => b.score - a.score)
  if (scores[0].score === 0) return null
  if (scores.length > 1 && scores[0].score === scores[1].score) return null
  return scores[0].i
}

function matchNumericIndex(t: string, total: number): number | null {
  const s = t.toLowerCase()
  const map: Record<string, number> = {
    "uno": 0, "1": 0, "primero": 0, "primera": 0, "unu": 0, "undo": 0, "un": 0,
    "dos": 1, "2": 1, "segundo": 1, "segunda": 1, "dose": 1, "do": 1, "doz": 1,
    "tres": 2, "3": 2, "tercero": 2, "tercera": 2, "tales": 2, "tles": 2, "trés": 2, "trehs": 2,
    "cuatro": 3, "4": 3, "cuarto": 3, "cuarta": 3, "cuato": 3, "cuatlo": 3, "cuatros": 3,
    "cinco": 4, "5": 4, "quinto": 4, "quinta": 4, "sinco": 4, "zinco": 4, "cinko": 4,
    "seis": 5, "6": 5, "sexto": 5, "sexta": 5, "seys": 5,
    "siete": 6, "7": 6, "siele": 6, "sieti": 6,
    "ocho": 7, "8": 7,
    "nueve": 8, "9": 8, "nuebe": 8, "nuevi": 8,
    "diez": 9, "10": 9, "dies": 9,
  }
  for (const [word, idx] of Object.entries(map)) {
    if (new RegExp(`\\b${word}\\b`).test(s) && idx < total) return idx
  }
  return null
}

function isLessonLocked(lessons: Lesson[], idx: number): boolean {
  if (idx === 0) return false
  return lessons[idx - 1].pct_completado < 100 && lessons[idx].pct_completado === 0
}

const OPTION_NAMES: Record<string, string> = {
  "1": "iniciar lección", "2": "mis cursos",
  "3": "ver calendario", "4": "ver progreso", "5": "unirte a un curso",
  "6": "repetir las opciones",
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VoiceAssistant({
  firstName, estrellasTotales, nivelActual, nivelNombre, streakDays,
  courses, invitacionesCount = 0,
  leccionesCompletadas, promedio, intentos, progresoGeneral,
  onNavigate, onHighlight, onHighlightCourse,
  courseName, lessons, onSelectLesson, onHighlightLesson, onBack,
  subpageName, subpageMessage,
}: VoiceAssistantProps) {
  const { speak } = useAccessibility()
  const [state, setState] = useState<State>("idle")
  const recognitionRef = useRef<any>(null)
  const abortRef       = useRef<{ aborted: boolean }>({ aborted: false })
  const autoRanRef     = useRef(false)

  // Ref so case-functions can always call the latest runMenu without circular deps
  const runMenuRef = useRef<() => Promise<void>>(async () => {})

  const isLessonsMode = !!(lessons && courseName && onSelectLesson)
  const isSubpageMode = !!subpageName && !isLessonsMode

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  useEffect(() => () => {
    abortRef.current.aborted = true
    try { recognitionRef.current?.abort() } catch {}
  }, [])

  // ── STT — Cloud Speech-to-Text ───────────────────────────────────────────────
  const listen = useCallback((timeoutMs = 12000): Promise<string | null> =>
    new Promise(async (resolve) => {
      setState("listening")

      let stream:    MediaStream   | null = null
      let audioCtx:  AudioContext  | null = null
      let silenceInterval: ReturnType<typeof setInterval> | null = null
      let hardTimeout:     ReturnType<typeof setTimeout>  | null = null
      let resolved = false

      const cleanup = () => {
        if (silenceInterval) { clearInterval(silenceInterval); silenceInterval = null }
        if (hardTimeout)     { clearTimeout(hardTimeout);      hardTimeout     = null }
        try { audioCtx?.close() } catch {}
        stream?.getTracks().forEach(t => t.stop())
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (abortRef.current.aborted) { stream.getTracks().forEach(t => t.stop()); resolve(null); return }

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus" : "audio/webm"

        const recorder = new MediaRecorder(stream, { mimeType })
        const chunks: Blob[] = []

        // Expose stop() as abort() so handleClick cancel sigue funcionando
        recognitionRef.current = { abort: () => { try { recorder.stop() } catch {} } }

        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

        recorder.onstop = async () => {
          cleanup()
          recognitionRef.current = null
          // Si ya fue resuelto (abort) o abortado, no procesar audio
          if (resolved || abortRef.current.aborted) return
          resolved = true

          if (chunks.length === 0) { resolve(null); return }

          // Sonido corto de confirmación — "te escuché"
          try {
            const beepCtx  = new AudioContext()
            const gain     = beepCtx.createGain()
            const osc      = beepCtx.createOscillator()
            osc.type       = "sine"
            osc.frequency.setValueAtTime(880, beepCtx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(660, beepCtx.currentTime + 0.12)
            gain.gain.setValueAtTime(0.25, beepCtx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, beepCtx.currentTime + 0.15)
            osc.connect(gain)
            gain.connect(beepCtx.destination)
            osc.start()
            osc.stop(beepCtx.currentTime + 0.15)
            osc.onended = () => beepCtx.close()
          } catch {}

          // Convertir a base64 en chunks para evitar stack overflow
          const blob   = new Blob(chunks, { type: mimeType })
          const buffer = await blob.arrayBuffer()
          const bytes  = new Uint8Array(buffer)
          let binary   = ""
          for (let i = 0; i < bytes.length; i += 8192) {
            binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
          }
          const base64 = btoa(binary)

          try {
            const res = await fetch("/api/stt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio: base64 }),
            })
            if (!res.ok) { resolve(null); return }
            const data = await res.json()
            resolve(data.transcript ?? null)
          } catch {
            resolve(null)
          }
        }

        // Detección de silencio: para después de 1.5 s sin voz post-habla
        audioCtx = new AudioContext()
        const source   = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        const freqData = new Uint8Array(analyser.frequencyBinCount)
        let speechDetected = false
        let silenceStart: number | null = null
        // Auto-activa detección de silencio tras 1.5s por si el umbral no se cruza
        const autoTrigger = setTimeout(() => { speechDetected = true }, 1500)

        silenceInterval = setInterval(() => {
          // Abort externo
          if (abortRef.current.aborted) {
            clearTimeout(autoTrigger)
            clearInterval(silenceInterval!); silenceInterval = null
            if (!resolved) { resolved = true; cleanup(); try { recorder.stop() } catch {}; resolve(null) }
            return
          }
          analyser.getByteTimeDomainData(freqData)
          let sum = 0
          for (const v of freqData) sum += (v - 128) ** 2
          const rms = Math.sqrt(sum / freqData.length)

          if (rms > 5) {
            speechDetected = true
            silenceStart   = null
          } else if (speechDetected) {
            if (!silenceStart) silenceStart = Date.now()
            else if (Date.now() - silenceStart > 600) {
              clearTimeout(autoTrigger)
              clearInterval(silenceInterval!); silenceInterval = null
              try { recorder.stop() } catch {}
            }
          }
        }, 50)

        // Timeout duro como seguridad
        hardTimeout = setTimeout(() => { try { recorder.stop() } catch {} }, timeoutMs)

        recorder.start(50)  // chunks cada 50 ms para mejor captura

      } catch {
        cleanup()
        resolve(null)
      }
    }), [])

  // ── TTS ──────────────────────────────────────────────────────────────────────
  const say = useCallback(async (text: string) => {
    if (abortRef.current.aborted || !text.trim()) return
    setState("speaking")
    await speak(text)
  }, [speak])

  // ── STT with 3-retry rule ─────────────────────────────────────────────────────
  const listenWithRetry = useCallback(async <T,>(
    timeoutMs: number,
    matcher: (t: string) => T | null,
    msgs: { noMatch: string; noHear: string; final: string },
    maxAttempts = 3,
  ): Promise<T | null> => {
    for (let i = 0; i < maxAttempts; i++) {
      if (abortRef.current.aborted) return null
      const t = await listen(timeoutMs)
      if (abortRef.current.aborted) return null
      if (t !== null) {
        const result = matcher(t)
        if (result !== null && result !== undefined) return result
        if (i < maxAttempts - 1) await say(msgs.noMatch)
        else { await say(msgs.final); return null }
      } else {
        if (i < maxAttempts - 1) await say(msgs.noHear)
        else { await say(msgs.final); return null }
      }
    }
    return null
  }, [listen, say])

  // ── Ask repeat-or-return then re-run menu ─────────────────────────────────────
  const askRepeatOrReturn = useCallback(async (
    repeatFn: () => Promise<void>,
  ) => {
    if (abortRef.current.aborted) return

    await say("¿Quieres que te lo repita o regresas a tu panel principal?")
    if (abortRef.current.aborted) return

    const ans = await listenWithRetry(
      10000,
      matchRepeatOrReturn,
      { noMatch: "¿Repetimos o regresamos?", noHear: "¿Repetimos o regresamos?", final: "" },
      2,
    )
    if (abortRef.current.aborted) return

    if (ans === "repeat") {
      await say("¡Genial! ¡Te lo repito.")
      if (abortRef.current.aborted) return
      await repeatFn()
      if (abortRef.current.aborted) return
    } else {
      await say("Muy bien, vamos de regreso a tu panel de alumno.")
      if (abortRef.current.aborted) return
    }

    // Always return to menu after
    await say("Muy bien, ¿qué quieres hacer ahora?")
    if (abortRef.current.aborted) return
    await runMenuRef.current()
  }, [say, listenWithRetry])

  // ── CASE 1 — Continuar ───────────────────────────────────────────────────────
  const runCase1 = useCallback(async () => {
    await say(`¡Perfecto, ${firstName}!`)
    if (abortRef.current.aborted) return
    await say("¡Es hora de tu aventura! ¿Listo para comenzar?")
    if (abortRef.current.aborted) return

    // 3 reintentos: "sí"→avanza, "no"→regresa, no reconocido→repregunta, 3ª vez→fin
    const ans = await listenWithRetry(
      8000,
      matchYesNo,
      {
        noMatch: "¡No te escuché! ¿Estás listo para continuar?",
        noHear:  "¡No te escuché! ¿Estás listo para continuar?",
        final:   "Inténtalo de nuevo presionando el botón.",
      },
    )
    if (abortRef.current.aborted) return
    if (ans === null) return  // agotó reintentos

    if (ans === false) {
      await say("¡Está bien! Volvamos al menú.")
      if (abortRef.current.aborted) return
      await say("Muy bien, ¿qué quieres hacer ahora?")
      await runMenuRef.current()
      return
    }

    await say("¡Súper! ¡Allá vamos!")
    if (abortRef.current.aborted) return
    if (courses.length > 0) {
      const enProgreso = courses.find(c => c.progress > 0 && c.progress < 100)
      const elegido = enProgreso ?? courses[0]
      sessionStorage.setItem("assistant-chained", "1")
      onNavigate(`course-${elegido.id}|${elegido.name}`)
    }
  }, [firstName, courses, say, listenWithRetry, onNavigate])

  // ── CASE B — Elegir curso ────────────────────────────────────────────────────
  const runCaseB = useCallback(async (): Promise<void> => {
    if (courses.length === 0) {
      await say("¡Aún no tienes cursos! Pídele a tu maestro un código para unirte a uno.")
      return
    }

    const intro = streakDays === 0
      ? `¡Genial! ¡Vamos a recuperar esa racha! Tienes ${courses.length} ${courses.length === 1 ? "curso disponible" : "cursos disponibles"}.`
      : `¡Qué emocionante! Tienes ${courses.length} ${courses.length === 1 ? "curso disponible" : "cursos disponibles"}.`
    await say(intro)
    if (abortRef.current.aborted) { onHighlightCourse?.(null); return }

    for (let i = 0; i < courses.length; i++) {
      onHighlightCourse?.(i)
      await say(`Curso ${i + 1}: ${courses[i].name}.`)
      if (abortRef.current.aborted) { onHighlightCourse?.(null); return }
    }
    onHighlightCourse?.(null)

    await say("¿Con cuál quieres empezar hoy?")
    if (abortRef.current.aborted) return

    const courseNames = courses.map(c => c.name)
    const idx = await listenWithRetry(
      12000,
      (t) => {
        const byNum = matchNumericIndex(t, courses.length)
        return byNum !== null ? byNum : matchByWordScore(t, courseNames)
      },
      {
        noMatch: "¡No reconocí ese curso! Intenta decir el número, por ejemplo: uno, dos o tres.",
        noHear:  "¡No te escuché! ¿Con cuál curso quieres empezar?",
        final:   "Inténtalo de nuevo presionando el botón.",
      },
    )
    if (idx === null || abortRef.current.aborted) return

    const elegido = courses[idx]
    await say(
      `¡Excelente elección! El curso ${elegido.name} tiene ${elegido.totalLessons} ${elegido.totalLessons === 1 ? "lección" : "lecciones"} en total, ` +
      `y ya has completado ${elegido.completedLessons}. ¡Eres genial! ¿Estás listo para continuar?`
    )
    if (abortRef.current.aborted) return

    const conf = await listenWithRetry(14000, matchYesNo, {
      noMatch: "¿Estás listo para continuar con ese curso?",
      noHear:  "¿Estás listo?",
      final:   "¡Súper! ¡Allá vamos!",
    }, 2)
    if (abortRef.current.aborted) return

    if (conf === false) {
      await say("¡Está bien! Elige otro.")
      return runCaseB()
    }
    await say("¡Súper! ¡Allá vamos!")
    if (abortRef.current.aborted) return
    sessionStorage.setItem("assistant-chained", "1")
    onNavigate(`course-${elegido.id}|${elegido.name}`)
  }, [courses, streakDays, say, listenWithRetry, onNavigate, onHighlightCourse])

  // ── CASE 2 — Calendario ──────────────────────────────────────────────────────
  // Navega primero; la página de calendario auto-activa su propio asistente con datos reales
  const runCase2 = useCallback(async () => {
    sessionStorage.setItem("assistant-subpage", "1")
    onNavigate("student-calendar")
  }, [onNavigate])

  // ── CASE 3 — Progreso ────────────────────────────────────────────────────────
  // Navega primero; la página de progreso auto-activa su propio asistente con datos reales
  const runCase3 = useCallback(async () => {
    sessionStorage.setItem("assistant-subpage", "1")
    onNavigate("student-progress")
  }, [onNavigate])

  // ── CASE 4 — Unirse ──────────────────────────────────────────────────────────
  // Navega primero; la página auto-activa su propio asistente con datos reales
  const runCase4 = useCallback(async () => {
    sessionStorage.setItem("assistant-subpage", "1")
    onNavigate("join-group")
  }, [onNavigate])

  // ── SUBPAGE mode — calendario / progreso / unirse ────────────────────────────
  const runSubpage = useCallback(async () => {
    const defaultMsgs: Record<string, string> = {
      "calendario": "¡Aquí está tu calendario de aventuras! Puedes ver todas las lecciones que has completado, día por día.",
      "progreso":   "¡Aquí puedes ver tu progreso! Revisa tus estrellas, lecciones completadas y tu avance general.",
      "unirse":     "¡Aquí puedes unirte a un curso nuevo! Ingresa el código que te dio tu docente para comenzar.",
    }
    const msg = subpageMessage ?? defaultMsgs[subpageName!] ?? "Estás en esta sección de EduAccess."

    let doRepeat = true
    while (doRepeat) {
      doRepeat = false
      await say(msg)
      if (abortRef.current.aborted) return
      await say("¿Quieres que te lo repita o volver a tu panel principal?")
      if (abortRef.current.aborted) return

      const ans = await listenWithRetry(
        10000,
        matchRepeatOrReturn,
        { noMatch: "¿Repetimos o volvemos al panel?", noHear: "¿Repetimos o volvemos al panel?", final: "" },
        2,
      )
      if (abortRef.current.aborted) return
      if (ans === "repeat") {
        await say("¡Claro! Te lo repito.")
        if (abortRef.current.aborted) return
        doRepeat = true
      } else if (ans === "return") {
        await say("Volvemos a tu panel principal.")
        if (abortRef.current.aborted) return
        sessionStorage.setItem("assistant-return-subpage", "1")
        onBack?.()
      }
    }
  }, [subpageName, subpageMessage, say, listenWithRetry, onBack])

  // ── MENU ─────────────────────────────────────────────────────────────────────
  const runMenu = useCallback(async () => {
    if (abortRef.current.aborted) return

    onHighlight?.(1)
    await say(streakDays === 0
      ? "Opción uno... ¡Oh, no! Tu racha se apagó... ¿Quieres hacer una lección hoy para recuperarla?"
      : "Opción uno... ¡Tu racha está increíble! ¿Quieres iniciar una lección nueva para mantenerla encendida?")
    if (abortRef.current.aborted) { onHighlight?.(null); return }

    onHighlight?.(2)
    await say("Opción dos... Mis cursos.")
    if (abortRef.current.aborted) { onHighlight?.(null); return }

    onHighlight?.(3)
    await say("Opción tres... Ver tu calendario de aventuras.")
    if (abortRef.current.aborted) { onHighlight?.(null); return }

    onHighlight?.(4)
    await say("Opción cuatro... Revisar tu progreso y tus estrellas.")
    if (abortRef.current.aborted) { onHighlight?.(null); return }

    onHighlight?.(5)
    await say("Opción cinco... ¡Unirte a un curso nuevo!")
    if (abortRef.current.aborted) { onHighlight?.(null); return }

    onHighlight?.(6)
    await say("Opción seis... Repetir las opciones.")
    onHighlight?.(null)
    if (abortRef.current.aborted) return

    const opt = await listenWithRetry(
      12000,
      matchMenuOption,
      {
        noMatch: "¡Mmm, no te escuché bien! ¿Puedes repetirlo?",
        noHear:  "¡Oye, sigo aquí! ¿Puedes repetirlo?",
        final:   "Inténtalo de nuevo presionando el botón.",
      },
    )
    if (!opt || abortRef.current.aborted) return

    await say(`¡Escuché ${OPTION_NAMES[String(opt)]}! ¡Vamos allá!`)
    if (abortRef.current.aborted) return

    if (opt === 1)      await runCase1()
    else if (opt === 2) await runCaseB()
    else if (opt === 3) await runCase2()
    else if (opt === 4) await runCase3()
    else if (opt === 5) await runCase4()
    else if (opt === 6) await runMenuRef.current()
  }, [streakDays, say, listenWithRetry, onHighlight, runCase1, runCaseB, runCase2, runCase3, runCase4])

  // Keep the ref in sync with latest runMenu
  useEffect(() => { runMenuRef.current = runMenu }, [runMenu])

  // ── LESSONS flow ─────────────────────────────────────────────────────────────
  const runLessons = useCallback(async () => {
    const ls = lessons ?? []
    if (ls.length === 0) {
      await say("Este curso aún no tiene lecciones disponibles.")
      return
    }

    const single = ls.length === 1
    await say(single
      ? `¡Esta es la lección del curso ${courseName}!`
      : `¡Estas son las lecciones del curso ${courseName}!`)
    if (abortRef.current.aborted) { onHighlightLesson?.(null); return }

    for (let i = 0; i < ls.length; i++) {
      onHighlightLesson?.(i)
      await say(`Lección ${i + 1}: ${ls[i].titulo}.`)
      if (abortRef.current.aborted) { onHighlightLesson?.(null); return }
    }
    onHighlightLesson?.(null)

    // Single completed lesson
    if (single && ls[0].pct_completado >= 100) {
      await say("¡Has completado la lección! Puedes repetirla para seguir repasando lo aprendido.")
      if (abortRef.current.aborted) return
      const ans = await listenWithRetry(14000, matchYesNo,
        { noMatch: "¿Quieres repetirla?", noHear: "¿Quieres repetirla?", final: "Inténtalo de nuevo presionando el botón." }, 3)
      if (abortRef.current.aborted) return
      if (ans === true) {
        await say("¡Muy bien, vamos!")
        onSelectLesson!(ls[0].id_leccion, ls[0].titulo)
        return
      }
      await say("Entendido.")
    }

    if (single) {
      // Offer repeat or return to dashboard
      await say("¿Quieres que te lo repita o regresas a tu panel de alumno?")
      const ans = await listenWithRetry(10000, matchRepeatOrReturn,
        { noMatch: "¿Repetimos o regresamos?", noHear: "¿Repetimos o regresamos?", final: "" }, 2)
      if (abortRef.current.aborted) return
      if (ans === "repeat") {
        await say("¡Genial! ¡Te lo repito.")
        await runLessons()
      } else {
        await say("Muy bien, vamos de regreso.")
        sessionStorage.setItem("assistant-return-menu", "1")
        onBack?.()
      }
      return
    }

    // Multi-lesson
    const siguienteIdx = ls.findIndex(l => l.pct_completado < 100)
    await say(siguienteIdx >= 0
      ? `Te sugiero la lección ${siguienteIdx + 1}: ${ls[siguienteIdx].titulo}. ¿Cuál quieres hacer?`
      : "¡Has completado todas! Puedes repetir cualquiera para no olvidar lo aprendido. ¿Cuál quieres hacer?")
    if (abortRef.current.aborted) return
    await say("También puedes decir 'repetir' para escucharlas de nuevo, o 'regresar' para volver a tu panel.")
    if (abortRef.current.aborted) return

    const lessonNames = ls.map(l => l.titulo)
    const idx = await listenWithRetry(
      12000,
      (t) => {
        const ror = matchRepeatOrReturn(t)
        if (ror === "return") return -1 as any
        if (ror === "repeat") return -2 as any
        const byNum = matchNumericIndex(t, ls.length)
        return byNum !== null ? byNum : matchByWordScore(t, lessonNames)
      },
      {
        noMatch: "¡No reconocí esa opción! Di el número de lección, 'repetir' para escucharlas, o 'regresar' para volver.",
        noHear:  "¡Mmm, no te escuché! Di el número de lección, 'repetir' o 'regresar'.",
        final:   "Inténtalo de nuevo presionando el botón.",
      },
    )
    if (abortRef.current.aborted) return

    if (idx === -2) {
      await say("¡Claro! Te las repito.")
      if (abortRef.current.aborted) return
      await runLessons()
      return
    }

    if (idx === -1) {
      await say("Muy bien, vamos de regreso a tu panel de alumno.")
      sessionStorage.setItem("assistant-return-subpage", "1")
      onBack?.()
      return
    }
    if (idx === null) return

    if (isLessonLocked(ls, idx)) {
      await say(`La lección ${idx + 1} está bloqueada. Primero termina la lección ${idx} para desbloquearla.`)
      return
    }
    await say(`¡Excelente! Vamos a la lección ${ls[idx].titulo}.`)
    if (abortRef.current.aborted) return
    onSelectLesson!(ls[idx].id_leccion, ls[idx].titulo)
  }, [lessons, courseName, say, listenWithRetry, onSelectLesson, onHighlightLesson, onBack])

  // ── Dashboard entry ───────────────────────────────────────────────────────────
  const runDashboard = useCallback(async (skipGreeting = false) => {
    if (!skipGreeting) {
      const estrellas = Math.round(estrellasTotales)
      const saludo =
        `¡Hola, ${firstName}! ¡Qué alegría verte por aquí! ` +
        `Te cuento cómo vas... ¡tienes ${estrellas} estrellas! ` +
        `¡Eres nivel ${nivelActual}, ${nivelNombre}! `
      const racha = streakDays === 0
        ? "¡Ups! Tu racha se apagó... ¡pero no te preocupes! ¡Hoy podemos encenderla de nuevo juntos! "
        : `¡Y tu racha actual es de ${streakDays} ${streakDays === 1 ? "día increíble" : "días increíbles"}! ¡Sigamos así! `
      await say(saludo + racha + "¡Aquí estoy para ayudarte! Dime qué quieres hacer hoy... o toca una de las opciones.")
      if (abortRef.current.aborted) return
    }
    await runMenu()
  }, [firstName, estrellasTotales, nivelActual, nivelNombre, streakDays, say, runMenu])

  // ── Main entry ────────────────────────────────────────────────────────────────
  const runAssistant = useCallback(async (skipGreeting = false) => {
    if (isSubpageMode)      await runSubpage()
    else if (isLessonsMode) await runLessons()
    else                    await runDashboard(skipGreeting)
  }, [isSubpageMode, isLessonsMode, runSubpage, runLessons, runDashboard])

  // ── Button click ──────────────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    if (state !== "idle") {
      abortRef.current.aborted = true
      try { recognitionRef.current?.abort() } catch {}
      onHighlight?.(null)
      onHighlightCourse?.(null)
      onHighlightLesson?.(null)
      setState("idle")
      return
    }
    abortRef.current = { aborted: false }
    runAssistant().finally(() => {
      onHighlight?.(null)
      onHighlightCourse?.(null)
      onHighlightLesson?.(null)
      setState("idle")
    })
  }, [state, runAssistant, onHighlight, onHighlightCourse, onHighlightLesson])

  // ── Auto-activation: chained from dashboard → lessons ─────────────────────────
  useEffect(() => {
    if (!isLessonsMode) return
    if (autoRanRef.current) return
    if ((lessons?.length ?? 0) === 0) return
    if (typeof window === "undefined") return
    if (!sessionStorage.getItem("assistant-chained")) return

    autoRanRef.current = true
    const timer = setTimeout(() => {
      sessionStorage.removeItem("assistant-chained")
      abortRef.current = { aborted: false }
      runAssistant().finally(() => {
        onHighlightLesson?.(null)
        setState("idle")
      })
    }, 0)
    return () => { clearTimeout(timer); autoRanRef.current = false }
  }, [isLessonsMode, lessons?.length, runAssistant, onHighlightLesson])

  // ── Auto-activation: return from lessons → dashboard menu ─────────────────────
  useEffect(() => {
    if (isLessonsMode) return
    if (autoRanRef.current) return
    if (typeof window === "undefined") return
    if (!sessionStorage.getItem("assistant-return-menu")) return

    autoRanRef.current = true
    const timer = setTimeout(() => {
      sessionStorage.removeItem("assistant-return-menu")
      abortRef.current = { aborted: false }
      // Skip greeting, go straight to menu
      runDashboard(true).finally(() => {
        onHighlight?.(null)
        onHighlightCourse?.(null)
        setState("idle")
      })
    }, 300) // small delay so dashboard finishes rendering
    return () => { clearTimeout(timer); autoRanRef.current = false }
  }, [isLessonsMode, runDashboard, onHighlight, onHighlightCourse])

  // ── Auto-activation: return from subpage → dashboard (dice "Muy bien" y abre menú) ──
  useEffect(() => {
    if (isLessonsMode || isSubpageMode) return
    if (autoRanRef.current) return
    if (typeof window === "undefined") return
    if (!sessionStorage.getItem("assistant-return-subpage")) return

    autoRanRef.current = true
    const timer = setTimeout(() => {
      sessionStorage.removeItem("assistant-return-subpage")
      abortRef.current = { aborted: false }
      ;(async () => {
        await say("Muy bien, ¿ahora qué quieres hacer?")
        if (abortRef.current.aborted) return
        await runMenu()
      })().finally(() => {
        onHighlight?.(null)
        onHighlightCourse?.(null)
        setState("idle")
      })
    }, 300)
    return () => { clearTimeout(timer); autoRanRef.current = false }
  }, [isLessonsMode, isSubpageMode, say, runMenu, onHighlight, onHighlightCourse])

  // ── Auto-activation: chained from dashboard → subpage (progreso / calendario) ──
  useEffect(() => {
    if (!isSubpageMode) return
    if (autoRanRef.current) return
    if (!subpageMessage) return  // espera a que carguen los datos reales
    if (typeof window === "undefined") return
    if (!sessionStorage.getItem("assistant-subpage")) return

    autoRanRef.current = true
    const timer = setTimeout(() => {
      sessionStorage.removeItem("assistant-subpage")
      abortRef.current = { aborted: false }
      runAssistant().finally(() => setState("idle"))
    }, 300)
    return () => { clearTimeout(timer); autoRanRef.current = false }
  }, [isSubpageMode, subpageMessage, runAssistant])

  // ── Render ────────────────────────────────────────────────────────────────────
  const Icon  = state === "listening" ? Mic : state === "speaking" ? Loader2 : MicOff
  const color = state === "listening"
    ? "from-rose-400 to-red-600 animate-pulse"
    : state === "speaking"
      ? "from-blue-400 to-indigo-600"
      : "from-emerald-400 to-teal-600"
  const label = state === "listening" ? "Escuchando... toca para cancelar"
    : state === "speaking" ? "Hablando... toca para cancelar"
    : isSubpageMode ? "Activar asistente: ayuda en esta sección"
    : isLessonsMode ? "Activar asistente: elegir lección por voz"
    : "Activar asistente de voz"

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
