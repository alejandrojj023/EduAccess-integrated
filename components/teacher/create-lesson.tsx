"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Save, Volume2, FileText, Plus, Trash2, GripVertical, ChevronLeft, BookOpen, Youtube, Search, Paperclip, BookMarked, Pencil, Upload, ImageIcon } from "lucide-react"
import { parseActivityConfig, serializeActivityConfig } from "@/lib/activity-config"

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
  { id: "image", label: "Identificacion de imagenes", icon: "🖼️" },
  { id: "sound", label: "Reconocimiento de sonidos", icon: "🔊" },
  { id: "sequence", label: "Ordenar secuencias", icon: "📊" },
  { id: "multiple", label: "Opcion multiple", icon: "☑️" },
  { id: "short", label: "Respuesta corta escrita", icon: "✏️" },
  { id: "voice", label: "Respuesta por voz", icon: "🎤" },
  { id: "fill", label: "Completar oracion", icon: "📝" },
  { id: "wordsearch", label: "Sopa de letras", icon: "🔤" },
]

const difficultyLevels = [
  { id: "facil", label: "Fácil", description: "Para comenzar" },
  { id: "medio", label: "Medio", description: "Un poco más difícil" },
  { id: "dificil", label: "Difícil", description: "Para avanzados" },
]

export function CreateLesson({ courseId, onBack, onSave }: CreateLessonProps) {
  const [title, setTitle] = useState("")
  const [instructions, setInstructions] = useState("")
  const [materialLectura, setMaterialLectura] = useState("")
  const [materialAudiovisual, setMaterialAudiovisual] = useState("")
  const [materialPdfUrl, setMaterialPdfUrl] = useState("")
  const [materialPdfTitulo, setMaterialPdfTitulo] = useState("")
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Inline config state
  const [configuringType, setConfiguringType] = useState<{ type: string; label: string } | null>(null)
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [actInstrucciones, setActInstrucciones] = useState("")
  const [actDificultad, setActDificultad] = useState("facil")
  const [actOptions, setActOptions] = useState<{ id: string; text: string; isCorrect: boolean }[]>([
    { id: "1", text: "", isCorrect: false },
    { id: "2", text: "", isCorrect: false },
  ])
  const [actCorrectAnswer, setActCorrectAnswer] = useState("")
  const [actPalabrasSopa, setActPalabrasSopa] = useState<string[]>([])
  const [actPalabraInput, setActPalabraInput] = useState("")
  // Voice-specific
  const [actVoiceEnunciado, setActVoiceEnunciado] = useState("")
  // Sound / Fill specific
  const [actPalabrasDistractoras, setActPalabrasDistractoras] = useState("")
  // Fill-specific
  const [actFillEnunciado, setActFillEnunciado] = useState("")
  const [actFillContextSentences, setActFillContextSentences] = useState<string[]>([""])
  // Sequence-specific
  const [actSequenceCount, setActSequenceCount] = useState<3 | 4 | 5>(3)
  const [actSequenceSteps, setActSequenceSteps] = useState<{ file: File | null; previewUrl: string; existingUrl: string; description: string }[]>([])
  const seqInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Glosario (se guarda después de crear la lección)
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
    setGlosarioPalabra("")
    setGlosarioDefin("")
    setGlosarioError("")
  }

  const handleRemoveGlosario = (pal: string) =>
    setGlosario(glosario.filter((g) => g.palabra !== pal))

  const { speak, settings } = useAccessibility()
  const { user } = useAuth()

  // Image upload state
  const [actImageFile, setActImageFile] = useState<File | null>(null)
  const [actImagePreview, setActImagePreview] = useState("")
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
    setActImageFile(null)
    setActImagePreview("")
    setActExistingImageUrl("")
  }

  const handleSelectType = (type: string, label: string) => {
    setEditingActivityId(null)
    setConfiguringType({ type, label })
    setActInstrucciones("")
    setActDificultad("facil")
    setActOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
    setActCorrectAnswer("")
    setActPalabrasSopa([])
    setActPalabraInput("")
    setActVoiceEnunciado("")
    setActPalabrasDistractoras("")
    setActFillEnunciado("")
    setActFillContextSentences([""])
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
    setActDificultad(activity.nivel_dificultad)
    if (actImagePreview.startsWith("blob:")) URL.revokeObjectURL(actImagePreview)
    setActImageFile(null)
    setActImagePreview("")
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
        setActPalabrasDistractoras("")
        setActFillEnunciado("")
        setActFillContextSentences([""])
      } else if (activity.type === "sound") {
        setActCorrectAnswer(activity.pregunta?.respuesta_esperada ?? "")
        setActPalabrasDistractoras(
          activity.pregunta?.palabras_distractoras?.split("|").filter(Boolean).join(", ") ?? ""
        )
        setActVoiceEnunciado("")
        setActFillEnunciado("")
        setActFillContextSentences([""])
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
      setActCorrectAnswer("")
      setActPalabrasSopa([])
      setActVoiceEnunciado("")
      setActPalabrasDistractoras("")
      setActFillEnunciado("")
      setActFillContextSentences([""])
      const empty = () => ({ file: null as File | null, previewUrl: "", existingUrl: "", description: "" })
      const cnt = Math.min(5, Math.max(3, activity.sequence_steps?.length ?? 3)) as 3 | 4 | 5
      setActSequenceCount(cnt)
      const steps = (activity.sequence_steps ?? []).slice(0, cnt).map(s => ({
        file: null as File | null,
        previewUrl: "",
        existingUrl: s.imagen_url ?? "",
        description: s.description,
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
      setActVoiceEnunciado("")
      setActPalabrasDistractoras("")
      setActFillEnunciado("")
      setActFillContextSentences([""])
      setActSequenceSteps([])
    }
  }
  const handleAddPalabraSopa = () => {
    const word = actPalabraInput.trim().toUpperCase()
    if (!word || actPalabrasSopa.includes(word)) return
    setActPalabrasSopa([...actPalabrasSopa, word])
    setActPalabraInput("")
  }
  const handleRemovePalabraSopa = (word: string) => {
    setActPalabrasSopa(actPalabrasSopa.filter((w) => w !== word))
  }

  const [actSaving, setActSaving] = useState(false)

  const handleConfirmActivity = async () => {
    if (!configuringType) return
    setActSaving(true)

    // Image upload for 'image' type
    let imagen_url: string | null | undefined = undefined
    if (actImageFile && user) {
      const ext = actImageFile.name.split(".").pop() ?? "jpg"
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("actividades")
        .upload(path, actImageFile, { upsert: true })
      if (uploadError) {
        setError("Error al subir la imagen: " + uploadError.message)
        setActSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from("actividades").getPublicUrl(path)
      imagen_url = urlData.publicUrl
    } else if (!actImageFile && !actExistingImageUrl) {
      imagen_url = null
    }

    // Sequence image uploads
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
          if (uploadError) {
            setError(`Error al subir imagen ${idx + 1}: ${uploadError.message}`)
            setActSaving(false)
            return
          }
          const { data: urlData } = supabase.storage.from("actividades").getPublicUrl(path)
          url = urlData.publicUrl
        }
        uploaded!.push({ imagen_url: url, description: step.description || `Paso ${idx + 1}` })
      }
      sequenceStepsPayload = uploaded
    }

    const typeIsSound = configuringType.type === "sound"
    const typeIsVoice = configuringType.type === "voice"
    const typeIsFill = configuringType.type === "fill"
    const typeIsSequence = configuringType.type === "sequence"

    let serialized: string
    let preguntaData: ActivityItem["pregunta"] | undefined

    if (typeIsSound) {
      serialized = actInstrucciones
      const distractorasFormatted = actPalabrasDistractoras.split(",").map(w => w.trim()).filter(Boolean).join("|")
      preguntaData = {
        respuesta_esperada: actCorrectAnswer,
        palabras_distractoras: distractorasFormatted || undefined,
        tipo_respuesta_esperada: "texto",
      }
    } else if (typeIsVoice) {
      serialized = actInstrucciones
      const respuestaFormatted = actCorrectAnswer.split(",").map(s => s.trim()).filter(Boolean).join("|")
      preguntaData = {
        enunciado: actVoiceEnunciado,
        respuesta_esperada: respuestaFormatted,
        tipo_respuesta_esperada: "voz",
      }
    } else if (typeIsFill) {
      serialized = actInstrucciones
      const distractorasFormatted = actPalabrasDistractoras.split(",").map(w => w.trim()).filter(Boolean).join("|")
      const oracionesStr = actFillContextSentences.filter(s => s.trim()).join("|") || undefined
      preguntaData = {
        enunciado: actFillEnunciado,
        respuesta_esperada: actCorrectAnswer.trim(),
        palabras_distractoras: distractorasFormatted || undefined,
        oraciones_contexto: oracionesStr,
        tipo_respuesta_esperada: "texto",
      }
    } else if (typeIsSequence) {
      serialized = actInstrucciones
    } else {
      const showOpciones = configuringType.type === "multiple" || configuringType.type === "image"
      const showRespuesta = configuringType.type === "short"
      const opciones = showOpciones ? actOptions.filter(o => o.text.trim()).map(o => ({ texto: o.text, correcta: o.isCorrect })) : undefined
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
    setEditingActivityId(null)
    setConfiguringType(null)
    setActSaving(false)
  }

  const handleRemoveActivity = (id: string) => {
    setActivities(activities.filter((a) => a.id !== id))
    speak("Actividad eliminada")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!courseId) {
      setError("No se encontró el curso. Vuelve a seleccionar un curso.")
      setIsLoading(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError("No hay sesión activa. Inicia sesión nuevamente.")
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          courseId,
          titulo: title,
          contenido: instructions,
          material_lectura: materialLectura || null,
          material_audiovisual: materialAudiovisual || null,
          material_pdf_url: materialPdfUrl || null,
          material_pdf_titulo: materialPdfTitulo || null,
          activities: activities.map((a) => ({
            type: a.type,
            title: a.title,
            instrucciones: a.instrucciones,
            nivel_dificultad: a.nivel_dificultad,
            imagen_url: a.imagen_url ?? null,
            pregunta: a.pregunta ?? null,
            steps: a.sequence_steps ?? null,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error ?? "Error al guardar la lección")
        setIsLoading(false)
        return
      }

      const responseData = await response.json()
      const idLeccion = responseData.id_leccion

      // Guardar glosario si hay entradas
      if (idLeccion && glosario.length > 0) {
        await supabase.from("glosario").insert(
          glosario.map((g) => ({
            id_leccion: idLeccion,
            palabra: g.palabra,
            definicion: g.definicion,
          }))
        )
      }

      speak("Leccion creada exitosamente")
      onSave()
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    }

    setIsLoading(false)
  }

  // Show inline config form when selecting an activity type
  if (configuringType) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b-2 border-border sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => { setConfiguringType(null); setEditingActivityId(null) }}
              className="h-12 w-12 p-0"
              aria-label="Volver"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {editingActivityId ? "Editar Actividad" : "Configurar Actividad"}
              </h1>
              <p className="text-sm text-muted-foreground">{configuringType.label}</p>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Image upload — only for image type */}
          {configuringType?.type === "image" && (
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <ImageIcon className="w-6 h-6 text-primary" aria-hidden="true" />
                  Imagen de la Actividad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sube la imagen que el estudiante vera para identificar. Formatos: JPG, PNG, WebP.
                </p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                {(actImagePreview || actExistingImageUrl) ? (
                  <div className="relative">
                    <img
                      src={actImagePreview || actExistingImageUrl}
                      alt="Vista previa"
                      className="w-full max-h-64 object-contain rounded-lg border-2 border-border bg-muted"
                    />
                    <div className="flex gap-2 mt-3">
                      <Button type="button" variant="outline" className="flex-1 h-11 border-2" onClick={() => imageInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                        Cambiar imagen
                      </Button>
                      <Button type="button" variant="outline" className="h-11 border-2 text-destructive hover:bg-destructive/10" onClick={handleImageDelete}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full h-40 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <span className="text-base font-medium text-muted-foreground">Haz clic para subir una imagen</span>
                    <span className="text-sm text-muted-foreground">PNG, JPG, WEBP o GIF</span>
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sound config — correct sentence + distractors */}
          {configuringType?.type === "sound" && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Oracion Correcta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <Input
                      value={actCorrectAnswer}
                      onChange={(e) => setActCorrectAnswer(e.target.value)}
                      placeholder="Ej: Los gatos son bonitos"
                      className="h-14 text-lg border-2 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 px-5 border-2 shrink-0 gap-2"
                      onClick={() => actCorrectAnswer.trim() && speak(actCorrectAnswer.trim())}
                      disabled={!actCorrectAnswer.trim()}
                      aria-label="Escuchar oracion"
                    >
                      <Volume2 className="w-5 h-5" aria-hidden="true" />
                      Escuchar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    El sistema reproducira esta oracion en voz alta al alumno usando el sintetizador de voz del navegador.
                  </p>
                  {actCorrectAnswer.trim() && (
                    <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                      {actCorrectAnswer.trim().split(/\s+/).map((word, i) => (
                        <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium">{word}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Palabras Distractoras{" "}
                    <span className="text-muted-foreground text-base font-normal">(opcional)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={actPalabrasDistractoras}
                    onChange={(e) => setActPalabrasDistractoras(e.target.value)}
                    placeholder="Ej: nube, famoso, mesa"
                    className="h-14 text-lg border-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    Separa las palabras con <strong>comas</strong>. Se mezclaran con la oracion para aumentar la dificultad.
                  </p>
                  {actPalabrasDistractoras.trim() && (
                    <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                      {actPalabrasDistractoras.split(",").filter(w => w.trim()).map((word, i) => (
                        <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-lg text-sm font-medium">{word.trim()}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Voice config — pregunta + correct answers */}
          {configuringType?.type === "voice" && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Pregunta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <Input
                      value={actVoiceEnunciado}
                      onChange={(e) => setActVoiceEnunciado(e.target.value)}
                      placeholder="Ej: ¿De que color es el cielo?"
                      className="h-14 text-lg border-2 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 px-5 border-2 shrink-0 gap-2"
                      onClick={() => actVoiceEnunciado.trim() && speak(actVoiceEnunciado.trim())}
                      disabled={!actVoiceEnunciado.trim()}
                      aria-label="Escuchar pregunta"
                    >
                      <Volume2 className="w-5 h-5" aria-hidden="true" />
                      Escuchar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Esta pregunta se mostrara y se leera en voz alta al alumno.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Respuesta Correcta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={actCorrectAnswer}
                    onChange={(e) => setActCorrectAnswer(e.target.value)}
                    placeholder="Ej: azul, celeste, azul claro"
                    className="h-14 text-lg border-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    Separa con <strong>comas</strong> si hay varias respuestas validas. Se acepta cualquiera.
                  </p>
                  {actCorrectAnswer.trim() && (
                    <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                      {actCorrectAnswer.split(",").filter(s => s.trim()).map((ans, i) => (
                        <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium">{ans.trim()}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Sequence config — count selector + image slots */}
          {configuringType?.type === "sequence" && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">¿Cuantas imagenes?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {([3, 4, 5] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setActSequenceCount(n)
                          const cur = [...actSequenceSteps]
                          while (cur.length < n) cur.push({ file: null, previewUrl: "", existingUrl: "", description: "" })
                          setActSequenceSteps(cur.slice(0, n))
                        }}
                        className={`p-5 rounded-xl border-2 text-center transition-all ${actSequenceCount === n
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : "border-border hover:border-primary/50"
                          }`}
                        aria-pressed={actSequenceCount === n}
                      >
                        <span className="text-3xl font-bold text-foreground block">{n}</span>
                        <span className="text-sm text-muted-foreground">imagenes</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Imagenes de la secuencia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Sube las imagenes <strong>en el orden correcto</strong>. El alumno debera reordenarlas.
                  </p>
                  {actSequenceSteps.map((step, idx) => (
                    <div key={idx} className="border-2 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0">{idx + 1}</span>
                        <h4 className="font-semibold text-foreground">Paso {idx + 1}</h4>
                      </div>
                      {(step.previewUrl || step.existingUrl) ? (
                        <div className="space-y-3">
                          <img src={step.previewUrl || step.existingUrl} alt={`Paso ${idx + 1}`} className="w-full max-h-44 object-contain rounded-xl border-2 border-border bg-muted" />
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" className="border-2 h-10 gap-2" onClick={() => seqInputRefs.current[idx]?.click()}>
                              <Upload className="w-4 h-4" aria-hidden="true" />
                              Cambiar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-2 h-10 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                const steps = [...actSequenceSteps]
                                if (steps[idx].previewUrl.startsWith("blob:")) URL.revokeObjectURL(steps[idx].previewUrl)
                                steps[idx] = { ...steps[idx], file: null, previewUrl: "", existingUrl: "" }
                                setActSequenceSteps(steps)
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
                          <Upload className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                          <p className="text-sm text-muted-foreground font-medium">Subir imagen del paso {idx + 1}</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP</p>
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
                          const steps = [...actSequenceSteps]
                          if (steps[idx].previewUrl.startsWith("blob:")) URL.revokeObjectURL(steps[idx].previewUrl)
                          steps[idx] = { ...steps[idx], file, previewUrl: URL.createObjectURL(file) }
                          setActSequenceSteps(steps)
                          e.target.value = ""
                        }}
                      />
                      <Input
                        value={step.description}
                        onChange={(e) => {
                          const steps = [...actSequenceSteps]
                          steps[idx] = { ...steps[idx], description: e.target.value }
                          setActSequenceSteps(steps)
                        }}
                        placeholder={`Descripcion del paso ${idx + 1} (opcional)`}
                        className="h-10 border-2"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* Fill config — context sentences + target sentence + correct answer + distractors */}
          {configuringType?.type === "fill" && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Oraciones de Contexto{" "}
                    <span className="text-muted-foreground text-base font-normal">(opcional)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {actFillContextSentences.map((sentence, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={sentence}
                        onChange={(e) => {
                          const next = [...actFillContextSentences]
                          next[idx] = e.target.value
                          setActFillContextSentences(next)
                        }}
                        placeholder="Ej: Yo tengo tres mascotas."
                        className="h-12 text-base border-2 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 px-3 border-2 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => {
                          if (actFillContextSentences.length > 1) {
                            setActFillContextSentences(actFillContextSentences.filter((_, i) => i !== idx))
                          } else {
                            setActFillContextSentences([""])
                          }
                        }}
                        aria-label="Eliminar oracion"
                        disabled={actFillContextSentences.length === 1 && !sentence.trim()}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 border-2 border-dashed"
                    onClick={() => setActFillContextSentences([...actFillContextSentences, ""])}
                  >
                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                    Agregar oracion de ejemplo
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Estas oraciones aparecen como ejemplos para que el alumno comprenda el patron antes de completar.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Oracion a Completar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={actFillEnunciado}
                    onChange={(e) => setActFillEnunciado(e.target.value)}
                    placeholder="Ej: Yo tengo tres ___."
                    className="h-14 text-lg border-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    Usa <strong>___</strong> (tres guiones bajos) para marcar el espacio en blanco.
                  </p>
                  {actFillEnunciado.includes("___") && (
                    <div className="p-3 bg-muted rounded-xl text-base font-medium text-foreground">
                      Vista previa:{" "}
                      {actFillEnunciado.split("___").map((part, i) => (
                        <span key={i}>
                          {part}
                          {i < actFillEnunciado.split("___").length - 1 && (
                            <span className="inline-block min-w-[60px] mx-1 border-b-2 border-dashed border-primary text-primary">
                              {actCorrectAnswer.trim() || "___"}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Respuesta Correcta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={actCorrectAnswer}
                    onChange={(e) => setActCorrectAnswer(e.target.value)}
                    placeholder="Ej: gatos"
                    className="h-14 text-lg border-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    La palabra exacta que completa el espacio en blanco.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Palabras Distractoras{" "}
                    <span className="text-muted-foreground text-base font-normal">(opciones incorrectas)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={actPalabrasDistractoras}
                    onChange={(e) => setActPalabrasDistractoras(e.target.value)}
                    placeholder="Ej: gato, perros, pez"
                    className="h-14 text-lg border-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    Separa con <strong>comas</strong>. Se mezclaran con la respuesta correcta como opciones.
                  </p>
                  {actPalabrasDistractoras.trim() && (
                    <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-xl">
                      {actPalabrasDistractoras.split(",").filter(w => w.trim()).map((word, i) => (
                        <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-lg text-sm font-medium">{word.trim()}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Wordsearch config */}
          {configuringType?.type === "wordsearch" && (
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" aria-hidden="true" />
                  Palabras a Encontrar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Agrega las palabras que los estudiantes deben encontrar. Se convertiran a mayusculas automaticamente. Maximo 10 palabras.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={actPalabraInput}
                    onChange={(e) => setActPalabraInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPalabraSopa())}
                    placeholder="Ej: GATO"
                    className="h-12 text-lg border-2 flex-1"
                    maxLength={15}
                  />
                  <Button type="button" onClick={handleAddPalabraSopa} className="h-12 px-5" disabled={actPalabrasSopa.length >= 10 || !actPalabraInput.trim()}>
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
                {actPalabrasSopa.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {actPalabrasSopa.map((word) => (
                      <span key={word} className="inline-flex items-center gap-2 bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-lg border border-primary/30">
                        {word}
                        <button type="button" onClick={() => handleRemovePalabraSopa(word)} className="text-primary hover:text-destructive transition-colors" aria-label={`Eliminar ${word}`}>
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {actPalabrasSopa.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Agrega al menos una palabra.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions — always shown */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Instrucciones de la Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={actInstrucciones}
                onChange={(e) => setActInstrucciones(e.target.value)}
                placeholder="Escribe instrucciones claras y simples. Ej: Mira la imagen y selecciona la respuesta correcta."
                className="w-full min-h-[120px] p-4 text-lg border-2 border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </CardContent>
          </Card>

          {/* Options — for multiple choice / image types */}
          {(configuringType?.type === "multiple" || configuringType?.type === "image") && (
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Opciones de Respuesta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {actOptions.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setActOptions(actOptions.map((o) => ({ ...o, isCorrect: o.id === option.id })))}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${option.isCorrect
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-border hover:border-primary"
                        }`}
                      aria-label={option.isCorrect ? "Respuesta correcta" : "Marcar como correcta"}
                    >
                      {option.isCorrect ? "✓" : String.fromCharCode(65 + index)}
                    </button>
                    <Input
                      value={option.text}
                      onChange={(e) => setActOptions(actOptions.map((o) => o.id === option.id ? { ...o, text: e.target.value } : o))}
                      placeholder={`Opcion ${index + 1}`}
                      className="h-12 text-lg border-2 flex-1"
                    />
                    {actOptions.length > 2 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setActOptions(actOptions.filter((o) => o.id !== option.id))} className="text-destructive hover:bg-destructive/10" aria-label="Eliminar opcion">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full h-12 border-2 border-dashed" onClick={() => setActOptions([...actOptions, { id: Date.now().toString(), text: "", isCorrect: false }])}>
                  <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
                  Agregar Opcion
                </Button>
                <p className="text-sm text-muted-foreground">Haz clic en la letra para marcar la respuesta correcta</p>
              </CardContent>
            </Card>
          )}

          {/* Correct answer — for short answer type */}
          {configuringType?.type === "short" && (
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Respuesta Correcta</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={actCorrectAnswer}
                  onChange={(e) => setActCorrectAnswer(e.target.value)}
                  placeholder="Escribe la respuesta esperada"
                  className="h-14 text-lg border-2"
                />
                <p className="text-sm text-muted-foreground mt-3">El sistema comparara la respuesta del estudiante con esta</p>
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
                    onClick={() => setActDificultad(level.id)}
                    className={`p-5 rounded-xl border-2 text-center transition-all ${actDificultad === level.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "border-border hover:border-primary/50"
                      }`}
                    aria-pressed={actDificultad === level.id}
                  >
                    <p className={`text-lg font-bold ${actDificultad === level.id ? "text-primary" : "text-foreground"}`}>
                      {level.label}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 h-16 text-xl border-2"
              onClick={() => { setConfiguringType(null); setEditingActivityId(null) }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1 h-16 text-xl"
              onClick={handleConfirmActivity}
              disabled={actSaving}
            >
              {actSaving ? "Guardando..." : editingActivityId ? (
                <>
                  <Save className="w-6 h-6 mr-3" aria-hidden="true" />
                  Guardar Cambios
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 mr-3" aria-hidden="true" />
                  Agregar Actividad
                </>
              )}
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-foreground">Crear Leccion</h1>
          </div>
          {settings.voiceEnabled && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => speak("Crear nueva leccion. Ingresa el titulo de la leccion, las instrucciones para los estudiantes, y agrega las actividades que deseas incluir.")}
              className="h-12"
            >
              <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
              Escuchar
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" aria-hidden="true" />
                Informacion de la Leccion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="lesson-title" className="text-lg font-semibold text-foreground block">
                  Titulo de la leccion
                </label>
                <Input
                  id="lesson-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Numeros del 1 al 10"
                  className="h-14 text-lg border-2"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="lesson-instructions" className="text-lg font-semibold text-foreground block">
                  Instrucciones para el estudiante
                </label>
                <textarea
                  id="lesson-instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Escribe instrucciones claras y simples para los estudiantes"
                  className="w-full min-h-[120px] p-4 text-lg border-2 border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Activity Types */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <Plus className="w-6 h-6 text-primary" aria-hidden="true" />
                Agregar Actividades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Selecciona un tipo para configurar y agregar la actividad
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activityTypes.map((type) => (
                  <Button
                    key={type.id}
                    type="button"
                    variant="outline"
                    className="h-auto p-5 flex items-center justify-start gap-4 border-2 hover:border-primary hover:bg-primary/5"
                    onClick={() => handleSelectType(type.id, type.label)}
                  >
                    <span className="text-3xl" aria-hidden="true">{type.icon}</span>
                    <span className="text-base font-medium text-left">{type.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Added Activities */}
          {activities.length > 0 && (
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">
                  Actividades Agregadas ({activities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {activities.map((activity, index) => {
                    const parsed = parseActivityConfig(activity.instrucciones)
                    const preview = parsed.instrucciones || activity.title
                    const diffLabel = difficultyLevels.find((d) => d.id === activity.nivel_dificultad)?.label ?? activity.nivel_dificultad
                    return (
                    <li
                      key={activity.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-xl cursor-pointer hover:bg-muted/80 hover:ring-2 hover:ring-primary/30 transition-all"
                      onClick={() => handleEditActivity(activity)}
                      role="button"
                      aria-label={`Editar actividad ${index + 1}: ${activity.title}`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <GripVertical className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
                        <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-medium text-foreground block">{activity.title}</span>
                          <span className="text-sm text-muted-foreground line-clamp-1">{preview}</span>
                          <span className="text-xs text-muted-foreground">{diffLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); handleEditActivity(activity) }}
                          aria-label={`Editar ${activity.title}`}
                        >
                          <Pencil className="w-5 h-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); handleRemoveActivity(activity.id) }}
                          aria-label={`Eliminar ${activity.title}`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Material de Lectura */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-primary" aria-hidden="true" />
                Material de Lectura
                <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Texto de lectura que los estudiantes verán antes de las actividades. Sirve como base para las preguntas.
              </p>
              <textarea
                id="material-lectura"
                value={materialLectura}
                onChange={(e) => setMaterialLectura(e.target.value)}
                placeholder="Escribe aquí el texto de lectura para los estudiantes. Ej: El sistema solar está formado por el Sol y los ocho planetas que giran a su alrededor..."
                className="w-full min-h-[180px] p-4 text-lg border-2 border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </CardContent>
          </Card>
          {/* Glosario */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <BookMarked className="w-6 h-6 text-primary" aria-hidden="true" />
                Glosario de palabras clave
                <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Agrega palabras difíciles con su definición. Las palabras aparecerán resaltadas en las instrucciones y el material de lectura para que el alumno pueda ver su significado con un toque.
              </p>

              {/* Lista de palabras ya agregadas */}
              {glosario.length > 0 && (
                <ul className="space-y-2 list-none p-0">
                  {glosario.map((g) => (
                    <li key={g.palabra} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-foreground">{g.palabra}</span>
                        <span className="text-muted-foreground mx-2">—</span>
                        <span className="text-foreground text-sm">{g.definicion}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveGlosario(g.palabra)}
                        aria-label={`Eliminar "${g.palabra}" del glosario`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Formulario inline para agregar */}
              <div className="space-y-3 pt-1">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={glosarioPalabra}
                    onChange={(e) => setGlosarioPalabra(e.target.value)}
                    placeholder="Palabra (ej: mascota)"
                    className="h-11 border-2 flex-1"
                    aria-label="Palabra del glosario"
                  />
                  <Input
                    type="text"
                    value={glosarioDefin}
                    onChange={(e) => setGlosarioDefin(e.target.value)}
                    placeholder="Definición simple para niños"
                    className="h-11 border-2 flex-[2]"
                    aria-label="Definición de la palabra"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddGlosario())}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 px-4 border-2 shrink-0"
                    onClick={handleAddGlosario}
                  >
                    <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                    Agregar
                  </Button>
                </div>
                {glosarioError && (
                  <p className="text-sm text-destructive" role="alert">{glosarioError}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Material Audiovisual */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <Youtube className="w-6 h-6 text-red-500" aria-hidden="true" />
                Material Audiovisual
                <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Pega el enlace de un video de YouTube. Los estudiantes podrán verlo en la lección antes de las actividades.
              </p>
              <Input
                id="material-audiovisual"
                type="url"
                value={materialAudiovisual}
                onChange={(e) => setMaterialAudiovisual(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="h-14 text-lg border-2"
              />
              {materialAudiovisual && (
                <p className="text-xs text-muted-foreground mt-2">
                  El video se mostrará embebido en la lección del estudiante.
                </p>
              )}
            </CardContent>
          </Card>
          {/* Material PDF / Adjunto */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <Paperclip className="w-6 h-6 text-primary" aria-hidden="true" />
                Material Adjunto (PDF)
                <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Puedes pegar un enlace público de PDF (Supabase Storage, Drive público, etc.) para que el estudiante lo abra desde la lección.
              </p>
              <div className="space-y-2">
                <label htmlFor="material-pdf-titulo" className="text-sm font-semibold text-foreground block">
                  Título del material
                </label>
                <Input
                  id="material-pdf-titulo"
                  type="text"
                  value={materialPdfTitulo}
                  onChange={(e) => setMaterialPdfTitulo(e.target.value)}
                  placeholder="Ej: Guía de trabajo - Unidad 1"
                  className="h-12 text-base border-2"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="material-pdf-url" className="text-sm font-semibold text-foreground block">
                  Enlace del PDF
                </label>
                <Input
                  id="material-pdf-url"
                  type="url"
                  value={materialPdfUrl}
                  onChange={(e) => setMaterialPdfUrl(e.target.value)}
                  placeholder="https://.../archivo.pdf"
                  className="h-12 text-base border-2"
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <p className="text-destructive text-base font-medium" role="alert">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 h-16 text-xl border-2"
              onClick={onBack}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1 h-16 text-xl"
              disabled={isLoading || !title || !instructions}
            >
              <Save className="w-6 h-6 mr-3" aria-hidden="true" />
              {isLoading ? "Guardando..." : "Guardar Leccion"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
