"use client"

import { useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Save, Volume2, FileText, Plus, Trash2, GripVertical, ChevronLeft, BookOpen, Youtube, Search, Paperclip, BookMarked, Pencil, Upload, ImageIcon, List, HelpCircle, PencilLine, Mic, AlignLeft, X } from "lucide-react"
import { parseActivityConfig, serializeActivityConfig } from "@/lib/activity-config"
import { ActivityConfigForm, ActivityOption, SequenceStep, getActivitySpeakText } from "@/components/teacher/activity-config-form"

interface CreateLessonProps {
  courseId: string | null
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
  { id: "image",      label: "Identificacion de imagenes", Icon: ImageIcon,   gradient: "from-blue-400 to-blue-600" },
  { id: "sound",      label: "Reconocimiento de sonidos",  Icon: Volume2,     gradient: "from-violet-400 to-violet-600" },
  { id: "sequence",   label: "Ordenar secuencias",         Icon: List,        gradient: "from-amber-400 to-orange-500" },
  { id: "multiple",   label: "Opcion multiple",            Icon: HelpCircle,  gradient: "from-primary to-primary/80" },
  { id: "short",      label: "Respuesta corta escrita",    Icon: PencilLine,  gradient: "from-emerald-400 to-teal-500" },
  { id: "voice",      label: "Respuesta por voz",          Icon: Mic,         gradient: "from-rose-400 to-rose-600" },
  { id: "fill",       label: "Completar oracion",          Icon: AlignLeft,   gradient: "from-cyan-400 to-cyan-600" },
  { id: "wordsearch", label: "Sopa de letras",             Icon: Search,      gradient: "from-indigo-400 to-indigo-600" },
]

const difficultyLevels = [
  { id: "facil",   label: "Fácil",  description: "Para comenzar" },
  { id: "medio",   label: "Medio",  description: "Un poco más difícil" },
  { id: "dificil", label: "Difícil", description: "Para avanzados" },
]

export function CreateLesson({ courseId, onBack, onSave }: CreateLessonProps) {
  const [title,              setTitle]              = useState("")
  const [instructions,       setInstructions]       = useState("")
  const [materialLectura,    setMaterialLectura]    = useState("")
  const [materialAudiovisual,setMaterialAudiovisual]= useState("")
  const [materialPdfUrl,     setMaterialPdfUrl]     = useState("")
  const [materialPdfTitulo,  setMaterialPdfTitulo]  = useState("")
  const [materialImagenFile,    setMaterialImagenFile]    = useState<File | null>(null)
  const [materialImagenPreview, setMaterialImagenPreview] = useState("")
  const [imagenExpanded,        setImagenExpanded]        = useState(false)
  const [activities,         setActivities]         = useState<ActivityItem[]>([])
  const [isLoading,          setIsLoading]          = useState(false)
  const [error,              setError]              = useState("")

  // Inline config state
  const [configuringType,    setConfiguringType]    = useState<{ type: string; label: string } | null>(null)
  const [editingActivityId,  setEditingActivityId]  = useState<string | null>(null)
  const [actInstrucciones,   setActInstrucciones]   = useState("")
  const [actDificultad,      setActDificultad]      = useState("facil")
  const [actOptions,         setActOptions]         = useState<ActivityOption[]>([
    { id: "1", text: "", isCorrect: false },
    { id: "2", text: "", isCorrect: false },
  ])
  const [actCorrectAnswer,       setActCorrectAnswer]       = useState("")
  const [actPalabrasSopa,        setActPalabrasSopa]        = useState<string[]>([])
  const [actPalabraInput,        setActPalabraInput]        = useState("")
  const [actVoiceEnunciado,      setActVoiceEnunciado]      = useState("")
  const [actPalabrasDistractoras,setActPalabrasDistractoras]= useState("")
  const [actFillEnunciado,       setActFillEnunciado]       = useState("")
  const [actFillContextSentences,setActFillContextSentences]= useState<string[]>([""])
  const [actSequenceCount,       setActSequenceCount]       = useState<3 | 4 | 5>(3)
  const [actSequenceSteps,       setActSequenceSteps]       = useState<SequenceStep[]>([])
  const seqInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Glosario
  interface GlosarioItem { palabra: string; definicion: string }
  const [glosario,        setGlosario]        = useState<GlosarioItem[]>([])
  const [glosarioPalabra, setGlosarioPalabra] = useState("")
  const [glosarioDefin,   setGlosarioDefin]   = useState("")
  const [glosarioError,   setGlosarioError]   = useState("")

  const handleAddGlosario = () => {
    const pal = glosarioPalabra.trim().toLowerCase()
    const def = glosarioDefin.trim()
    if (!pal || !def) { setGlosarioError("Escribe la palabra y la definición."); return }
    if (glosario.some((g) => g.palabra === pal)) { setGlosarioError("Esa palabra ya está en el glosario."); return }
    setGlosario([...glosario, { palabra: pal, definicion: def }])
    setGlosarioPalabra(""); setGlosarioDefin(""); setGlosarioError("")
  }

  const handleRemoveGlosario = (pal: string) =>
    setGlosario(glosario.filter((g) => g.palabra !== pal))

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
    setActivityDirty(true)
    e.target.value = ""
  }

  const handleImageDelete = () => {
    if (actImagePreview.startsWith("blob:")) URL.revokeObjectURL(actImagePreview)
    setActImageFile(null); setActImagePreview(""); setActExistingImageUrl("")
    setActivityDirty(true)
  }

  const handleSelectType = (type: string, label: string) => {
    setEditingActivityId(null)
    setConfiguringType({ type, label })
    setAttemptedSave(false)
    setActivityDirty(false)
    setShowExitConfirm(false)
    setActInstrucciones(""); setActDificultad("facil")
    setActOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
    setActCorrectAnswer(""); setActPalabrasSopa([]); setActPalabraInput("")
    setActVoiceEnunciado(""); setActPalabrasDistractoras("")
    setActFillEnunciado(""); setActFillContextSentences([""])
    handleImageDelete()
    if (type === "sequence") {
      const empty = () => ({ file: null as File | null, previewUrl: "", existingUrl: "", description: "" })
      setActSequenceCount(3)
      setActSequenceSteps([empty(), empty(), empty()])
    } else {
      setActSequenceSteps([])
    }
  }

  const handleEditActivity = (activity: ActivityItem) => {
    const typeInfo = activityTypes.find((t) => t.id === activity.type)
    setEditingActivityId(activity.id)
    setConfiguringType({ type: activity.type, label: typeInfo?.label ?? activity.title })
    setAttemptedSave(false)
    setActivityDirty(false)
    setShowExitConfirm(false)
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
        setActCorrectAnswer(
          activity.pregunta?.respuesta_esperada?.split("|").map(s => s.trim()).filter(Boolean).join(", ") ?? ""
        )
        setActPalabrasDistractoras(""); setActFillEnunciado(""); setActFillContextSentences([""])
      } else if (activity.type === "sound") {
        setActCorrectAnswer(activity.pregunta?.respuesta_esperada ?? "")
        setActPalabrasDistractoras(
          activity.pregunta?.palabras_distractoras?.split("|").filter(Boolean).join(", ") ?? ""
        )
        setActVoiceEnunciado(""); setActFillEnunciado(""); setActFillContextSentences([""])
      } else {
        // fill
        setActFillEnunciado(activity.pregunta?.enunciado ?? "")
        setActCorrectAnswer(activity.pregunta?.respuesta_esperada ?? "")
        setActPalabrasDistractoras(
          activity.pregunta?.palabras_distractoras?.split("|").filter(Boolean).join(", ") ?? ""
        )
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
      const empty = (): SequenceStep => ({ file: null, previewUrl: "", existingUrl: "", description: "" })
      const steps: SequenceStep[] = (activity.sequence_steps ?? []).map(s => ({
        file: null,
        previewUrl: "",
        existingUrl: s.imagen_url ?? "",
        description: s.description,
      }))
      setActSequenceCount(Math.min(5, Math.max(3, steps.length)) as 3 | 4 | 5)
      setActSequenceSteps(steps.length > 0 ? steps : [empty(), empty(), empty()])
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
    setActPalabrasSopa([...actPalabrasSopa, word])
    setActPalabraInput("")
  }

  const handleRemovePalabraSopa = (word: string) =>
    setActPalabrasSopa(actPalabrasSopa.filter((w) => w !== word))

  const [actSaving,             setActSaving]             = useState(false)
  const [attemptedSave,         setAttemptedSave]         = useState(false)
  const [activityDirty,         setActivityDirty]         = useState(false)
  const [showExitConfirm,       setShowExitConfirm]       = useState(false)
  const [lessonDirty,           setLessonDirty]           = useState(false)
  const [showLessonExitConfirm, setShowLessonExitConfirm] = useState(false)

  const handleConfirmActivity = async () => {
    if (!configuringType) return
    setAttemptedSave(true)
    const showsOptions = configuringType.type === "multiple" || configuringType.type === "image"
    if (configuringType.type === "image" && !actImagePreview && !actExistingImageUrl) return
    if (showsOptions && actOptions.some(o => !o.text.trim())) return
    if (showsOptions && !actOptions.some(o => o.isCorrect)) return
    if (configuringType.type === "sequence" && actSequenceSteps.filter(s => s.previewUrl || s.existingUrl).length < 3) return
    if (configuringType.type === "fill" && (!actFillEnunciado.trim() || !actFillEnunciado.includes("___") || !actCorrectAnswer.trim())) return
    if (configuringType.type === "sound" && !actCorrectAnswer.trim()) return
    if (configuringType.type === "voice" && (!actVoiceEnunciado.trim() || !actCorrectAnswer.trim())) return
    if (configuringType.type === "wordsearch" && actPalabrasSopa.length === 0) return
    if (configuringType.type === "short" && !actCorrectAnswer.trim()) return
    const typeNeedsInstr = !["sound", "voice", "fill", "sequence", "wordsearch"].includes(configuringType.type)
    if (typeNeedsInstr && !actInstrucciones.trim()) return
    setActSaving(true)

    let imagen_url: string | null | undefined = undefined
    if (actImageFile && user) {
      const ext = actImageFile.name.split(".").pop() ?? "jpg"
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("actividades").upload(path, actImageFile, { upsert: true })
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
          const { error: uploadError } = await supabase.storage
            .from("actividades").upload(path, step.file, { upsert: true })
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
      const showOpciones   = configuringType.type === "multiple" || configuringType.type === "image"
      const showRespuesta  = configuringType.type === "short"
      const opciones       = showOpciones ? actOptions.filter(o => o.text.trim()).map(o => ({ texto: o.text, correcta: o.isCorrect })) : undefined
      const respuesta_correcta = showRespuesta && actCorrectAnswer ? actCorrectAnswer : undefined
      const palabras_sopa  = configuringType.type === "wordsearch" && actPalabrasSopa.length > 0 ? actPalabrasSopa : undefined
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true); setError("")

    if (!courseId) { setError("No se encontró el curso. Vuelve a seleccionar un curso."); setIsLoading(false); return }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError("No hay sesión activa. Inicia sesión nuevamente."); setIsLoading(false); return }

      let materialImagenUrl: string | null = null
      if (materialImagenFile) {
        const ext = materialImagenFile.name.split(".").pop()
        const path = `lectura/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from("lecciones").upload(path, materialImagenFile, { upsert: true })
        if (uploadError) { setError("Error al subir la imagen: " + uploadError.message); setIsLoading(false); return }
        const { data: urlData } = supabase.storage.from("lecciones").getPublicUrl(path)
        materialImagenUrl = urlData.publicUrl
      }

      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({
          courseId,
          titulo: title,
          contenido: instructions,
          material_lectura: materialLectura || null,
          material_audiovisual: materialAudiovisual || null,
          material_pdf_url: materialPdfUrl || null,
          material_pdf_titulo: materialPdfTitulo || null,
          material_imagen_url: materialImagenUrl,
          activities: activities.map((a) => ({
            type: a.type, title: a.title, instrucciones: a.instrucciones,
            nivel_dificultad: a.nivel_dificultad, imagen_url: a.imagen_url ?? null,
            pregunta: a.pregunta ?? null, steps: a.sequence_steps ?? null,
          })),
        }),
      })

      if (!response.ok) { const data = await response.json(); setError(data.error ?? "Error al guardar la lección"); setIsLoading(false); return }

      const responseData = await response.json()
      const idLeccion = responseData.id_leccion

      if (idLeccion && glosario.length > 0) {
        await supabase.from("glosario").insert(
          glosario.map((g) => ({ id_leccion: idLeccion, palabra: g.palabra, definicion: g.definicion }))
        )
      }

      speak("Leccion creada exitosamente")
      onSave()
    } catch { setError("Error de conexión. Intenta de nuevo.") }

    setIsLoading(false)
  }

  /* ── Activity config screen ── */
  if (configuringType) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => { if (activityDirty) { setShowExitConfirm(true) } else { setConfiguringType(null); setEditingActivityId(null) } }}
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
            {settings.voiceEnabled && (
              <button type="button"
                onClick={() => speak(getActivitySpeakText(configuringType.type, configuringType.label))}
                aria-label="Escuchar instrucciones de la sección"
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline" aria-hidden="true">Escuchar</span>
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-6 py-8 space-y-5">
          <ActivityConfigForm
            type={configuringType.type}
            imagePreviewUrl={actImagePreview}
            existingImageUrl={actExistingImageUrl}
            imageInputRef={imageInputRef}
            onImageSelect={handleImageSelect}
            onImageDelete={handleImageDelete}
            instrucciones={actInstrucciones}
            onInstruccionesChange={setActInstrucciones}
            options={actOptions}
            onOptionTextChange={(id, text) => setActOptions(actOptions.map(o => o.id === id ? { ...o, text } : o))}
            onSetCorrect={(id) => setActOptions(actOptions.map(o => ({ ...o, isCorrect: o.id === id })))}
            onAddOption={() => setActOptions([...actOptions, { id: Date.now().toString(), text: "", isCorrect: false }])}
            onRemoveOption={(id) => { if (actOptions.length > 2) setActOptions(actOptions.filter(o => o.id !== id)) }}
            correctAnswer={actCorrectAnswer}
            onCorrectAnswerChange={setActCorrectAnswer}
            dificultad={actDificultad}
            onDificultadChange={setActDificultad}
            palabrasDistractoras={actPalabrasDistractoras}
            onPalabrasDistractorasChange={setActPalabrasDistractoras}
            voiceEnunciado={actVoiceEnunciado}
            onVoiceEnunciadoChange={setActVoiceEnunciado}
            fillEnunciado={actFillEnunciado}
            onFillEnunciadoChange={setActFillEnunciado}
            fillContextSentences={actFillContextSentences}
            onFillContextSentencesChange={setActFillContextSentences}
            wsWords={actPalabrasSopa}
            wsInput={actPalabraInput}
            onWsInputChange={setActPalabraInput}
            onAddWsWord={handleAddPalabraSopa}
            onRemoveWsWord={handleRemovePalabraSopa}
            sequenceCount={actSequenceCount}
            onSequenceCountChange={setActSequenceCount}
            sequenceSteps={actSequenceSteps}
            onSequenceStepsChange={setActSequenceSteps}
            seqInputRefs={seqInputRefs}
            speak={speak}
            showValidation={attemptedSave}
            onDirty={() => setActivityDirty(true)}
          />

          <div className="flex gap-3">
            <button type="button"
              onClick={() => { setConfiguringType(null); setEditingActivityId(null) }}
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
                  onClick={() => { setShowExitConfirm(false); setConfiguringType(null); setEditingActivityId(null) }}
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

  /* ── Main form ── */
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { if (lessonDirty) { setShowLessonExitConfirm(true) } else { onBack() } }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <h1 className="text-base font-bold text-foreground">Crear Lección</h1>
          </div>
          {settings.voiceEnabled && (
            <button type="button"
              onClick={() => speak("Crear nueva leccion. Ingresa el titulo de la leccion, las instrucciones para los estudiantes, y agrega las actividades que deseas incluir.")}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Escuchar</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Basic Info */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
              Información de la Lección
            </h2>
            <div className="space-y-1.5">
              <label htmlFor="lesson-title" className="text-sm font-semibold text-foreground block">Título de la lección</label>
              <Input id="lesson-title" type="text" value={title} onChange={(e) => { setTitle(e.target.value); setLessonDirty(true) }}
                placeholder="Ej: Numeros del 1 al 10" className="border-border" required
                onInvalid={(e) => (e.currentTarget as HTMLInputElement).setCustomValidity("Por favor, completa este campo.")}
                onInput={(e) => (e.currentTarget as HTMLInputElement).setCustomValidity("")} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lesson-instructions" className="text-sm font-semibold text-foreground block">Instrucciones para el estudiante</label>
              <textarea id="lesson-instructions" value={instructions} onChange={(e) => { setInstructions(e.target.value); setLessonDirty(true) }}
                placeholder="Escribe instrucciones claras y simples para los estudiantes"
                className="w-full min-h-[90px] p-3 text-sm border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" required
                onInvalid={(e) => (e.currentTarget as HTMLTextAreaElement).setCustomValidity("Por favor, completa este campo.")}
                onInput={(e) => (e.currentTarget as HTMLTextAreaElement).setCustomValidity("")} />
            </div>
          </div>

          {/* Material de Lectura + Imagen de Apoyo */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />
                  Material de Lectura
                  <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Texto de lectura que los estudiantes verán antes de las actividades.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImagenExpanded(v => !v)}
                aria-expanded={imagenExpanded}
                aria-label={imagenExpanded ? "Ocultar imagen de apoyo" : "Agregar imagen de apoyo"}
                className={`flex items-center gap-1.5 shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                  imagenExpanded || materialImagenPreview
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {imagenExpanded || materialImagenPreview ? "Imagen" : "+ Imagen"}
              </button>
            </div>

            <label htmlFor="material-lectura" className="sr-only">Material de lectura</label>
            <textarea id="material-lectura" value={materialLectura} onChange={(e) => setMaterialLectura(e.target.value)}
              placeholder="Escribe aquí el texto de lectura para los estudiantes. Ej: El sistema solar está formado por el Sol y los ocho planetas que giran a su alrededor..."
              className="w-full min-h-[140px] p-3 text-sm border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />

            {(imagenExpanded || materialImagenPreview) && (
              <div className="pt-1 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground">
                  La imagen se mostrará encima del texto para los estudiantes.
                </p>
                {materialImagenPreview ? (
                  <div className="relative w-full overflow-hidden rounded-xl border border-border">
                    <img src={materialImagenPreview} alt="Vista previa" className="w-full h-auto max-h-[400px] object-contain" />
                    <button type="button"
                      onClick={() => { setMaterialImagenFile(null); setMaterialImagenPreview(""); setImagenExpanded(false) }}
                      aria-label="Quitar imagen"
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg bg-black/40 text-white shadow hover:bg-black/60 transition-colors active:scale-95">
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="material-imagen-create" className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-5 cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground font-medium">Haz clic para subir una imagen</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG, WEBP — máx. 5 MB</span>
                    <input id="material-imagen-create" type="file" accept="image/*" className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 5 * 1024 * 1024) { setError("La imagen no puede superar los 5 MB."); return }
                        setMaterialImagenFile(file)
                        setMaterialImagenPreview(URL.createObjectURL(file))
                      }} />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Glosario */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <BookMarked className="w-4 h-4 text-primary" aria-hidden="true" />
              Glosario de palabras clave
              <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Agrega palabras difíciles con su definición. Las palabras aparecerán resaltadas en las instrucciones y el material de lectura para que el alumno pueda ver su significado con un toque.
            </p>
            {glosario.length > 0 && (
              <ul className="space-y-1.5 list-none p-0 mb-3">
                {glosario.map((g) => (
                  <li key={g.palabra} className="flex items-start gap-3 rounded-xl bg-muted px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-foreground">{g.palabra}</span>
                      <span className="text-muted-foreground mx-2">—</span>
                      <span className="text-sm text-foreground">{g.definicion}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveGlosario(g.palabra)}
                      aria-label={`Eliminar "${g.palabra}" del glosario`}
                      className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input type="text" value={glosarioPalabra} onChange={(e) => setGlosarioPalabra(e.target.value)}
                  placeholder="Palabra (ej: mascota)" className="border-border flex-1"
                  aria-label="Palabra del glosario" />
                <Input type="text" value={glosarioDefin} onChange={(e) => setGlosarioDefin(e.target.value)}
                  placeholder="Definición simple para niños" className="border-border flex-[2]"
                  aria-label="Definición de la palabra"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddGlosario())} />
                <button type="button" onClick={handleAddGlosario}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] shrink-0">
                  <Plus className="w-4 h-4" aria-hidden="true" />Agregar
                </button>
              </div>
              {glosarioError && <p className="text-xs text-destructive" role="alert">{glosarioError}</p>}
            </div>
          </div>

          {/* Material Audiovisual */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <Youtube className="w-4 h-4 text-red-500" aria-hidden="true" />
              Material Audiovisual
              <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Pega el enlace de un video de YouTube. Los estudiantes podrán verlo en la lección antes de las actividades.
            </p>
            <label htmlFor="material-audiovisual" className="sr-only">Enlace del video de YouTube</label>
            <Input id="material-audiovisual" type="url" value={materialAudiovisual} onChange={(e) => setMaterialAudiovisual(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." className="border-border" />
            {materialAudiovisual && (
              <p className="text-xs text-muted-foreground mt-2">El video se mostrará embebido en la lección del estudiante.</p>
            )}
          </div>

          {/* Material PDF */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <Paperclip className="w-4 h-4 text-primary" aria-hidden="true" />
              Material Adjunto (PDF)
              <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Puedes pegar un enlace público de PDF (Supabase Storage, Drive público, etc.) para que el estudiante lo abra desde la lección.
            </p>
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
              <Plus className="w-4 h-4 text-primary" aria-hidden="true" />
              Agregar Actividades
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Selecciona un tipo para configurar y agregar la actividad</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activityTypes.map((type) => (
                <button key={type.id} type="button"
                  onClick={() => handleSelectType(type.id, type.label)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${type.gradient}`} aria-hidden="true">
                    <type.Icon className="w-4 h-4 text-white" />
                  </span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Added Activities */}
          {activities.length > 0 && (
            <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Actividades Agregadas ({activities.length})</h2>
              <ul className="space-y-2 list-none p-0">
                {activities.map((activity, index) => {
                  const parsed = parseActivityConfig(activity.instrucciones)
                  const preview = parsed.instrucciones || activity.title
                  const diffLabel = difficultyLevels.find((d) => d.id === activity.nivel_dificultad)?.label ?? activity.nivel_dificultad
                  return (
                    <li key={activity.id}
                      className="flex items-center justify-between rounded-xl bg-muted px-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary shrink-0">{index + 1}</span>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-foreground block truncate">{activity.title}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">{preview} · {diffLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button"
                          onClick={() => handleEditActivity(activity)}
                          aria-label={`Editar ${activity.title}`}
                          className="flex items-center justify-center rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors">
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button type="button"
                          onClick={() => handleRemoveActivity(activity.id)}
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

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={onBack}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading || !title || !instructions}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Save className="w-4 h-4" aria-hidden="true" />
              {isLoading ? "Guardando..." : "Guardar Lección"}
            </button>
          </div>
        </form>
      </main>

      {showLessonExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-lesson-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-6 space-y-4">
            <div className="space-y-1">
              <h2 id="exit-lesson-title" className="text-base font-bold text-foreground">
                ¿Salir sin guardar?
              </h2>
              <p className="text-sm text-muted-foreground">
                Los cambios que hiciste se perderán si sales ahora.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLessonExitConfirm(false)}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Seguir editando
              </button>
              <button
                type="button"
                onClick={() => { setShowLessonExitConfirm(false); onBack() }}
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
