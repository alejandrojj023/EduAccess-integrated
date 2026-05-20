"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Save, Volume2, FileText, Plus, Trash2, GripVertical, ChevronLeft, BookOpen, Youtube, Search, Paperclip, BookMarked, Pencil, Upload, ImageIcon, List, HelpCircle, PencilLine, Mic, AlignLeft } from "lucide-react"
import { parseActivityConfig, serializeActivityConfig } from "@/lib/activity-config"

interface EditLessonProps {
  lessonId: string | null
  onBack: () => void
  onSave: () => void
}

interface ActivityItem {
  id: string
  type: string
  title: string
  instrucciones: string
  nivel_dificultad: string
  imagen_url?: string | null
  audio_url?: string | null
  opciones?: { texto: string; correcta: boolean }[]
  respuesta_correcta?: string
  pregunta?: {
    enunciado?: string
    respuesta_esperada?: string
    palabras_distractoras?: string
    oraciones_contexto?: string
    tipo_respuesta_esperada?: string
  }
  sequence_steps?: { imagen_url: string | null; description: string }[]
}

const activityTypes = [
  { id: "image",      label: "Identificacion de imagenes", Icon: ImageIcon,   gradient: "from-blue-400 to-blue-600",    bg: "bg-blue-50 hover:bg-blue-100 border-blue-200",       text: "text-blue-800" },
  { id: "sound",      label: "Reconocimiento de sonidos",  Icon: Volume2,     gradient: "from-violet-400 to-violet-600", bg: "bg-violet-50 hover:bg-violet-100 border-violet-200", text: "text-violet-800" },
  { id: "sequence",   label: "Ordenar secuencias",         Icon: List,        gradient: "from-amber-400 to-orange-500",  bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",    text: "text-amber-800" },
  { id: "multiple",   label: "Opcion multiple",            Icon: HelpCircle,  gradient: "from-primary to-primary/80",   bg: "bg-primary/5 hover:bg-primary/10 border-primary/20", text: "text-primary" },
  { id: "short",      label: "Respuesta corta escrita",    Icon: PencilLine,  gradient: "from-emerald-400 to-teal-500", bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200", text: "text-emerald-800" },
  { id: "voice",      label: "Respuesta por voz",          Icon: Mic,         gradient: "from-rose-400 to-rose-600",    bg: "bg-rose-50 hover:bg-rose-100 border-rose-200",       text: "text-rose-800" },
  { id: "fill",       label: "Completar oracion",          Icon: AlignLeft,   gradient: "from-cyan-400 to-cyan-600",    bg: "bg-cyan-50 hover:bg-cyan-100 border-cyan-200",       text: "text-cyan-800" },
  { id: "wordsearch", label: "Sopa de letras",             Icon: Search,      gradient: "from-indigo-400 to-indigo-600", bg: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200", text: "text-indigo-800" },
]

const difficultyLevels = [
  { id: "facil",   label: "Fácil",  description: "Para comenzar" },
  { id: "medio",   label: "Medio",  description: "Un poco más difícil" },
  { id: "dificil", label: "Difícil", description: "Para avanzados" },
]

const dbToFormType: Record<string, string> = {
  identificacion:        "image",
  reconocimiento_sonidos:"sound",
  secuenciacion:         "sequence",
  seleccion_guiada:      "multiple",
  respuesta_corta:       "short",
  respuesta_oral:        "voice",
  completar_oracion:     "fill",
  sopa_letras:           "wordsearch",
}

export function EditLesson({ lessonId, onBack, onSave }: EditLessonProps) {
  const [title,              setTitle]              = useState("")
  const [instructions,       setInstructions]       = useState("")
  const [materialLectura,    setMaterialLectura]    = useState("")
  const [materialAudiovisual,setMaterialAudiovisual]= useState("")
  const [materialPdfUrl,     setMaterialPdfUrl]     = useState("")
  const [materialPdfTitulo,  setMaterialPdfTitulo]  = useState("")
  const [activities,         setActivities]         = useState<ActivityItem[]>([])
  const [isLoading,          setIsLoading]          = useState(false)
  const [isFetching,         setIsFetching]         = useState(true)
  const [error,              setError]              = useState("")

  // Glosario
  const [glosario,        setGlosario]        = useState<{ palabra: string; definicion: string }[]>([])
  const [glosarioPalabra, setGlosarioPalabra] = useState("")
  const [glosarioDefin,   setGlosarioDefin]   = useState("")
  const [glosarioError,   setGlosarioError]   = useState("")

  // Inline config state
  const [configuringType,    setConfiguringType]    = useState<{ type: string; label: string } | null>(null)
  const [editingActivityId,  setEditingActivityId]  = useState<string | null>(null)
  const [actInstrucciones,   setActInstrucciones]   = useState("")
  const [actDificultad,      setActDificultad]      = useState("facil")
  const [actOptions,         setActOptions]         = useState<{ id: string; text: string; isCorrect: boolean }[]>([
    { id: "1", text: "", isCorrect: false },
    { id: "2", text: "", isCorrect: false },
  ])
  const [actCorrectAnswer,        setActCorrectAnswer]        = useState("")
  const [actPalabrasSopa,         setActPalabrasSopa]         = useState<string[]>([])
  const [actPalabraInput,         setActPalabraInput]         = useState("")
  const [actVoiceEnunciado,       setActVoiceEnunciado]       = useState("")
  const [actPalabrasDistractoras, setActPalabrasDistractoras] = useState("")
  const [actFillEnunciado,        setActFillEnunciado]        = useState("")
  const [actFillContextSentences, setActFillContextSentences] = useState<string[]>([""])
  const [actSequenceCount,        setActSequenceCount]        = useState<3 | 4 | 5>(3)
  const [actSequenceSteps,        setActSequenceSteps]        = useState<{ file: File | null; previewUrl: string; existingUrl: string; description: string }[]>([])
  const seqInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const { speak, settings } = useAccessibility()
  const { user } = useAuth()

  // Image upload state
  const [actImageFile,        setActImageFile]        = useState<File | null>(null)
  const [actImagePreview,     setActImagePreview]     = useState("")
  const [actExistingImageUrl, setActExistingImageUrl] = useState("")
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (actImagePreview.startsWith("blob:")) URL.revokeObjectURL(actImagePreview)
    setActImageFile(file)
    setActImagePreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  const handleImageDelete = () => {
    if (actImagePreview.startsWith("blob:")) URL.revokeObjectURL(actImagePreview)
    setActImageFile(null); setActImagePreview(""); setActExistingImageUrl("")
  }

  useEffect(() => {
    if (!lessonId) { setError("No se encontró la lección."); setIsFetching(false); return }

    const fetchLesson = async () => {
      const [leccionFull, actividadesResult, glosarioResult] = await Promise.all([
        supabase.from("leccion")
          .select("titulo, contenido, material_lectura, material_audiovisual, material_pdf_url, material_pdf_titulo")
          .eq("id_leccion", lessonId).single(),
        supabase.from("actividad")
          .select("id_actividad, tipo, titulo, instrucciones, nivel_dificultad, orden, imagen_url, audio_url")
          .eq("id_leccion", lessonId).order("orden", { ascending: true }),
        supabase.from("glosario").select("palabra, definicion").eq("id_leccion", lessonId),
      ])

      const leccionResult = leccionFull.error
        ? await supabase.from("leccion").select("titulo, contenido").eq("id_leccion", lessonId).single()
        : leccionFull

      if (leccionResult.error || !leccionResult.data) { setError("No se pudo cargar la lección."); setIsFetching(false); return }

      setTitle(leccionResult.data.titulo)
      setInstructions(leccionResult.data.contenido ?? "")
      setMaterialLectura((leccionResult.data as any).material_lectura ?? "")
      setMaterialAudiovisual((leccionResult.data as any).material_audiovisual ?? "")
      setMaterialPdfUrl((leccionResult.data as any).material_pdf_url ?? "")
      setMaterialPdfTitulo((leccionResult.data as any).material_pdf_titulo ?? "")

      const diffFromInt = (n: number | null): string => {
        if (n === 1) return "facil"; if (n === 2) return "medio"; if (n === 3) return "dificil"; return "facil"
      }

      const acts: ActivityItem[] = (actividadesResult.data ?? []).map((a: any) => {
        const config = parseActivityConfig(a.instrucciones)
        return {
          id: a.id_actividad,
          type: dbToFormType[a.tipo] ?? a.tipo,
          title: activityTypes.find((t) => t.id === (dbToFormType[a.tipo] ?? a.tipo))?.label ?? a.titulo,
          instrucciones: a.instrucciones ?? "",
          nivel_dificultad: typeof a.nivel_dificultad === "number" ? diffFromInt(a.nivel_dificultad) : (a.nivel_dificultad ?? "facil"),
          imagen_url: a.imagen_url ?? null,
          audio_url: a.audio_url ?? null,
          opciones: config.opciones,
          respuesta_correcta: config.respuesta_correcta,
        }
      })

      const preguntaTypes = ["sound", "voice", "fill", "sequence"]
      const actsNeedingPregunta = acts.filter(a => preguntaTypes.includes(a.type))
      if (actsNeedingPregunta.length > 0) {
        const { data: preguntas } = await supabase.from("pregunta")
          .select("id_pregunta, id_actividad, enunciado, respuesta_esperada, palabras_distractoras, oraciones_contexto, orden, imagen_url")
          .in("id_actividad", actsNeedingPregunta.map(a => a.id))
          .order("orden", { ascending: true })

        for (const act of acts) {
          if (act.type === "sequence") {
            const steps = (preguntas ?? []).filter((p: any) => p.id_actividad === act.id)
            act.sequence_steps = steps.map((p: any) => ({ imagen_url: p.imagen_url ?? null, description: p.enunciado ?? "" }))
          } else if (["sound", "voice", "fill"].includes(act.type)) {
            const pq = (preguntas ?? []).find((p: any) => p.id_actividad === act.id)
            if (pq) {
              act.pregunta = {
                enunciado: pq.enunciado ?? undefined,
                respuesta_esperada: pq.respuesta_esperada ?? undefined,
                palabras_distractoras: pq.palabras_distractoras ?? undefined,
                oraciones_contexto: pq.oraciones_contexto ?? undefined,
              }
            }
          }
        }
      }

      setActivities(acts)
      setGlosario(glosarioResult.data ?? [])
      setIsFetching(false)
    }

    fetchLesson()
  }, [lessonId])

  const handleSelectType = (type: string, label: string) => {
    setEditingActivityId(null)
    setConfiguringType({ type, label })
    setActInstrucciones(""); setActDificultad("facil")
    setActOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
    setActCorrectAnswer(""); setActPalabrasSopa([]); setActPalabraInput("")
    setActVoiceEnunciado(""); setActPalabrasDistractoras("")
    setActFillEnunciado(""); setActFillContextSentences([""])
    handleImageDelete()
    if (type === "sequence") {
      const empty = () => ({ file: null as File | null, previewUrl: "", existingUrl: "", description: "" })
      setActSequenceCount(3); setActSequenceSteps([empty(), empty(), empty()])
    } else { setActSequenceSteps([]) }
  }

  const handleEditActivity = (activity: ActivityItem) => {
    const typeInfo = activityTypes.find((t) => t.id === activity.type)
    setEditingActivityId(activity.id)
    setConfiguringType({ type: activity.type, label: typeInfo?.label ?? activity.title })
    setActDificultad(activity.nivel_dificultad)
    if (actImagePreview.startsWith("blob:")) URL.revokeObjectURL(actImagePreview)
    setActImageFile(null); setActImagePreview("")
    setActExistingImageUrl(activity.imagen_url ?? "")
    setActPalabraInput("")

    const isPreguntaType = ["sound", "voice", "fill"].includes(activity.type)

    if (isPreguntaType) {
      setActInstrucciones(activity.instrucciones ?? "")
      setActOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
      setActPalabrasSopa([])

      if (activity.type === "voice") {
        setActVoiceEnunciado(activity.pregunta?.enunciado ?? "")
        setActCorrectAnswer(activity.pregunta?.respuesta_esperada?.split("|").map(s => s.trim()).filter(Boolean).join(", ") ?? "")
        setActPalabrasDistractoras(""); setActFillEnunciado(""); setActFillContextSentences([""])
      } else if (activity.type === "sound") {
        setActCorrectAnswer(activity.pregunta?.respuesta_esperada ?? "")
        setActPalabrasDistractoras(activity.pregunta?.palabras_distractoras?.split("|").filter(Boolean).join(", ") ?? "")
        setActVoiceEnunciado(""); setActFillEnunciado(""); setActFillContextSentences([""])
      } else {
        setActFillEnunciado(activity.pregunta?.enunciado ?? "")
        setActCorrectAnswer(activity.pregunta?.respuesta_esperada ?? "")
        setActPalabrasDistractoras(activity.pregunta?.palabras_distractoras?.split("|").filter(Boolean).join(", ") ?? "")
        const ctxArr = activity.pregunta?.oraciones_contexto?.split("|").filter(Boolean) ?? []
        setActFillContextSentences(ctxArr.length > 0 ? ctxArr : [""])
        setActVoiceEnunciado("")
      }
      setActSequenceSteps([])
    } else if (activity.type === "sequence") {
      setActInstrucciones(activity.instrucciones ?? "")
      setActOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
      setActCorrectAnswer(""); setActPalabrasSopa([])
      setActVoiceEnunciado(""); setActPalabrasDistractoras("")
      setActFillEnunciado(""); setActFillContextSentences([""])
      const empty = () => ({ file: null as File | null, previewUrl: "", existingUrl: "", description: "" })
      const cnt = Math.min(5, Math.max(3, activity.sequence_steps?.length ?? 3)) as 3 | 4 | 5
      setActSequenceCount(cnt)
      const steps = (activity.sequence_steps ?? []).slice(0, cnt).map(s => ({
        file: null as File | null, previewUrl: "", existingUrl: s.imagen_url ?? "", description: s.description,
      }))
      while (steps.length < cnt) steps.push(empty())
      setActSequenceSteps(steps)
    } else {
      const config = parseActivityConfig(activity.instrucciones)
      setActInstrucciones(config.instrucciones)
      if (config.opciones && config.opciones.length > 0) {
        setActOptions(config.opciones.map((o, i) => ({ id: String(i + 1), text: o.texto, isCorrect: o.correcta })))
      } else {
        setActOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
      }
      setActCorrectAnswer(config.respuesta_correcta ?? "")
      setActPalabrasSopa(config.palabras_sopa ?? [])
      setActVoiceEnunciado(""); setActPalabrasDistractoras("")
      setActFillEnunciado(""); setActFillContextSentences([""]); setActSequenceSteps([])
    }
  }

  const handleAddPalabraSopa = () => {
    const word = actPalabraInput.trim().toUpperCase()
    if (!word || actPalabrasSopa.includes(word)) return
    setActPalabrasSopa([...actPalabrasSopa, word]); setActPalabraInput("")
  }

  const handleRemovePalabraSopa = (word: string) =>
    setActPalabrasSopa(actPalabrasSopa.filter((w) => w !== word))

  const [actSaving,          setActSaving]          = useState(false)
  const [activityToRemove,   setActivityToRemove]   = useState<string | null>(null)

  const handleConfirmActivity = async () => {
    if (!configuringType) return
    setActSaving(true)

    let imagen_url: string | null | undefined = undefined
    if (actImageFile && user) {
      const ext = actImageFile.name.split(".").pop() ?? "jpg"
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from("actividades").upload(path, actImageFile, { upsert: true })
      if (uploadError) { setError("Error al subir la imagen: " + uploadError.message); setActSaving(false); return }
      const { data: urlData } = supabase.storage.from("actividades").getPublicUrl(path)
      imagen_url = urlData.publicUrl
    } else if (!actImageFile && !actExistingImageUrl) {
      imagen_url = null
    }

    let sequenceStepsPayload: { imagen_url: string | null; description: string }[] | undefined
    if (configuringType.type === "sequence" && actSequenceSteps.length > 0) {
      const uploaded: typeof sequenceStepsPayload = []
      for (let idx = 0; idx < actSequenceSteps.length; idx++) {
        const step = actSequenceSteps[idx]
        let url: string | null = step.existingUrl || null
        if (step.file && user) {
          const ext = step.file.name.split(".").pop() ?? "jpg"
          const path = `secuencias/${user.id}_${Date.now()}_${idx + 1}.${ext}`
          const { error: uploadError } = await supabase.storage.from("actividades").upload(path, step.file, { upsert: true })
          if (uploadError) { setError(`Error al subir imagen ${idx + 1}: ${uploadError.message}`); setActSaving(false); return }
          const { data: urlData } = supabase.storage.from("actividades").getPublicUrl(path)
          url = urlData.publicUrl
        }
        uploaded!.push({ imagen_url: url, description: step.description || `Paso ${idx + 1}` })
      }
      sequenceStepsPayload = uploaded
    }

    const typeIsSound    = configuringType.type === "sound"
    const typeIsVoice    = configuringType.type === "voice"
    const typeIsFill     = configuringType.type === "fill"
    const typeIsSequence = configuringType.type === "sequence"

    let serialized: string
    let preguntaData: ActivityItem["pregunta"] | undefined

    if (typeIsSound) {
      serialized = actInstrucciones
      const distractorasFormatted = actPalabrasDistractoras.split(",").map(w => w.trim()).filter(Boolean).join("|")
      preguntaData = { respuesta_esperada: actCorrectAnswer, palabras_distractoras: distractorasFormatted || undefined, tipo_respuesta_esperada: "texto" }
    } else if (typeIsVoice) {
      serialized = actInstrucciones
      const respuestaFormatted = actCorrectAnswer.split(",").map(s => s.trim()).filter(Boolean).join("|")
      preguntaData = { enunciado: actVoiceEnunciado, respuesta_esperada: respuestaFormatted, tipo_respuesta_esperada: "voz" }
    } else if (typeIsFill) {
      serialized = actInstrucciones
      const distractorasFormatted = actPalabrasDistractoras.split(",").map(w => w.trim()).filter(Boolean).join("|")
      const oracionesStr = actFillContextSentences.filter(s => s.trim()).join("|") || undefined
      preguntaData = { enunciado: actFillEnunciado, respuesta_esperada: actCorrectAnswer.trim(), palabras_distractoras: distractorasFormatted || undefined, oraciones_contexto: oracionesStr, tipo_respuesta_esperada: "texto" }
    } else if (typeIsSequence) {
      serialized = actInstrucciones
    } else {
      const showOpciones  = configuringType.type === "multiple" || configuringType.type === "image"
      const showRespuesta = configuringType.type === "short"
      const opciones      = showOpciones ? actOptions.filter(o => o.text.trim()).map(o => ({ texto: o.text, correcta: o.isCorrect })) : undefined
      const respuesta_correcta = showRespuesta && actCorrectAnswer ? actCorrectAnswer : undefined
      const palabras_sopa = configuringType.type === "wordsearch" && actPalabrasSopa.length > 0 ? actPalabrasSopa : undefined
      serialized = serializeActivityConfig({ instrucciones: actInstrucciones, opciones, respuesta_correcta, palabras_sopa })
    }

    const finalImageUrl = imagen_url !== undefined ? imagen_url : actExistingImageUrl || null

    const updatedActivity: ActivityItem = {
      id: editingActivityId ?? Date.now().toString(),
      type: configuringType.type,
      title: configuringType.label,
      instrucciones: serialized,
      nivel_dificultad: actDificultad,
      imagen_url: finalImageUrl,
      pregunta: preguntaData,
      sequence_steps: sequenceStepsPayload,
    }

    if (editingActivityId) {
      setActivities(activities.map((a) => a.id === editingActivityId ? updatedActivity : a))
      speak(`Actividad ${configuringType.label} actualizada`)
    } else {
      setActivities([...activities, updatedActivity])
      speak(`Actividad ${configuringType.label} agregada`)
    }
    setEditingActivityId(null); setConfiguringType(null); setActSaving(false)
  }

  const handleRemoveActivity = (id: string) => {
    setActivities(activities.filter((a) => a.id !== id))
    speak("Actividad eliminada")
  }

  const handleAddGlosario = () => {
    const pal = glosarioPalabra.trim().toLowerCase()
    const def = glosarioDefin.trim()
    if (!pal || !def) { setGlosarioError("Completa la palabra y la definición."); return }
    if (glosario.some((g) => g.palabra.toLowerCase() === pal)) { setGlosarioError("Esa palabra ya está en el glosario."); return }
    setGlosario([...glosario, { palabra: pal, definicion: def }])
    setGlosarioPalabra(""); setGlosarioDefin(""); setGlosarioError("")
  }

  const handleRemoveGlosario = (pal: string) =>
    setGlosario(glosario.filter((g) => g.palabra !== pal))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true); setError("")

    if (!lessonId) { setError("No se encontró la lección."); setIsLoading(false); return }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError("No hay sesión activa. Inicia sesión nuevamente."); setIsLoading(false); return }

      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({
          titulo: title,
          contenido: instructions,
          material_lectura: materialLectura || null,
          material_audiovisual: materialAudiovisual || null,
          material_pdf_url: materialPdfUrl || null,
          material_pdf_titulo: materialPdfTitulo || null,
          activities: activities.map((a) => ({
            type: a.type, title: a.title, instrucciones: a.instrucciones,
            nivel_dificultad: a.nivel_dificultad, imagen_url: a.imagen_url ?? null,
            audio_url: a.audio_url ?? null, pregunta: a.pregunta ?? null, steps: a.sequence_steps ?? null,
          })),
        }),
      })

      if (!response.ok) { const data = await response.json(); setError(data.error ?? "Error al guardar la lección"); setIsLoading(false); return }

      await supabase.from("glosario").delete().eq("id_leccion", lessonId)
      if (glosario.length > 0) {
        await supabase.from("glosario").insert(
          glosario.map((g) => ({ id_leccion: lessonId, palabra: g.palabra, definicion: g.definicion }))
        )
      }

      speak("Leccion actualizada exitosamente")
      onSave()
    } catch { setError("Error de conexión. Intenta de nuevo.") }

    setIsLoading(false)
  }

  if (isFetching) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
              <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-8 space-y-6" aria-busy="true" aria-label="Cargando lección">
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5 animate-pulse">
            <div className="h-4 w-40 rounded-md bg-muted" />
            <div className="h-10 w-full rounded-xl bg-muted" />
            <div className="h-20 w-full rounded-xl bg-muted" />
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-4 animate-pulse">
            <div className="h-4 w-36 rounded-md bg-muted" />
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-4">
                <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded-md bg-muted" />
                  <div className="h-3 w-1/4 rounded-md bg-muted" />
                </div>
                <div className="h-8 w-16 rounded-xl bg-muted shrink-0" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1 h-11 rounded-xl bg-muted animate-pulse" />
            <div className="flex-1 h-11 rounded-xl bg-muted animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  /* ── Activity config screen ── */
  if (configuringType) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-6">
            <button type="button"
              onClick={() => { setConfiguringType(null); setEditingActivityId(null) }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">
                {editingActivityId ? "Editar Actividad" : "Configurar Actividad"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{configuringType.label}</p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-6 py-8 space-y-5">
          {/* Image upload */}
          {configuringType?.type === "image" && (
            <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <ImageIcon className="w-4 h-4 text-primary" aria-hidden="true" />Imagen de la Actividad
              </h2>
              <p className="text-xs text-muted-foreground mb-3">Sube la imagen que el estudiante vera para identificar. Formatos: JPG, PNG, WebP.</p>
              <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImageSelect} />
              {(actImagePreview || actExistingImageUrl) ? (
                <div>
                  <img src={actImagePreview || actExistingImageUrl} alt="Vista previa"
                    className="w-full max-h-64 object-contain rounded-xl border border-border bg-muted mb-3" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => imageInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98]">
                      <Upload className="w-4 h-4" aria-hidden="true" />Cambiar imagen
                    </button>
                    <button type="button" onClick={handleImageDelete}
                      aria-label="Eliminar imagen"
                      className="flex items-center justify-center rounded-xl border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive hover:bg-destructive/10 active:scale-[0.98]">
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => imageInputRef.current?.click()}
                  className="w-full h-36 border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all">
                  <Upload className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium text-muted-foreground">Haz clic para subir una imagen</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG, WEBP o GIF</span>
                </button>
              )}
            </div>
          )}

          {/* Sound config */}
          {configuringType?.type === "sound" && (
            <>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Oracion Correcta</h2>
                <div className="flex gap-2">
                  <Input value={actCorrectAnswer} onChange={(e) => setActCorrectAnswer(e.target.value)}
                    placeholder="Ej: Los gatos son bonitos" className="border-border flex-1" aria-label="Oración correcta" />
                  <button type="button"
                    onClick={() => actCorrectAnswer.trim() && speak(actCorrectAnswer.trim())}
                    disabled={!actCorrectAnswer.trim()} aria-label="Escuchar oracion"
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted active:scale-[0.98] disabled:opacity-50 shrink-0">
                    <Volume2 className="w-4 h-4" aria-hidden="true" />Escuchar
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">El sistema reproducira esta oracion en voz alta al alumno usando el sintetizador de voz del navegador.</p>
                {actCorrectAnswer.trim() && (
                  <div className="flex flex-wrap gap-1.5 p-3 bg-muted rounded-xl mt-3">
                    {actCorrectAnswer.trim().split(/\s+/).map((word, i) => (
                      <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">{word}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  Palabras Distractoras <span className="text-muted-foreground font-normal">(opcional)</span>
                </h2>
                <Input value={actPalabrasDistractoras} onChange={(e) => setActPalabrasDistractoras(e.target.value)}
                  placeholder="Ej: nube, famoso, mesa" className="border-border" aria-label="Palabras distractoras separadas por comas" />
                <p className="text-xs text-muted-foreground mt-2">Separa las palabras con <strong>comas</strong>. Se mezclaran con la oracion para aumentar la dificultad.</p>
                {actPalabrasDistractoras.trim() && (
                  <div className="flex flex-wrap gap-1.5 p-3 bg-muted rounded-xl mt-3">
                    {actPalabrasDistractoras.split(",").filter(w => w.trim()).map((word, i) => (
                      <span key={i} className="px-2.5 py-1 bg-destructive/10 text-destructive rounded-lg text-xs font-medium">{word.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Voice config */}
          {configuringType?.type === "voice" && (
            <>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Pregunta</h2>
                <div className="flex gap-2">
                  <Input value={actVoiceEnunciado} onChange={(e) => setActVoiceEnunciado(e.target.value)}
                    placeholder="Ej: ¿De que color es el cielo?" className="border-border flex-1" aria-label="Pregunta de la actividad" />
                  <button type="button"
                    onClick={() => actVoiceEnunciado.trim() && speak(actVoiceEnunciado.trim())}
                    disabled={!actVoiceEnunciado.trim()} aria-label="Escuchar pregunta"
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted active:scale-[0.98] disabled:opacity-50 shrink-0">
                    <Volume2 className="w-4 h-4" aria-hidden="true" />Escuchar
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Esta pregunta se mostrara y se leera en voz alta al alumno.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Respuesta Correcta</h2>
                <Input value={actCorrectAnswer} onChange={(e) => setActCorrectAnswer(e.target.value)}
                  placeholder="Ej: azul, celeste, azul claro" className="border-border" aria-label="Respuestas correctas separadas por comas" />
                <p className="text-xs text-muted-foreground mt-2">Separa con <strong>comas</strong> si hay varias respuestas validas. Se acepta cualquiera.</p>
                {actCorrectAnswer.trim() && (
                  <div className="flex flex-wrap gap-1.5 p-3 bg-muted rounded-xl mt-3">
                    {actCorrectAnswer.split(",").filter(s => s.trim()).map((ans, i) => (
                      <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">{ans.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Sequence config */}
          {configuringType?.type === "sequence" && (
            <>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h2 id="seq-count-label" className="text-sm font-semibold text-foreground mb-3">¿Cuantas imagenes?</h2>
                <div role="group" aria-labelledby="seq-count-label" className="grid grid-cols-3 gap-3">
                  {([3, 4, 5] as const).map((n) => (
                    <button key={n} type="button"
                      onClick={() => {
                        setActSequenceCount(n)
                        const cur = [...actSequenceSteps]
                        while (cur.length < n) cur.push({ file: null, previewUrl: "", existingUrl: "", description: "" })
                        setActSequenceSteps(cur.slice(0, n))
                      }}
                      className={`rounded-xl border py-3 text-center transition-all active:scale-[0.98] ${actSequenceCount === n
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-background hover:bg-muted"}`}
                      aria-pressed={actSequenceCount === n}>
                      <span className="text-xl font-bold text-foreground block">{n}</span>
                      <span className="text-xs text-muted-foreground">imagenes</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-1">Imagenes de la secuencia</h2>
                <p className="text-xs text-muted-foreground mb-4">Sube las imagenes <strong>en el orden correcto</strong>. El alumno debera reordenarlas.</p>
                <div className="space-y-4">
                  {actSequenceSteps.map((step, idx) => (
                    <div key={idx} className="rounded-xl border border-border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">{idx + 1}</span>
                        <span className="text-sm font-semibold text-foreground">Paso {idx + 1}</span>
                      </div>
                      {(step.previewUrl || step.existingUrl) ? (
                        <div className="space-y-2">
                          <img src={step.previewUrl || step.existingUrl} alt={`Paso ${idx + 1}`}
                            className="w-full max-h-40 object-contain rounded-xl border border-border bg-muted" />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => seqInputRefs.current[idx]?.click()}
                              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted active:scale-[0.98]">
                              <Upload className="w-3.5 h-3.5" aria-hidden="true" />Cambiar
                            </button>
                            <button type="button" aria-label="Eliminar imagen"
                              onClick={() => {
                                const steps = [...actSequenceSteps]
                                if (steps[idx].previewUrl.startsWith("blob:")) URL.revokeObjectURL(steps[idx].previewUrl)
                                steps[idx] = { ...steps[idx], file: null, previewUrl: "", existingUrl: "" }
                                setActSequenceSteps(steps)
                              }}
                              className="flex items-center justify-center rounded-xl border border-destructive/30 bg-card px-2 py-1.5 text-destructive hover:bg-destructive/10 active:scale-[0.98]">
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => seqInputRefs.current[idx]?.click()}
                          className="w-full h-28 border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-primary hover:bg-primary/5 transition-colors">
                          <Upload className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
                          <p className="text-xs font-medium text-muted-foreground">Subir imagen del paso {idx + 1}</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP</p>
                        </button>
                      )}
                      <input ref={(el) => { seqInputRefs.current[idx] = el }}
                        type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]; if (!file) return
                          const steps = [...actSequenceSteps]
                          if (steps[idx].previewUrl.startsWith("blob:")) URL.revokeObjectURL(steps[idx].previewUrl)
                          steps[idx] = { ...steps[idx], file, previewUrl: URL.createObjectURL(file) }
                          setActSequenceSteps(steps); e.target.value = ""
                        }} />
                      <Input value={step.description}
                        onChange={(e) => {
                          const steps = [...actSequenceSteps]
                          steps[idx] = { ...steps[idx], description: e.target.value }
                          setActSequenceSteps(steps)
                        }}
                        placeholder={`Descripcion del paso ${idx + 1} (opcional)`} className="border-border" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Fill config */}
          {configuringType?.type === "fill" && (
            <>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  Oraciones de Contexto <span className="text-muted-foreground font-normal">(opcional)</span>
                </h2>
                <div className="space-y-2">
                  {actFillContextSentences.map((sentence, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input value={sentence}
                        onChange={(e) => {
                          const next = [...actFillContextSentences]; next[idx] = e.target.value
                          setActFillContextSentences(next)
                        }}
                        placeholder="Ej: Yo tengo tres mascotas." className="border-border flex-1"
                        aria-label={`Oración de contexto ${idx + 1}`} />
                      <button type="button"
                        onClick={() => {
                          if (actFillContextSentences.length > 1) {
                            setActFillContextSentences(actFillContextSentences.filter((_, i) => i !== idx))
                          } else { setActFillContextSentences([""])  }
                        }}
                        disabled={actFillContextSentences.length === 1 && !sentence.trim()} aria-label="Eliminar oracion"
                        className="flex items-center justify-center rounded-xl border border-destructive/30 bg-card px-2.5 py-2 text-destructive hover:bg-destructive/10 active:scale-[0.98] disabled:opacity-50 shrink-0">
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setActFillContextSentences([...actFillContextSentences, ""])}
                    className="w-full rounded-xl border border-dashed border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted active:scale-[0.98] flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" aria-hidden="true" />Agregar oracion de ejemplo
                  </button>
                  <p className="text-xs text-muted-foreground">Estas oraciones aparecen como ejemplos para que el alumno comprenda el patron antes de completar.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Oracion a Completar</h2>
                <Input value={actFillEnunciado} onChange={(e) => setActFillEnunciado(e.target.value)}
                  placeholder="Ej: Yo tengo tres ___." className="border-border" aria-label="Oración a completar con espacio en blanco" />
                <p className="text-xs text-muted-foreground mt-2">Usa <strong>___</strong> (tres guiones bajos) para marcar el espacio en blanco.</p>
                {actFillEnunciado.includes("___") && (
                  <div className="p-3 bg-muted rounded-xl text-sm font-medium text-foreground mt-3">
                    Vista previa:{" "}
                    {actFillEnunciado.split("___").map((part, i) => (
                      <span key={i}>{part}
                        {i < actFillEnunciado.split("___").length - 1 && (
                          <span className="inline-block min-w-[60px] mx-1 border-b-2 border-dashed border-primary text-primary">
                            {actCorrectAnswer.trim() || "___"}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Respuesta Correcta</h2>
                <Input value={actCorrectAnswer} onChange={(e) => setActCorrectAnswer(e.target.value)}
                  placeholder="Ej: gatos" className="border-border" aria-label="Palabra correcta para completar el espacio" />
                <p className="text-xs text-muted-foreground mt-2">La palabra exacta que completa el espacio en blanco.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  Palabras Distractoras <span className="text-muted-foreground font-normal">(opciones incorrectas)</span>
                </h2>
                <Input value={actPalabrasDistractoras} onChange={(e) => setActPalabrasDistractoras(e.target.value)}
                  placeholder="Ej: gato, perros, pez" className="border-border" aria-label="Palabras distractoras separadas por comas" />
                <p className="text-xs text-muted-foreground mt-2">Separa con <strong>comas</strong>. Se mezclaran con la respuesta correcta como opciones.</p>
                {actPalabrasDistractoras.trim() && (
                  <div className="flex flex-wrap gap-1.5 p-3 bg-muted rounded-xl mt-3">
                    {actPalabrasDistractoras.split(",").filter(w => w.trim()).map((word, i) => (
                      <span key={i} className="px-2.5 py-1 bg-destructive/10 text-destructive rounded-lg text-xs font-medium">{word.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Wordsearch config */}
          {configuringType?.type === "wordsearch" && (
            <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-primary" aria-hidden="true" />Palabras a Encontrar
              </h2>
              <p className="text-xs text-muted-foreground mb-3">Agrega las palabras que los estudiantes deben encontrar. Se convertiran a mayusculas automaticamente. Maximo 10 palabras.</p>
              <div className="flex gap-2 mb-3">
                <Input value={actPalabraInput} onChange={(e) => setActPalabraInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPalabraSopa())}
                  placeholder="Ej: GATO" className="border-border flex-1" maxLength={15}
                  aria-label="Palabra para agregar a la sopa de letras" />
                <button type="button" onClick={handleAddPalabraSopa}
                  disabled={actPalabrasSopa.length >= 10 || !actPalabraInput.trim()}
                  aria-label="Agregar palabra"
                  className="flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-primary-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              {actPalabrasSopa.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {actPalabrasSopa.map((word) => (
                    <span key={word} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-lg border border-primary/30 text-sm">
                      {word}
                      <button type="button" onClick={() => handleRemovePalabraSopa(word)}
                        className="text-primary hover:text-destructive transition-colors" aria-label={`Eliminar ${word}`}>×</button>
                    </span>
                  ))}
                </div>
              )}
              {actPalabrasSopa.length === 0 && <p className="text-xs text-muted-foreground italic">Agrega al menos una palabra.</p>}
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Instrucciones de la Actividad</h2>
            <textarea value={actInstrucciones} onChange={(e) => setActInstrucciones(e.target.value)}
              placeholder="Escribe instrucciones claras y simples. Ej: Mira la imagen y selecciona la respuesta correcta."
              className="w-full min-h-[90px] p-3 text-sm border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              aria-label="Instrucciones de la actividad" />
          </div>

          {/* Options */}
          {(configuringType?.type === "multiple" || configuringType?.type === "image") && (
            <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Opciones de Respuesta</h2>
              <div className="space-y-3">
                {actOptions.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => setActOptions(actOptions.map((o) => ({ ...o, isCorrect: o.id === option.id })))}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold transition-all ${option.isCorrect
                        ? "bg-green-600 border-green-600 text-white"
                        : "border-border hover:border-primary"}`}
                      aria-label={option.isCorrect ? "Respuesta correcta" : "Marcar como correcta"}>
                      {option.isCorrect ? "✓" : String.fromCharCode(65 + index)}
                    </button>
                    <Input value={option.text}
                      onChange={(e) => setActOptions(actOptions.map((o) => o.id === option.id ? { ...o, text: e.target.value } : o))}
                      placeholder={`Opcion ${index + 1}`} className="border-border flex-1"
                      aria-label={`Texto de la opción ${index + 1}`} />
                    {actOptions.length > 2 && (
                      <button type="button" onClick={() => setActOptions(actOptions.filter((o) => o.id !== option.id))}
                        aria-label="Eliminar opcion"
                        className="flex items-center justify-center rounded-xl border border-destructive/30 bg-card p-2 text-destructive hover:bg-destructive/10 active:scale-[0.98]">
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setActOptions([...actOptions, { id: Date.now().toString(), text: "", isCorrect: false }])}
                  className="w-full rounded-xl border border-dashed border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted active:scale-[0.98] flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" aria-hidden="true" />Agregar Opcion
                </button>
                <p className="text-xs text-muted-foreground">Haz clic en la letra para marcar la respuesta correcta</p>
              </div>
            </div>
          )}

          {/* Short answer */}
          {configuringType?.type === "short" && (
            <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Respuesta Correcta</h2>
              <Input value={actCorrectAnswer} onChange={(e) => setActCorrectAnswer(e.target.value)}
                placeholder="Escribe la respuesta esperada" className="border-border" aria-label="Respuesta correcta esperada" />
              <p className="text-xs text-muted-foreground mt-2">El sistema comparara la respuesta del estudiante con esta</p>
            </div>
          )}

          {/* Difficulty */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 id="dificultad-label" className="text-sm font-semibold text-foreground mb-3">Nivel de Dificultad</h2>
            <div role="group" aria-labelledby="dificultad-label" className="grid grid-cols-3 gap-2">
              {difficultyLevels.map((level) => (
                <button key={level.id} type="button" onClick={() => setActDificultad(level.id)}
                  className={`rounded-xl border px-3 py-3 text-center transition-all active:scale-[0.98] ${actDificultad === level.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border bg-background hover:bg-muted"}`}
                  aria-pressed={actDificultad === level.id}>
                  <p className={`text-sm font-bold ${actDificultad === level.id ? "text-primary" : "text-foreground"}`}>{level.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{level.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button type="button" onClick={() => { setConfiguringType(null); setEditingActivityId(null) }}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]">
              Cancelar
            </button>
            <button type="button" onClick={handleConfirmActivity} disabled={actSaving}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {actSaving ? "Guardando..." : editingActivityId ? (
                <><Save className="w-4 h-4" aria-hidden="true" />Guardar Cambios</>
              ) : (
                <><Plus className="w-4 h-4" aria-hidden="true" />Agregar Actividad</>
              )}
            </button>
          </div>
        </main>
      </div>
    )
  }

  /* ── Main form ── */
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <h1 className="text-base font-bold text-foreground">Editar Lección</h1>
          </div>
          {settings.voiceEnabled && (
            <button type="button"
              onClick={() => speak("Editar leccion. Modifica el titulo, las instrucciones y las actividades. Luego presiona Guardar Cambios.")}
              aria-label="Escuchar instrucciones de la sección"
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline" aria-hidden="true">Escuchar</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Basic Info */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" aria-hidden="true" />Información de la Lección
            </h2>
            <div className="space-y-1.5">
              <label htmlFor="lesson-title" className="text-sm font-semibold text-foreground block">Título de la lección</label>
              <Input id="lesson-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Numeros del 1 al 10" className="border-border" required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lesson-instructions" className="text-sm font-semibold text-foreground block">Instrucciones para el estudiante</label>
              <textarea id="lesson-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)}
                placeholder="Escribe instrucciones claras y simples para los estudiantes"
                className="w-full min-h-[90px] p-3 text-sm border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" required />
            </div>
          </div>

          {/* Material de Lectura */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />
              Material de Lectura <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Texto de lectura que los estudiantes verán antes de las actividades. Sirve como base para las preguntas.</p>
            <label htmlFor="material-lectura" className="sr-only">Texto de lectura para los estudiantes</label>
            <textarea id="material-lectura" value={materialLectura} onChange={(e) => setMaterialLectura(e.target.value)}
              placeholder="Escribe aquí el texto de lectura para los estudiantes..."
              className="w-full min-h-[140px] p-3 text-sm border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          {/* Glosario */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <BookMarked className="w-4 h-4 text-primary" aria-hidden="true" />
              Glosario de palabras clave <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Las palabras del glosario aparecerán resaltadas en el material de lectura. Los estudiantes podrán ver su definición al hacer clic.</p>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap mb-3">
              <Input value={glosarioPalabra} onChange={(e) => setGlosarioPalabra(e.target.value)}
                placeholder="Palabra" aria-label="Palabra del glosario" className="border-border flex-1 min-w-[120px]"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddGlosario())} />
              <Input value={glosarioDefin} onChange={(e) => setGlosarioDefin(e.target.value)}
                placeholder="Definición" aria-label="Definición de la palabra" className="border-border flex-[2] min-w-[160px]"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddGlosario())} />
              <button type="button" onClick={handleAddGlosario}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] shrink-0">
                <Plus className="w-4 h-4" aria-hidden="true" />Agregar
              </button>
            </div>
            {glosarioError && <p className="text-xs text-destructive mb-2" role="alert">{glosarioError}</p>}
            {glosario.length > 0 && (
              <ul className="space-y-1.5 list-none p-0">
                {glosario.map((g) => (
                  <li key={g.palabra} className="flex items-start justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
                    <div className="flex items-start gap-2 min-w-0">
                      <Pencil className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="text-sm font-semibold text-foreground capitalize">{g.palabra}</span>
                      <span className="text-muted-foreground">—</span>
                      <span className="text-sm text-foreground leading-snug">{g.definicion}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveGlosario(g.palabra)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      aria-label={`Eliminar ${g.palabra} del glosario`}>
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {glosario.length === 0 && <p className="text-xs text-muted-foreground italic">No hay palabras en el glosario todavía.</p>}
          </div>

          {/* Material Audiovisual */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <Youtube className="w-4 h-4 text-red-500" aria-hidden="true" />
              Material Audiovisual <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Pega el enlace de un video de YouTube. Los estudiantes podrán verlo en la lección antes de las actividades.</p>
            <label htmlFor="material-audiovisual" className="sr-only">Enlace del video de YouTube</label>
            <Input id="material-audiovisual" type="url" value={materialAudiovisual} onChange={(e) => setMaterialAudiovisual(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." className="border-border" />
            {materialAudiovisual && <p className="text-xs text-muted-foreground mt-2">El video se mostrará embebido en la lección del estudiante.</p>}
          </div>

          {/* Material PDF */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <Paperclip className="w-4 h-4 text-primary" aria-hidden="true" />
              Material Adjunto (PDF) <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Puedes pegar un enlace público de PDF (Supabase Storage, Drive público, etc.) para que el estudiante lo abra desde la lección.</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="material-pdf-titulo" className="text-sm font-semibold text-foreground block">Título del material</label>
                <Input id="material-pdf-titulo" type="text" value={materialPdfTitulo} onChange={(e) => setMaterialPdfTitulo(e.target.value)}
                  placeholder="Ej: Guía de trabajo - Unidad 1" className="border-border" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="material-pdf-url" className="text-sm font-semibold text-foreground block">Enlace del PDF</label>
                <Input id="material-pdf-url" type="url" value={materialPdfUrl} onChange={(e) => setMaterialPdfUrl(e.target.value)}
                  placeholder="https://.../archivo.pdf" className="border-border" />
              </div>
            </div>
          </div>

          {/* Activity Types */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <Plus className="w-4 h-4 text-primary" aria-hidden="true" />Agregar Actividades
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Selecciona un tipo para configurar y agregar la actividad</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activityTypes.map((type) => (
                <button key={type.id} type="button" onClick={() => handleSelectType(type.id, type.label)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-muted active:scale-[0.98]">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${type.gradient}`} aria-hidden="true">
                    <type.Icon className="w-4 h-4 text-white" />
                  </span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activities List */}
          {activities.length > 0 && (
            <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Actividades ({activities.length})</h2>
              <ul className="space-y-2 list-none p-0">
                {activities.map((activity, index) => {
                  const parsed = parseActivityConfig(activity.instrucciones)
                  const preview = parsed.instrucciones || activity.title
                  const diffLabel = difficultyLevels.find((d) => d.id === activity.nivel_dificultad)?.label ?? activity.nivel_dificultad
                  return (
                    <li key={activity.id}
                      className="flex items-center justify-between rounded-xl bg-muted px-3 py-3 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                        {(() => { const t = activityTypes.find(t => t.id === activity.type); return t ? (
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${t.gradient}`} aria-hidden="true">
                            <t.Icon className="w-3.5 h-3.5 text-white" />
                          </span>
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary shrink-0">{index + 1}</span>
                        )})()}
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-foreground block truncate">{activity.title}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">{preview} · {diffLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" onClick={() => handleEditActivity(activity)}
                          aria-label={`Editar ${activity.title}`}
                          className="flex items-center justify-center rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors">
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => setActivityToRemove(activity.id)}
                          aria-label={`Eliminar ${activity.title}`}
                          className="flex items-center justify-center rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-destructive font-medium" role="alert">{error}</p>}

          <AlertDialog open={activityToRemove !== null} onOpenChange={(open) => { if (!open) setActivityToRemove(null) }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar esta actividad?</AlertDialogTitle>
                <AlertDialogDescription>
                  La actividad será eliminada de la lección. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => { if (activityToRemove) handleRemoveActivity(activityToRemove); setActivityToRemove(null) }}
                >
                  Sí, eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={onBack}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading || !title || !instructions}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Save className="w-4 h-4" aria-hidden="true" />
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
