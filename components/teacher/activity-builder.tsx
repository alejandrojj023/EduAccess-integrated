"use client"

import { useState, useEffect, useRef } from "react"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft,
  Save,
  Volume2,
  Pause,
  Play,
  RotateCcw,
  Image,
  Music,
  ListOrdered,
  CheckSquare,
  PenLine,
  Mic,
  ChevronRight,
  Edit,
  BookOpen,
  FileText,
  List,
  AlignLeft,
  Search,
  Lock,
} from "lucide-react"
import { parseActivityConfig, serializeActivityConfig } from "@/lib/activity-config"
import { StudentActivity } from "@/components/student/student-activity"
import { ActivityConfigForm, getActivitySpeakText } from "@/components/teacher/activity-config-form"

interface ActivityBuilderProps {
  onBack: () => void
  onSave: () => void
}

type ActivityType = "image" | "sound" | "sequence" | "multiple" | "short" | "voice" | "fill" | "wordsearch" | null
type BuilderView = "grid" | "existing" | "config" | "preview"

interface Option {
  id: string
  text: string
  isCorrect: boolean
}

interface ExistingActivity {
  id: string
  type: ActivityType
  typeLabel: string
  instrucciones: string | null
  nivel_dificultad: number | null
  imagen_url: string | null
  audio_url: string | null
  lessonId: string
  lessonTitle: string
  courseTitle: string
}

interface LessonOption {
  id: string
  title: string
  courseTitle: string
}

interface SequenceStep {
  file: File | null
  previewUrl: string
  existingUrl: string
  description: string
  preguntaId?: string
}

const activityTypes = [
  { id: "image" as const, label: "Identificacion de imagenes", icon: Image, color: "bg-chart-1" },
  { id: "sound" as const, label: "Reconocimiento de sonidos", icon: Music, color: "bg-chart-2" },
  { id: "sequence" as const, label: "Ordenar secuencias", icon: ListOrdered, color: "bg-chart-3" },
  { id: "multiple" as const, label: "Opcion multiple", icon: CheckSquare, color: "bg-chart-4" },
  { id: "short" as const, label: "Respuesta corta escrita", icon: PenLine, color: "bg-chart-5" },
  { id: "voice" as const, label: "Respuesta por voz", icon: Mic, color: "bg-primary" },
  { id: "fill" as const, label: "Completar oracion", icon: AlignLeft, color: "bg-teal-500" },
  { id: "wordsearch" as const, label: "Sopa de letras", icon: Search, color: "bg-pink-500" },
]

const dbToFormType: Record<string, ActivityType> = {
  identificacion: "image",
  reconocimiento_sonidos: "sound",
  secuenciacion: "sequence",
  seleccion_guiada: "multiple",
  respuesta_corta: "short",
  respuesta_oral: "voice",
  completar_oracion: "fill",
  sopa_letras: "wordsearch",
}

const dbToTypeLabel: Record<string, string> = {
  identificacion: "Identificacion de imagenes",
  reconocimiento_sonidos: "Reconocimiento de sonidos",
  secuenciacion: "Ordenar secuencias",
  seleccion_guiada: "Opcion multiple",
  respuesta_corta: "Respuesta corta escrita",
  respuesta_oral: "Respuesta por voz",
  completar_oracion: "Completar oracion",
  sopa_letras: "Sopa de letras",
}

const difficultyFromInt = (n: number | null): string => {
  if (n === 1) return "facil"
  if (n === 2) return "medio"
  if (n === 3) return "dificil"
  return "facil"
}

export function ActivityBuilder({ onBack, onSave }: ActivityBuilderProps) {
  const { user } = useAuth()
  const { speak, stopSpeak, settings } = useAccessibility()

  const [view, setView] = useState<BuilderView>("grid")
  const [builderAudioState, setBuilderAudioState] = useState<"idle" | "playing" | "paused" | "ended">("idle")
  const [actTypeAudioState, setActTypeAudioState] = useState<"idle" | "playing" | "paused" | "ended">("idle")
  const [selectedType, setSelectedType] = useState<ActivityType>(null)
  const [editingActivity, setEditingActivity] = useState<ExistingActivity | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState("")
  const [previewActivityId, setPreviewActivityId] = useState<string | null>(null)

  // Config form state
  const [instrucciones, setInstrucciones] = useState("")
  const [dificultad, setDificultad] = useState("facil")
  const [options, setOptions] = useState<Option[]>([
    { id: "1", text: "", isCorrect: false },
    { id: "2", text: "", isCorrect: false },
  ])
  const [correctAnswer, setCorrectAnswer] = useState("")

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("")
  const [existingImageUrl, setExistingImageUrl] = useState<string>("")
  const [imageDeleted, setImageDeleted] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Sound-specific config state
  const [palabrasDistractoras, setPalabrasDistractoras] = useState("")
  const [soundPreguntaId, setSoundPreguntaId] = useState("")
  // Voice-specific config state
  const [voiceEnunciado, setVoiceEnunciado] = useState("")

  // Fill-specific config state
  const [fillContextSentences, setFillContextSentences] = useState<string[]>([""])
  const [fillEnunciado, setFillEnunciado] = useState("")

  // Wordsearch-specific config state
  const [wsBuilderWords, setWsBuilderWords] = useState<string[]>([])
  const [wsBuilderInput, setWsBuilderInput] = useState("")

  // Sequence-specific config state
  const [sequenceCount, setSequenceCount] = useState<3 | 4 | 5>(3)
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([])
  const seqInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Remote data
  const [existingActivities, setExistingActivities] = useState<ExistingActivity[]>([])
  const [activitiesWithAttempts, setActivitiesWithAttempts] = useState<Map<string, number>>(new Map())
  const [lessons, setLessons] = useState<LessonOption[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [attemptedSave, setAttemptedSave] = useState(false)
  const [activityDirty, setActivityDirty] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) return
    setLoadingData(true)

    const { data: grupos } = await supabase
      .from("grupo")
      .select("id_grupo")
      .eq("id_docente", user.id)

    const grupoIds = grupos?.map((g) => g.id_grupo) ?? []
    if (grupoIds.length === 0) { setLoadingData(false); return }

    const { data: cursos } = await supabase
      .from("curso")
      .select("id_curso, titulo")
      .in("id_grupo", grupoIds)

    if (!cursos?.length) { setLoadingData(false); return }

    const cursoIds = cursos.map((c) => c.id_curso)
    const cursoMap: Record<string, string> = {}
    cursos.forEach((c) => { cursoMap[c.id_curso] = c.titulo })

    const { data: lecciones } = await supabase
      .from("leccion")
      .select("id_leccion, titulo, id_curso")
      .in("id_curso", cursoIds)

    if (!lecciones) { setLoadingData(false); return }

    const leccionIds = lecciones.map((l) => l.id_leccion)
    const leccionTitleMap: Record<string, string> = {}
    const leccionCursoMap: Record<string, string> = {}
    lecciones.forEach((l) => {
      leccionTitleMap[l.id_leccion] = l.titulo
      leccionCursoMap[l.id_leccion] = l.id_curso
    })

    const lessonsData: LessonOption[] = lecciones.map((l) => ({
      id: l.id_leccion,
      title: l.titulo,
      courseTitle: cursoMap[l.id_curso] ?? "",
    }))
    setLessons(lessonsData)

    if (leccionIds.length === 0) { setLoadingData(false); return }

    const { data: actividadesRaw } = await supabase
      .from("actividad")
      .select("id_actividad, tipo, instrucciones, nivel_dificultad, id_leccion, orden, imagen_url, audio_url")
      .in("id_leccion", leccionIds)
      .order("orden", { ascending: true })

    const mapped: ExistingActivity[] = (actividadesRaw ?? []).map((a: any) => ({
      id: a.id_actividad,
      type: dbToFormType[a.tipo] ?? null,
      typeLabel: dbToTypeLabel[a.tipo] ?? a.tipo,
      instrucciones: a.instrucciones,
      nivel_dificultad: a.nivel_dificultad,
      imagen_url: a.imagen_url ?? null,
      audio_url: a.audio_url ?? null,
      lessonId: a.id_leccion,
      lessonTitle: leccionTitleMap[a.id_leccion] ?? "",
      courseTitle: cursoMap[leccionCursoMap[a.id_leccion]] ?? "",
    }))

    setExistingActivities(mapped)

    if (mapped.length > 0) {
      const actIds = mapped.map((a) => a.id)
      const { data: intentos } = await supabase
        .from("intento_actividad")
        .select("id_actividad")
        .in("id_actividad", actIds)
      const attemptsMap = new Map<string, number>()
      for (const intento of intentos ?? []) {
        attemptsMap.set(intento.id_actividad, (attemptsMap.get(intento.id_actividad) ?? 0) + 1)
      }
      setActivitiesWithAttempts(attemptsMap)
    }

    setLoadingData(false)
  }

  // ── Image handlers ───────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setImageDeleted(false)
    setActivityDirty(true)
    e.target.value = ""
  }

  const handleImageDelete = () => {
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(null)
    setImagePreviewUrl("")
    setExistingImageUrl("")
    setImageDeleted(true)
    setActivityDirty(true)
  }

  // ── Option handlers ──────────────────────────────────────────
  const handleAddOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: "", isCorrect: false }])
  }
  const handleRemoveOption = (id: string) => {
    if (options.length > 2) setOptions(options.filter((o) => o.id !== id))
  }
  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, text } : o)))
  }
  const handleSetCorrect = (id: string) => {
    setOptions(options.map((o) => ({ ...o, isCorrect: o.id === id })))
  }

  // ── Open config ──────────────────────────────────────────────
  const openConfigForNew = (type: ActivityType) => {
    setSelectedType(type)
    setEditingActivity(null)
    setInstrucciones("")
    setDificultad("facil")
    setOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
    setCorrectAnswer("")
    setSelectedLessonId(lessons[0]?.id ?? "")
    setSaveError("")
    setAttemptedSave(false)
    setActivityDirty(false)
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(null)
    setImagePreviewUrl("")
    setExistingImageUrl("")
    setImageDeleted(false)
    setPalabrasDistractoras("")
    setSoundPreguntaId("")
    setVoiceEnunciado("")
    setFillContextSentences([""])
    setFillEnunciado("")
    setWsBuilderWords([])
    setWsBuilderInput("")
    if (type === "sequence") {
      const empty = (): SequenceStep => ({ file: null, previewUrl: "", existingUrl: "", description: "", preguntaId: "" })
      setSequenceCount(3)
      setSequenceSteps([empty(), empty(), empty()])
    } else {
      setSequenceCount(3)
      setSequenceSteps([])
    }
    setView("config")
  }

  const openConfigForEdit = async (activity: ExistingActivity) => {
    setEditingActivity(activity)
    setSelectedType(activity.type)
    setDificultad(difficultyFromInt(activity.nivel_dificultad))
    setSaveError("")
    setAttemptedSave(false)
    setActivityDirty(false)
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(null)
    setImagePreviewUrl("")
    setExistingImageUrl(activity.imagen_url ?? "")
    setImageDeleted(false)

    if (activity.type === "sound" || activity.type === "voice" || activity.type === "fill") {
      setInstrucciones(activity.instrucciones ?? "")
      setOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
      const { data: pq } = await supabase
        .from("pregunta")
        .select("id_pregunta, enunciado, respuesta_esperada, palabras_distractoras, oraciones_contexto")
        .eq("id_actividad", activity.id)
        .order("orden", { ascending: true })
        .limit(1)
        .maybeSingle()
      if (activity.type === "fill") {
        setFillEnunciado(pq?.enunciado ?? "")
        setCorrectAnswer(pq?.respuesta_esperada ?? "")
        setPalabrasDistractoras(
          pq?.palabras_distractoras?.split("|").filter(Boolean).join(", ") ?? ""
        )
        const ctxArr = pq?.oraciones_contexto?.split("|").filter(Boolean) ?? []
        setFillContextSentences(ctxArr.length > 0 ? ctxArr : [""])
        setVoiceEnunciado("")
      } else if (activity.type === "voice") {
        setVoiceEnunciado(pq?.enunciado ?? "")
        setCorrectAnswer(
          pq?.respuesta_esperada?.split("|").map((s: string) => s.trim()).filter(Boolean).join(", ") ?? ""
        )
        setPalabrasDistractoras("")
        setFillEnunciado("")
        setFillContextSentences([""])
      } else {
        setVoiceEnunciado("")
        setFillEnunciado("")
        setFillContextSentences([""])
        setCorrectAnswer(pq?.respuesta_esperada ?? "")
        setPalabrasDistractoras(
          pq?.palabras_distractoras?.split("|").filter(Boolean).join(", ") ?? ""
        )
      }
      setSoundPreguntaId(pq?.id_pregunta ?? "")
    } else if (activity.type === "sequence") {
      setInstrucciones(activity.instrucciones ?? "")
      setOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
      setCorrectAnswer("")
      setPalabrasDistractoras("")
      setSoundPreguntaId("")
      setVoiceEnunciado("")
      setFillEnunciado("")
      setFillContextSentences([""])
      const { data: preguntas } = await supabase
        .from("pregunta")
        .select("id_pregunta, enunciado, orden, imagen_url")
        .eq("id_actividad", activity.id)
        .order("orden", { ascending: true })
      const cnt = Math.min(5, Math.max(3, preguntas?.length ?? 3)) as 3 | 4 | 5
      setSequenceCount(cnt)
      const steps: SequenceStep[] = (preguntas ?? []).slice(0, cnt).map((pq: any) => ({
        file: null, previewUrl: "", existingUrl: pq.imagen_url ?? "", description: pq.enunciado ?? "", preguntaId: pq.id_pregunta,
      }))
      while (steps.length < cnt) steps.push({ file: null, previewUrl: "", existingUrl: "", description: "", preguntaId: "" })
      setSequenceSteps(steps)
    } else {
      const config = parseActivityConfig(activity.instrucciones)
      setInstrucciones(config.instrucciones)
      if (config.opciones && config.opciones.length > 0) {
        setOptions(config.opciones.map((o, i) => ({ id: String(i + 1), text: o.texto, isCorrect: o.correcta })))
      } else {
        setOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
      }
      setCorrectAnswer(config.respuesta_correcta ?? "")
      setPalabrasDistractoras(config.palabras_distractoras ?? "")
      setSoundPreguntaId("")
      setSequenceSteps([])
      setSequenceCount(3)
      setWsBuilderWords(config.palabras_sopa ?? [])
      setWsBuilderInput("")
    }
    setView("config")
  }

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setAttemptedSave(true)
    const showsOptions = selectedType === "multiple" || selectedType === "image"
    if (selectedType === "image" && !imagePreviewUrl && !existingImageUrl) return
    if (showsOptions && options.some(o => !o.text.trim())) return
    if (showsOptions && !options.some(o => o.isCorrect)) return
    if (selectedType === "sequence" && sequenceSteps.filter(s => s.previewUrl || s.existingUrl).length < 3) return
    if (selectedType === "fill" && (!fillEnunciado.trim() || !fillEnunciado.includes("___") || !correctAnswer.trim())) return
    if (selectedType === "sound" && !correctAnswer.trim()) return
    if (selectedType === "short" && !correctAnswer.trim()) return
    if (selectedType === "wordsearch" && wsBuilderWords.length === 0) return
    const typeNeedsInstr = selectedType !== "sound" && selectedType !== "voice" && selectedType !== "fill" && selectedType !== "sequence" && selectedType !== "wordsearch"
    if (typeNeedsInstr && !instrucciones.trim()) return
    setIsSaving(true)
    setSaveError("")

    try {
      let imagen_url: string | null | undefined = undefined
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() ?? "jpg"
        const path = `${user!.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("actividades")
          .upload(path, imageFile, { upsert: true })
        if (uploadError) {
          setSaveError("Error al subir la imagen: " + uploadError.message)
          setIsSaving(false)
          return
        }
        const { data: urlData } = supabase.storage.from("actividades").getPublicUrl(path)
        imagen_url = urlData.publicUrl
      } else if (imageDeleted) {
        imagen_url = null
      }

      const { data: refreshData, error: sessionError } = await supabase.auth.refreshSession()
      const session = refreshData.session
      if (!session || sessionError) {
        setSaveError("Tu sesión ha expirado. Recarga la página e intenta de nuevo.")
        setIsSaving(false)
        return
      }

      const typeShowsOptions = selectedType === "multiple" || selectedType === "image"
      const typeShowsCorrect = selectedType === "short"
      const typeIsSound = selectedType === "sound"
      const typeIsVoice = selectedType === "voice"
      const typeIsFill = selectedType === "fill"
      const typeIsSequence = selectedType === "sequence"
      const typeIsWordsearch = selectedType === "wordsearch"

      let sequenceStepsPayload: { orden: number; imagen_url: string | null; enunciado: string }[] | undefined
      if (typeIsSequence && sequenceSteps.length > 0) {
        const uploaded: typeof sequenceStepsPayload = []
        for (let idx = 0; idx < sequenceSteps.length; idx++) {
          const step = sequenceSteps[idx]
          let url: string | null = step.existingUrl || null
          if (step.file) {
            const ext = step.file.name.split(".").pop() ?? "jpg"
            const path = `secuencias/${user!.id}_${Date.now()}_${idx + 1}.${ext}`
            const { error: uploadError } = await supabase.storage
              .from("actividades").upload(path, step.file, { upsert: true })
            if (uploadError) {
              setSaveError(`Error al subir imagen ${idx + 1}: ${uploadError.message}`)
              setIsSaving(false)
              return
            }
            const { data: urlData } = supabase.storage.from("actividades").getPublicUrl(path)
            url = urlData.publicUrl
          }
          uploaded!.push({ orden: idx + 1, imagen_url: url, enunciado: step.description || `Paso ${idx + 1}` })
        }
        sequenceStepsPayload = uploaded
      }

      let instruccionesPayload: string | null
      let preguntaPayload: { id?: string; enunciado?: string; respuesta_esperada: string; palabras_distractoras: string | null; tipo_respuesta_esperada: string; oraciones_contexto?: string | null } | undefined

      if (typeIsSound || typeIsVoice || typeIsFill) {
        instruccionesPayload = instrucciones || null
        if (typeIsSound) {
          const distractorasFormatted = palabrasDistractoras.split(",").map((w) => w.trim()).filter(Boolean).join("|")
          preguntaPayload = {
            id: soundPreguntaId || undefined,
            respuesta_esperada: correctAnswer,
            palabras_distractoras: distractorasFormatted || null,
            tipo_respuesta_esperada: "texto",
          }
        } else if (typeIsVoice) {
          const respuestaFormatted = correctAnswer.split(",").map((s) => s.trim()).filter(Boolean).join("|")
          preguntaPayload = {
            id: soundPreguntaId || undefined,
            enunciado: voiceEnunciado || undefined,
            respuesta_esperada: respuestaFormatted,
            palabras_distractoras: null,
            tipo_respuesta_esperada: "voz",
          }
        } else {
          const distractorasFormatted = palabrasDistractoras.split(",").map((w) => w.trim()).filter(Boolean).join("|")
          const oracionesStr = fillContextSentences.filter((s) => s.trim()).join("|") || null
          preguntaPayload = {
            id: soundPreguntaId || undefined,
            enunciado: fillEnunciado,
            respuesta_esperada: correctAnswer.trim(),
            palabras_distractoras: distractorasFormatted || null,
            oraciones_contexto: oracionesStr,
            tipo_respuesta_esperada: "texto",
          }
        }
      } else if (typeIsSequence) {
        instruccionesPayload = instrucciones || null
        preguntaPayload = undefined
      } else {
        instruccionesPayload = serializeActivityConfig({
          instrucciones,
          opciones: typeShowsOptions
            ? options.filter((o) => o.text.trim()).map((o) => ({ texto: o.text, correcta: o.isCorrect }))
            : undefined,
          respuesta_correcta: typeShowsCorrect && correctAnswer ? correctAnswer : undefined,
          palabras_sopa: typeIsWordsearch && wsBuilderWords.length > 0 ? wsBuilderWords : undefined,
        })
        preguntaPayload = undefined
      }

      if (editingActivity) {
        const putBody: Record<string, unknown> = {
          instrucciones: instruccionesPayload,
          nivel_dificultad: dificultad,
        }
        if (typeIsSequence) putBody.type = "sequence"
        if (sequenceStepsPayload) putBody.steps = sequenceStepsPayload
        if (imagen_url !== undefined) putBody.imagen_url = imagen_url
        if (preguntaPayload) putBody.pregunta = preguntaPayload

        const response = await fetch(`/api/activities/${editingActivity.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(putBody),
        })
        if (!response.ok) {
          const data = await response.json()
          setSaveError(data.error ?? "Error al guardar")
          setIsSaving(false)
          return
        }
        const diffInt = dificultad === "facil" ? 1 : dificultad === "medio" ? 2 : 3
        const newImageUrl = imagen_url !== undefined ? imagen_url : editingActivity.imagen_url
        setExistingActivities((prev) =>
          prev.map((a) =>
            a.id === editingActivity.id
              ? { ...a, instrucciones: instruccionesPayload, nivel_dificultad: diffInt, imagen_url: newImageUrl }
              : a
          )
        )
        speak("Actividad actualizada exitosamente")
        setView("existing")
      } else {
        if (!selectedLessonId) {
          setSaveError("Selecciona una lección para agregar la actividad.")
          setIsSaving(false)
          return
        }
        const postBody: Record<string, unknown> = {
          lessonId: selectedLessonId,
          type: selectedType,
          instrucciones: instruccionesPayload,
          nivel_dificultad: dificultad,
        }
        if (imagen_url !== undefined) postBody.imagen_url = imagen_url
        if (preguntaPayload) postBody.pregunta = preguntaPayload
        if (sequenceStepsPayload) postBody.steps = sequenceStepsPayload

        const response = await fetch("/api/activities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(postBody),
        })
        if (!response.ok) {
          const data = await response.json()
          setSaveError(data.error ?? "Error al crear actividad")
          setIsSaving(false)
          return
        }
        speak("Actividad creada exitosamente")
        await fetchData()
        setView("grid")
      }
    } catch {
      setSaveError("Error de conexión. Intenta de nuevo.")
    }

    setIsSaving(false)
  }

  const selectedTypeInfo = activityTypes.find((t) => t.id === selectedType)

  // ═══════════════════════════════════════════════════════════════
  // VIEW: EXISTING ACTIVITIES
  // ═══════════════════════════════════════════════════════════════
  if (view === "existing") {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-6">
            <button type="button" onClick={() => setView("grid")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver">
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">Actividades Existentes</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loadingData ? "Cargando..." : `${existingActivities.length} actividades`}
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-6 py-8">
          {loadingData ? (
            <div className="space-y-8" aria-busy="true" aria-label="Cargando actividades">
              {[1, 2].map(i => (
                <div key={i} className="space-y-3 animate-pulse">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-4 w-4 rounded bg-muted" />
                    <div className="h-4 w-32 rounded-md bg-muted" />
                  </div>
                  <div className="ml-4 space-y-3">
                    {[1, 2].map(j => (
                      <div key={j} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-muted shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-2/5 rounded-md bg-muted" />
                            <div className="h-3 w-1/4 rounded-md bg-muted" />
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <div className="h-8 w-16 rounded-xl bg-muted" />
                            <div className="h-8 w-8 rounded-xl bg-muted" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : existingActivities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center shadow-sm">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" aria-hidden="true" />
              <h2 className="text-base font-bold text-foreground mb-1">No hay actividades</h2>
              <p className="text-sm text-muted-foreground">
                Crea lecciones con actividades para verlas aquí y configurarlas.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(new Set(existingActivities.map((a) => a.courseTitle))).map((courseTitle) => (
                <div key={courseTitle}>
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />
                    <h2 className="text-sm font-bold text-foreground">{courseTitle}</h2>
                  </div>

                  {Array.from(
                    new Set(
                      existingActivities
                        .filter((a) => a.courseTitle === courseTitle)
                        .map((a) => a.lessonId)
                    )
                  ).map((lessonId) => {
                    const lessonActivities = existingActivities.filter(
                      (a) => a.courseTitle === courseTitle && a.lessonId === lessonId
                    )
                    return (
                      <div key={lessonId} className="rounded-2xl border border-border bg-card shadow-sm p-5 mb-4">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          <h3 className="text-sm font-semibold text-foreground">{lessonActivities[0]?.lessonTitle}</h3>
                        </div>
                        <ul className="space-y-2 list-none p-0">
                          {lessonActivities.map((activity) => (
                            <li key={activity.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{activity.typeLabel}</p>
                                {activity.instrucciones ? (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {activity.instrucciones}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground/60 mt-0.5 italic">
                                    Sin instrucciones configuradas
                                  </p>
                                )}
                                {activity.nivel_dificultad != null && (
                                  <span className="inline-block mt-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium capitalize">
                                    {difficultyFromInt(activity.nivel_dificultad)}
                                  </span>
                                )}
                                {(activitiesWithAttempts.get(activity.id) ?? 0) > 0 && (
                                  <span className="inline-flex items-center gap-1 mt-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                                    <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                                    {activitiesWithAttempts.get(activity.id)} resp.
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button type="button"
                                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-all"
                                  onClick={() => {
                                    setPreviewActivityId(activity.id)
                                    setView("preview")
                                  }}>
                                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                                  Vista previa
                                </button>
                                <button type="button"
                                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-all"
                                  onClick={() => openConfigForEdit(activity)}>
                                  <Edit className="w-4 h-4" aria-hidden="true" />
                                  Editar
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW: PREVIEW (student view, no attempts saved)
  // ═══════════════════════════════════════════════════════════════
  if (view === "preview") {
    return (
      <StudentActivity
        activityId={previewActivityId}
        onBack={() => setView("existing")}
        onComplete={() => setView("existing")}
        onVoiceActivity={() => setView("existing")}
        previewMode
      />
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW: CONFIG FORM (creating or editing)
  // ═══════════════════════════════════════════════════════════════
  if (view === "config") {
    const isEditing = editingActivity !== null
    const showSoundConfig = selectedType === "sound"
    const showVoiceConfig = selectedType === "voice"
    const showFillConfig = selectedType === "fill"
    const showSequenceConfig = selectedType === "sequence"

    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => { if (activityDirty) { setShowExitConfirm(true) } else { setView(isEditing ? "existing" : "grid") } }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
                aria-label="Volver">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <div>
                <h1 className="text-base font-bold text-foreground leading-none">
                  {selectedTypeInfo?.label ?? editingActivity?.typeLabel}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEditing
                    ? `${editingActivity!.courseTitle} › ${editingActivity!.lessonTitle}`
                    : "Configurar actividad"}
                </p>
              </div>
            </div>
            {settings.voiceEnabled && (
              <button type="button"
                onClick={async () => {
                  const text = getActivitySpeakText(selectedType ?? "", selectedTypeInfo?.label ?? editingActivity?.typeLabel ?? "")
                  if (actTypeAudioState === "playing") { stopSpeak(); setActTypeAudioState("paused") }
                  else { setActTypeAudioState("playing"); await speak(text); setActTypeAudioState("ended") }
                }}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
                aria-label={actTypeAudioState === "playing" ? "Pausar" : actTypeAudioState === "paused" ? "Reanudar" : actTypeAudioState === "ended" ? "Repetir" : "Escuchar instrucciones"}>
                {actTypeAudioState === "playing" ? <Pause className="w-4 h-4" aria-hidden="true" />
                 : actTypeAudioState === "paused" ? <Play className="w-4 h-4" aria-hidden="true" />
                 : actTypeAudioState === "ended"  ? <RotateCcw className="w-4 h-4" aria-hidden="true" />
                 : <Volume2 className="w-4 h-4" aria-hidden="true" />}
                <span className="hidden sm:inline">
                  {actTypeAudioState === "playing" ? "Pausar" : actTypeAudioState === "paused" ? "Reanudar" : actTypeAudioState === "ended" ? "Repetir" : "Escuchar"}
                </span>
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-6 py-8">
          <form onSubmit={handleSave} className="space-y-5">

            {/* Lesson selector (only when creating new) */}
            {!isEditing && (
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Lección de destino</h2>
                {lessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tienes lecciones creadas. Crea una lección primero.</p>
                ) : (
                  <>
                  <label htmlFor="lesson-select" className="sr-only">Lección de destino</label>
                  <select
                    id="lesson-select"
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Array.from(new Set(lessons.map((l) => l.courseTitle))).map((courseTitle) => (
                      <optgroup key={courseTitle} label={courseTitle}>
                        {lessons
                          .filter((l) => l.courseTitle === courseTitle)
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  </>
                )}
              </div>
            )}

            <ActivityConfigForm
              type={selectedType ?? ""}
              hasAttempts={!!(editingActivity && (activitiesWithAttempts.get(editingActivity.id) ?? 0) > 0)}
              imagePreviewUrl={imagePreviewUrl}
              existingImageUrl={existingImageUrl}
              imageInputRef={imageInputRef}
              onImageSelect={handleImageSelect}
              onImageDelete={handleImageDelete}
              instrucciones={instrucciones}
              onInstruccionesChange={setInstrucciones}
              options={options}
              onOptionTextChange={handleOptionChange}
              onSetCorrect={handleSetCorrect}
              onAddOption={handleAddOption}
              onRemoveOption={handleRemoveOption}
              correctAnswer={correctAnswer}
              onCorrectAnswerChange={setCorrectAnswer}
              dificultad={dificultad}
              onDificultadChange={setDificultad}
              palabrasDistractoras={palabrasDistractoras}
              onPalabrasDistractorasChange={setPalabrasDistractoras}
              voiceEnunciado={voiceEnunciado}
              onVoiceEnunciadoChange={setVoiceEnunciado}
              fillEnunciado={fillEnunciado}
              onFillEnunciadoChange={setFillEnunciado}
              fillContextSentences={fillContextSentences}
              onFillContextSentencesChange={setFillContextSentences}
              wsWords={wsBuilderWords}
              wsInput={wsBuilderInput}
              onWsInputChange={setWsBuilderInput}
              onAddWsWord={() => {
                const word = wsBuilderInput.trim().toUpperCase()
                if (word && !wsBuilderWords.includes(word) && wsBuilderWords.length < 10) {
                  setWsBuilderWords([...wsBuilderWords, word])
                  setWsBuilderInput("")
                }
              }}
              onRemoveWsWord={(word) => setWsBuilderWords(wsBuilderWords.filter(w => w !== word))}
              sequenceCount={sequenceCount}
              onSequenceCountChange={setSequenceCount}
              sequenceSteps={sequenceSteps}
              onSequenceStepsChange={setSequenceSteps}
              seqInputRefs={seqInputRefs}
              speak={speak}
              stopSpeak={stopSpeak}
              showValidation={attemptedSave}
              onDirty={() => setActivityDirty(true)}
            />

            {saveError && (
              <p className="text-destructive text-sm font-medium" role="alert">{saveError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button type="button"
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-all"
                onClick={() => setView(isEditing ? "existing" : "grid")}>
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={isSaving || (showSoundConfig ? !correctAnswer.trim() : showVoiceConfig ? !voiceEnunciado.trim() || !correctAnswer.trim() : showFillConfig ? !fillEnunciado.trim() || !correctAnswer.trim() : showSequenceConfig ? !sequenceSteps.every((s) => s.file || s.existingUrl) : !instrucciones) || (!isEditing && lessons.length === 0)}>
                <Save className="w-4 h-4" aria-hidden="true" />
                {isSaving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Guardar Actividad"}
              </button>
            </div>
          </form>
        </main>

        {/* Modal confirmación al salir sin guardar */}
        {showExitConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-confirm-title"
          >
            <div className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-6 space-y-4">
              <div className="space-y-1">
                <h2 id="exit-confirm-title" className="text-base font-bold text-foreground">
                  ¿Salir sin guardar?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Los cambios que hiciste se perderán si sales ahora.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Seguir editando
                </button>
                <button
                  type="button"
                  onClick={() => { setShowExitConfirm(false); setView(isEditing ? "existing" : "grid") }}
                  className="w-full h-11 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98] transition-all"
                >
                  Salir sin guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW: GRID (default)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">Constructor de Actividades</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Selecciona un tipo de actividad</p>
            </div>
          </div>
          {settings.voiceEnabled && (
            <button type="button"
              onClick={async () => {
                const text = "Constructor de actividades. Selecciona el tipo de actividad que deseas crear, o revisa tus actividades existentes."
                if (builderAudioState === "playing") { stopSpeak(); setBuilderAudioState("paused") }
                else { setBuilderAudioState("playing"); await speak(text); setBuilderAudioState("ended") }
              }}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label={builderAudioState === "playing" ? "Pausar" : builderAudioState === "paused" ? "Reanudar" : builderAudioState === "ended" ? "Repetir" : "Escuchar instrucciones"}>
              {builderAudioState === "playing" ? <Pause className="w-4 h-4" aria-hidden="true" />
               : builderAudioState === "paused" ? <Play className="w-4 h-4" aria-hidden="true" />
               : builderAudioState === "ended"  ? <RotateCcw className="w-4 h-4" aria-hidden="true" />
               : <Volume2 className="w-4 h-4" aria-hidden="true" />}
              <span className="hidden sm:inline">
                {builderAudioState === "playing" ? "Pausar" : builderAudioState === "paused" ? "Reanudar" : builderAudioState === "ended" ? "Repetir" : "Escuchar"}
              </span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Button to view existing activities */}
        <button type="button"
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted hover:border-primary/40 active:scale-[0.98] transition-all disabled:opacity-50 mb-8 shadow-sm"
          onClick={() => setView("existing")}
          disabled={loadingData}>
          <List className="w-4 h-4" aria-hidden="true" />
          {loadingData
            ? "Cargando..."
            : `Ver actividades existentes (${existingActivities.length})`}
        </button>

        {/* Type cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activityTypes.map((type) => (
            <button key={type.id}
              onClick={() => openConfigForNew(type.id)}
              className="rounded-2xl border border-border bg-card shadow-sm p-6 hover:shadow-md hover:border-primary/30 transition-all text-left group active:scale-[0.98]">
              <div className={`w-12 h-12 ${type.color} rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-105`}>
                <type.icon className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-bold text-foreground mb-1">{type.label}</h2>
              <div className="flex items-center text-primary text-xs font-medium mt-3">
                Crear actividad
                <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
