"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft,
  Save,
  Volume2,
  Image,
  Music,
  ListOrdered,
  CheckSquare,
  PenLine,
  Mic,
  Plus,
  Trash2,
  ChevronRight,
  Edit,
  BookOpen,
  FileText,
  List,
  Settings2,
  Upload,
  AlignLeft,
  Search,
} from "lucide-react"
import { parseActivityConfig, serializeActivityConfig } from "@/lib/activity-config"

interface ActivityBuilderProps {
  onBack: () => void
  onSave: () => void
}

type ActivityType = "image" | "sound" | "sequence" | "multiple" | "short" | "voice" | "fill" | "wordsearch" | null
type BuilderView = "grid" | "existing" | "config"

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
  preguntaId: string
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

const difficultyLevels = [
  { id: "facil", label: "Facil", description: "Para comenzar" },
  { id: "medio", label: "Medio", description: "Un poco mas dificil" },
  { id: "dificil", label: "Dificil", description: "Para avanzados" },
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
  const { speak, settings } = useAccessibility()

  const [view, setView] = useState<BuilderView>("grid")
  const [selectedType, setSelectedType] = useState<ActivityType>(null)
  const [editingActivity, setEditingActivity] = useState<ExistingActivity | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState("")

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
  const [lessons, setLessons] = useState<LessonOption[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [showGearMenu, setShowGearMenu] = useState(false)

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
    // Reset input so the same file can be re-selected if needed
    e.target.value = ""
  }

  const handleImageDelete = () => {
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(null)
    setImagePreviewUrl("")
    setExistingImageUrl("")
    setImageDeleted(true)
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
    // Sequence steps initialization
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
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(null)
    setImagePreviewUrl("")
    setExistingImageUrl(activity.imagen_url ?? "")
    setImageDeleted(false)

    if (activity.type === "sound" || activity.type === "voice" || activity.type === "fill") {
      // For sound/voice/fill: instrucciones is plain text; data lives in pregunta table
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
        // Voice: enunciado = question shown/spoken; respuesta_esperada = pipe-separated options → comma
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
        // Display distractors as comma-separated (only used for sound)
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
    setIsSaving(true)
    setSaveError("")

    try {
      // ── Upload image (only for "image" type) ─────────────────
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

      // ── Refresh session to always get a valid access_token ────
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

      // ── Upload sequence images ────────────────────────────────
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

      // ── Build instrucciones payload ───────────────────────────
      let instruccionesPayload: string | null
      let preguntaPayload: { id?: string; enunciado?: string; respuesta_esperada: string; palabras_distractoras: string | null; tipo_respuesta_esperada: string; oraciones_contexto?: string | null } | undefined

      if (typeIsSound || typeIsVoice || typeIsFill) {
        // Sound/Voice/Fill: instrucciones is plain text; data goes to pregunta table
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
          // Fill
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
        // PUT existing activity
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
        // POST new activity
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
        <header className="bg-card border-b-2 border-border sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setView("grid")}
              className="h-12 w-12 p-0"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Actividades Existentes</h1>
              <p className="text-sm text-muted-foreground">
                {loadingData ? "Cargando..." : `${existingActivities.length} actividades`}
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {loadingData ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-lg text-muted-foreground">Cargando actividades...</p>
            </div>
          ) : existingActivities.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
                <h3 className="text-2xl font-bold text-foreground mb-2">No hay actividades</h3>
                <p className="text-lg text-muted-foreground">
                  Crea lecciones con actividades para verlas aquí y configurarlas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Array.from(new Set(existingActivities.map((a) => a.courseTitle))).map((courseTitle) => (
                <div key={courseTitle}>
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="w-6 h-6 text-primary" aria-hidden="true" />
                    <h2 className="text-xl font-bold text-foreground">{courseTitle}</h2>
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
                      <Card key={lessonId} className="border-2 shadow-md mb-4">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                            {lessonActivities[0]?.lessonTitle}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {lessonActivities.map((activity) => (
                              <li
                                key={activity.id}
                                className="flex items-center justify-between p-4 bg-muted rounded-xl"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground">{activity.typeLabel}</p>
                                  {activity.instrucciones ? (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {activity.instrucciones}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground/60 mt-1 italic">
                                      Sin instrucciones configuradas
                                    </p>
                                  )}
                                  {activity.nivel_dificultad != null && (
                                    <span className="inline-block mt-2 text-xs bg-secondary px-2 py-0.5 rounded-full font-medium capitalize">
                                      {difficultyFromInt(activity.nivel_dificultad)}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="ml-4 h-12 px-5 border-2 shrink-0"
                                  onClick={() => openConfigForEdit(activity)}
                                >
                                  <Edit className="w-5 h-5 mr-2" aria-hidden="true" />
                                  Editar
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
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
  // VIEW: CONFIG FORM (creating or editing)
  // ═══════════════════════════════════════════════════════════════
  if (view === "config") {
    const isEditing = editingActivity !== null
    const showOptions = selectedType === "multiple" || selectedType === "image"
    const showCorrectAnswer = selectedType === "short"
    const showSoundConfig = selectedType === "sound"
    const showVoiceConfig = selectedType === "voice"
    const showFillConfig = selectedType === "fill"
    const showSequenceConfig = selectedType === "sequence"
    const showWordSearch = selectedType === "wordsearch"

    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b-2 border-border sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setView(isEditing ? "existing" : "grid")}
                className="h-12 w-12 p-0"
                aria-label="Volver"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {selectedTypeInfo?.label ?? editingActivity?.typeLabel}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isEditing
                    ? `${editingActivity!.courseTitle} › ${editingActivity!.lessonTitle}`
                    : "Configurar actividad"}
                </p>
              </div>
            </div>
            {settings.voiceEnabled && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => speak("Configura tu actividad. Escribe las instrucciones para el estudiante, configura las opciones y selecciona el nivel de dificultad.")}
                className="h-12"
              >
                <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
                Escuchar
              </Button>
            )}
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <form onSubmit={handleSave} className="space-y-8">

            {/* Lesson selector (only when creating new) */}
            {!isEditing && (
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Leccion de destino</CardTitle>
                </CardHeader>
                <CardContent>
                  {lessons.length === 0 ? (
                    <p className="text-muted-foreground">No tienes lecciones creadas. Crea una lección primero.</p>
                  ) : (
                    <select
                      value={selectedLessonId}
                      onChange={(e) => setSelectedLessonId(e.target.value)}
                      className="w-full h-14 px-4 text-lg border-2 border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
                  )}
                </CardContent>
              </Card>
            )}

            {/* Image upload — only for "Identificacion de imagenes" */}
            {selectedType === "image" && (
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Imagen de la Actividad</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(imagePreviewUrl || existingImageUrl) ? (
                    <div>
                      <img
                        src={imagePreviewUrl || existingImageUrl}
                        alt="Vista previa de la imagen"
                        className="w-full max-h-64 object-contain rounded-xl border-2 border-border bg-muted"
                      />
                      <div className="flex gap-3 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-11 border-2"
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                          Cambiar imagen
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 px-4 border-2 text-destructive hover:bg-destructive/10"
                          onClick={handleImageDelete}
                          aria-label="Eliminar imagen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full h-44 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <Image className="w-10 h-10 text-muted-foreground" aria-hidden="true" />
                      <p className="text-base font-medium text-muted-foreground">
                        Haz clic para subir una imagen
                      </p>
                      <p className="text-sm text-muted-foreground">
                        PNG, JPG, WEBP o GIF · Máx 5 MB
                      </p>
                    </button>
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </CardContent>
              </Card>
            )}

            {/* Sound config — sentence (Web Speech) + distractors */}
            {showSoundConfig && (
              <>
                {/* Oración correcta */}
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">Oración Correcta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3">
                      <Input
                        value={correctAnswer}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        placeholder="Ej: Los gatos son bonitos"
                        className="h-14 text-lg border-2 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-14 px-5 border-2 shrink-0 gap-2"
                        onClick={() => correctAnswer.trim() && speak(correctAnswer.trim())}
                        aria-label="Escuchar oración"
                        disabled={!correctAnswer.trim()}
                      >
                        <Volume2 className="w-5 h-5" aria-hidden="true" />
                        Escuchar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      El sistema reproducirá esta oración en voz alta al alumno usando el sintetizador de voz del navegador.
                    </p>
                    {correctAnswer.trim() && (
                      <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                        {correctAnswer.trim().split(/\s+/).map((word, i) => (
                          <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                            {word}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Palabras distractoras */}
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      Palabras Distractoras{" "}
                      <span className="text-muted-foreground text-base font-normal">(opcional)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={palabrasDistractoras}
                      onChange={(e) => setPalabrasDistractoras(e.target.value)}
                      placeholder="Ej: nube, famoso, mesa"
                      className="h-14 text-lg border-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      Separa las palabras con <strong>comas</strong>. Se mezclarán con la oración para aumentar la dificultad.
                    </p>
                    {palabrasDistractoras.trim() && (
                      <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                        {palabrasDistractoras.split(",").filter((w) => w.trim()).map((word, i) => (
                          <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-lg text-sm font-medium">
                            {word.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Voice config — question (enunciado) + correct answers (comma-separated) */}
            {showVoiceConfig && (
              <>
                {/* Pregunta */}
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">Pregunta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3">
                      <Input
                        value={voiceEnunciado}
                        onChange={(e) => setVoiceEnunciado(e.target.value)}
                        placeholder="Ej: ¿De qué color es el cielo?"
                        className="h-14 text-lg border-2 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-14 px-5 border-2 shrink-0 gap-2"
                        onClick={() => voiceEnunciado.trim() && speak(voiceEnunciado.trim())}
                        disabled={!voiceEnunciado.trim()}
                        aria-label="Escuchar pregunta"
                      >
                        <Volume2 className="w-5 h-5" aria-hidden="true" />
                        Escuchar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Esta pregunta se mostrará y se leerá en voz alta al alumno.
                    </p>
                  </CardContent>
                </Card>

                {/* Respuesta correcta (multi-opcion) */}
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">Respuesta Correcta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      placeholder="Ej: azul, celeste, azul claro"
                      className="h-14 text-lg border-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      Separa con <strong>comas</strong> si hay varias respuestas válidas. Se acepta cualquiera.
                    </p>
                    {correctAnswer.trim() && (
                      <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                        {correctAnswer.split(",").filter((s) => s.trim()).map((ans, i) => (
                          <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                            {ans.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Sequence config — count selector + image slots */}
            {showSequenceConfig && (
              <>
                {/* Count selector */}
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">¿Cuántas imágenes?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {([3, 4, 5] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setSequenceCount(n)
                            const cur = [...sequenceSteps]
                            while (cur.length < n) cur.push({ file: null, previewUrl: "", existingUrl: "", description: "", preguntaId: "" })
                            setSequenceSteps(cur.slice(0, n))
                          }}
                          className={`p-5 rounded-xl border-2 text-center transition-all ${sequenceCount === n
                            ? "border-primary bg-primary/10 ring-2 ring-primary"
                            : "border-border hover:border-primary/50"
                            }`}
                          aria-pressed={sequenceCount === n}
                        >
                          <span className="text-3xl font-bold text-foreground block">{n}</span>
                          <span className="text-sm text-muted-foreground">imágenes</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Image slots */}
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">Imágenes de la secuencia</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-sm text-muted-foreground">
                      Sube las imágenes <strong>en el orden correcto</strong>. El alumno deberá reordenarlas.
                    </p>
                    {sequenceSteps.map((step, idx) => (
                      <div key={idx} className="border-2 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0">
                            {idx + 1}
                          </span>
                          <h4 className="font-semibold text-foreground">Paso {idx + 1}</h4>
                        </div>

                        {(step.previewUrl || step.existingUrl) ? (
                          <div className="space-y-3">
                            <img
                              src={step.previewUrl || step.existingUrl}
                              alt={`Paso ${idx + 1}`}
                              className="w-full max-h-44 object-contain rounded-xl border-2 border-border bg-muted"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-2 h-10 gap-2"
                                onClick={() => seqInputRefs.current[idx]?.click()}
                              >
                                <Upload className="w-4 h-4" aria-hidden="true" />
                                Cambiar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-2 h-10 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  const steps = [...sequenceSteps]
                                  if (steps[idx].previewUrl.startsWith("blob:")) URL.revokeObjectURL(steps[idx].previewUrl)
                                  steps[idx] = { ...steps[idx], file: null, previewUrl: "", existingUrl: "" }
                                  setSequenceSteps(steps)
                                }}
                                aria-label="Eliminar imagen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => seqInputRefs.current[idx]?.click()}
                            className="w-full h-36 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
                          >
                            <Image className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                            <p className="text-sm text-muted-foreground font-medium">Subir imagen del paso {idx + 1}</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP · Máx 5 MB</p>
                          </button>
                        )}

                        <input
                          ref={(el) => { seqInputRefs.current[idx] = el }}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const steps = [...sequenceSteps]
                            if (steps[idx].previewUrl.startsWith("blob:")) URL.revokeObjectURL(steps[idx].previewUrl)
                            steps[idx] = { ...steps[idx], file, previewUrl: URL.createObjectURL(file) }
                            setSequenceSteps(steps)
                            e.target.value = ""
                          }}
                        />

                        <Input
                          value={step.description}
                          onChange={(e) => {
                            const steps = [...sequenceSteps]
                            steps[idx] = { ...steps[idx], description: e.target.value }
                            setSequenceSteps(steps)
                          }}
                          placeholder={`Descripción del paso ${idx + 1} (opcional)`}
                          className="h-10 border-2"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Fill config — context sentences + target sentence + correct answer + distractors */}
            {showFillConfig && (
              <>
                {/* Oraciones de contexto */}
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      Oraciones de Contexto{" "}
                      <span className="text-muted-foreground text-base font-normal">(opcional)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {fillContextSentences.map((sentence, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={sentence}
                          onChange={(e) => {
                            const next = [...fillContextSentences]
                            next[idx] = e.target.value
                            setFillContextSentences(next)
                          }}
                          placeholder={`Ej: Yo tengo tres mascotas.`}
                          className="h-12 text-base border-2 flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 px-3 border-2 text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => {
                            if (fillContextSentences.length > 1) {
                              setFillContextSentences(fillContextSentences.filter((_, i) => i !== idx))
                            } else {
                              setFillContextSentences([""])
                            }
                          }}
                          aria-label="Eliminar oración"
                          disabled={fillContextSentences.length === 1 && !sentence.trim()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 border-2 border-dashed"
                      onClick={() => setFillContextSentences([...fillContextSentences, ""])}
                    >
                      <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                      Agregar oración de ejemplo
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Estas oraciones aparecen como ejemplos para que el alumno comprenda el patrón antes de completar.
                    </p>
                  </CardContent>
                </Card>

                {/* Oración a completar */}
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">Oración a Completar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={fillEnunciado}
                      onChange={(e) => setFillEnunciado(e.target.value)}
                      placeholder="Ej: Yo tengo tres ___."
                      className="h-14 text-lg border-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      Usa <strong>___</strong> (tres guiones bajos) para marcar el espacio en blanco.
                    </p>
                    {fillEnunciado.includes("___") && (
                      <div className="p-3 bg-muted rounded-xl text-base font-medium text-foreground">
                        Vista previa:{" "}
                        {fillEnunciado.split("___").map((part, i) => (
                          <span key={i}>
                            {part}
                            {i < fillEnunciado.split("___").length - 1 && (
                              <span className="inline-block min-w-[60px] mx-1 border-b-2 border-dashed border-primary text-primary">
                                {correctAnswer.trim() || "___"}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Respuesta correcta */}
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">Respuesta Correcta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      placeholder="Ej: gatos"
                      className="h-14 text-lg border-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      La palabra exacta que completa el espacio en blanco.
                    </p>
                  </CardContent>
                </Card>

                {/* Palabras distractoras */}
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      Palabras Distractoras{" "}
                      <span className="text-muted-foreground text-base font-normal">(opciones incorrectas)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={palabrasDistractoras}
                      onChange={(e) => setPalabrasDistractoras(e.target.value)}
                      placeholder="Ej: gato, perros, pez"
                      className="h-14 text-lg border-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      Separa con <strong>comas</strong>. Se mezclarán con la respuesta correcta como opciones.
                    </p>
                    {palabrasDistractoras.trim() && (
                      <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                        {palabrasDistractoras.split(",").filter((w) => w.trim()).map((word, i) => (
                          <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-lg text-sm font-medium">
                            {word.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Wordsearch config — words to find */}
            {showWordSearch && (
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" aria-hidden="true" />
                    Palabras a Encontrar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Agrega las palabras que los estudiantes deben encontrar. Se convertirán a mayúsculas automáticamente. Máximo 10 palabras.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={wsBuilderInput}
                      onChange={(e) => setWsBuilderInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          const word = wsBuilderInput.trim().toUpperCase()
                          if (word && !wsBuilderWords.includes(word) && wsBuilderWords.length < 10) {
                            setWsBuilderWords([...wsBuilderWords, word])
                            setWsBuilderInput("")
                          }
                        }
                      }}
                      placeholder="Ej: GATO"
                      className="h-12 text-lg border-2 flex-1"
                      maxLength={15}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const word = wsBuilderInput.trim().toUpperCase()
                        if (word && !wsBuilderWords.includes(word) && wsBuilderWords.length < 10) {
                          setWsBuilderWords([...wsBuilderWords, word])
                          setWsBuilderInput("")
                        }
                      }}
                      className="h-12 px-5"
                      disabled={wsBuilderWords.length >= 10 || !wsBuilderInput.trim()}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                  {wsBuilderWords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {wsBuilderWords.map(word => (
                        <span key={word} className="inline-flex items-center gap-2 bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-lg border border-primary/30">
                          {word}
                          <button
                            type="button"
                            onClick={() => setWsBuilderWords(wsBuilderWords.filter(w => w !== word))}
                            className="text-primary hover:text-destructive transition-colors"
                            aria-label={`Eliminar ${word}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Instrucciones de la Actividad</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={instrucciones}
                  onChange={(e) => setInstrucciones(e.target.value)}
                  placeholder="Escribe instrucciones claras y simples. Ejemplo: Mira la imagen y selecciona el animal que ves."
                  className="w-full min-h-[120px] p-4 text-lg border-2 border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  required={!showSoundConfig && !showVoiceConfig && !showFillConfig && !showSequenceConfig && !showWordSearch}
                />
              </CardContent>
            </Card>

            {/* Options — for multiple choice types */}
            {showOptions && (
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Opciones de Respuesta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleSetCorrect(option.id)}
                        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${option.isCorrect
                          ? "bg-success border-success text-success-foreground"
                          : "border-border hover:border-primary"
                          }`}
                        aria-label={option.isCorrect ? "Respuesta correcta" : "Marcar como correcta"}
                      >
                        {option.isCorrect ? "✓" : String.fromCharCode(65 + index)}
                      </button>
                      <Input
                        value={option.text}
                        onChange={(e) => handleOptionChange(option.id, e.target.value)}
                        placeholder={`Opcion ${index + 1}`}
                        className="h-12 text-lg border-2 flex-1"
                      />
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(option.id)}
                          className="text-destructive hover:bg-destructive/10"
                          aria-label="Eliminar opcion"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-2 border-dashed"
                    onClick={handleAddOption}
                  >
                    <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
                    Agregar Opcion
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Haz clic en la letra para marcar la respuesta correcta
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Correct Answer — for short answer and voice */}
            {showCorrectAnswer && (
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Respuesta Correcta</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="Escribe la respuesta esperada"
                    className="h-14 text-lg border-2"
                  />
                  <p className="text-sm text-muted-foreground mt-3">
                    El sistema comparara la respuesta del estudiante con esta
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Difficulty */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Nivel de Dificultad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {difficultyLevels.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setDificultad(level.id)}
                      className={`p-5 rounded-xl border-2 text-center transition-all ${dificultad === level.id
                        ? "border-primary bg-primary/10 ring-2 ring-primary"
                        : "border-border hover:border-primary/50"
                        }`}
                      aria-pressed={dificultad === level.id}
                    >
                      <p className={`text-lg font-bold ${dificultad === level.id ? "text-primary" : "text-foreground"}`}>
                        {level.label}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {saveError && (
              <p className="text-destructive text-base font-medium" role="alert">{saveError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1 h-16 text-xl border-2"
                onClick={() => setView(isEditing ? "existing" : "grid")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                className="flex-1 h-16 text-xl"
                disabled={isSaving || (showSoundConfig ? !correctAnswer.trim() : showVoiceConfig ? !voiceEnunciado.trim() || !correctAnswer.trim() : showFillConfig ? !fillEnunciado.trim() || !correctAnswer.trim() : showSequenceConfig ? !sequenceSteps.every((s) => s.file || s.existingUrl) : !instrucciones) || (!isEditing && lessons.length === 0)}
              >
                <Save className="w-6 h-6 mr-3" aria-hidden="true" />
                {isSaving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Guardar Actividad"}
              </Button>
            </div>
          </form>
        </main>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW: GRID (default — original design)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              className="h-12 w-12 p-0"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Constructor de Actividades</h1>
              <p className="text-sm text-muted-foreground">Selecciona un tipo de actividad</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.voiceEnabled && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => speak("Constructor de actividades. Selecciona el tipo de actividad que deseas crear, o revisa tus actividades existentes.")}
                className="h-12"
              >
                <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
                Escuchar
              </Button>
            )}
            <div className="relative">
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-12 p-0"
                aria-label="Opciones de modo"
                onClick={() => setShowGearMenu((prev) => !prev)}
              >
                <Settings2 className="w-5 h-5" />
              </Button>
              {showGearMenu && (
                <div className="absolute right-0 top-14 z-20 w-64 bg-card border-2 border-border rounded-xl shadow-xl overflow-hidden">
                  <button
                    className="w-full px-5 py-4 text-left text-base font-medium hover:bg-primary/10 transition-colors flex items-center gap-3"
                    onClick={() => { setView("grid"); setShowGearMenu(false) }}
                  >
                    <Plus className="w-5 h-5 text-primary" />
                    Crear nueva actividad
                  </button>
                  <button
                    className="w-full px-5 py-4 text-left text-base font-medium hover:bg-primary/10 transition-colors flex items-center gap-3"
                    onClick={() => { setView("existing"); setShowGearMenu(false) }}
                  >
                    <List className="w-5 h-5 text-primary" />
                    {loadingData ? "Cargando..." : `Ver actividades existentes (${existingActivities.length})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Button to view existing activities */}
        <Button
          variant="outline"
          size="lg"
          className="w-full h-14 text-lg border-2 mb-8"
          onClick={() => setView("existing")}
          disabled={loadingData}
        >
          <List className="w-6 h-6 mr-3" aria-hidden="true" />
          {loadingData
            ? "Cargando..."
            : `Ver actividades existentes (${existingActivities.length})`}
        </Button>

        {/* Type cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activityTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => openConfigForNew(type.id)}
              className="p-8 bg-card rounded-2xl border-2 border-border shadow-lg hover:border-primary hover:shadow-xl transition-all text-left group"
            >
              <div className={`w-16 h-16 ${type.color} rounded-2xl flex items-center justify-center mb-5`}>
                <type.icon className="w-8 h-8 text-primary-foreground" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{type.label}</h3>
              <div className="flex items-center text-primary font-medium mt-4">
                Crear actividad
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
