"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccessibility } from "@/lib/accessibility-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Save, Volume2, FileText, Plus, Trash2, GripVertical, ChevronLeft, BookOpen, Youtube, Search, Paperclip, BookMarked, Pencil } from "lucide-react"
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
}

const activityTypes = [
  { id: "image", label: "Identificacion de imagenes", icon: "🖼️" },
  { id: "sound", label: "Reconocimiento de sonidos", icon: "🔊" },
  { id: "sequence", label: "Ordenar secuencias", icon: "📊" },
  { id: "multiple", label: "Opcion multiple", icon: "☑️" },
  { id: "short", label: "Respuesta corta escrita", icon: "✏️" },
  { id: "voice", label: "Respuesta por voz", icon: "🎤" },
  { id: "wordsearch", label: "Sopa de letras", icon: "🔤" },
]

const difficultyLevels = [
  { id: "facil", label: "Fácil", description: "Para comenzar" },
  { id: "medio", label: "Medio", description: "Un poco más difícil" },
  { id: "dificil", label: "Difícil", description: "Para avanzados" },
]

// Mapeo inverso: valor de DB → id del formulario
const dbToFormType: Record<string, string> = {
  identificacion: "image",
  reconocimiento_sonidos: "sound",
  secuenciacion: "sequence",
  seleccion_guiada: "multiple",
  respuesta_corta: "short",
  respuesta_oral: "voice",
  sopa_letras: "wordsearch",
}

export function EditLesson({ lessonId, onBack, onSave }: EditLessonProps) {
  const [title, setTitle] = useState("")
  const [instructions, setInstructions] = useState("")
  const [materialLectura, setMaterialLectura] = useState("")
  const [materialAudiovisual, setMaterialAudiovisual] = useState("")
  const [materialPdfUrl, setMaterialPdfUrl] = useState("")
  const [materialPdfTitulo, setMaterialPdfTitulo] = useState("")
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState("")

  // Glosario
  const [glosario, setGlosario] = useState<{ palabra: string; definicion: string }[]>([])
  const [glosarioPalabra, setGlosarioPalabra] = useState("")
  const [glosarioDefin, setGlosarioDefin] = useState("")
  const [glosarioError, setGlosarioError] = useState("")

  // Inline config state
  const [configuringType, setConfiguringType] = useState<{ type: string; label: string } | null>(null)
  const [actInstrucciones, setActInstrucciones] = useState("")
  const [actDificultad, setActDificultad] = useState("facil")
  const [actOptions, setActOptions] = useState<{ id: string; text: string; isCorrect: boolean }[]>([
    { id: "1", text: "", isCorrect: false },
    { id: "2", text: "", isCorrect: false },
  ])
  const [actCorrectAnswer, setActCorrectAnswer] = useState("")
  const [actPalabrasSopa, setActPalabrasSopa] = useState<string[]>([])
  const [actPalabraInput, setActPalabraInput] = useState("")
  const { speak, settings } = useAccessibility()

  // Cargar datos existentes de la lección
  useEffect(() => {
    if (!lessonId) {
      setError("No se encontró la lección.")
      setIsFetching(false)
      return
    }

    const fetchLesson = async () => {
      const [leccionFull, actividadesResult, glosarioResult] = await Promise.all([
        supabase
          .from("leccion")
          .select("titulo, contenido, material_lectura, material_audiovisual, material_pdf_url, material_pdf_titulo")
          .eq("id_leccion", lessonId)
          .single(),
        supabase
          .from("actividad")
          .select("id_actividad, tipo, titulo, instrucciones, nivel_dificultad, orden, imagen_url, audio_url")
          .eq("id_leccion", lessonId)
          .order("orden", { ascending: true }),
        supabase
          .from("glosario")
          .select("palabra, definicion")
          .eq("id_leccion", lessonId),
      ])

      // If new columns don't exist yet in DB, fall back to basic select
      const leccionResult = leccionFull.error
        ? await supabase
          .from("leccion")
          .select("titulo, contenido")
          .eq("id_leccion", lessonId)
          .single()
        : leccionFull
      if (leccionResult.error || !leccionResult.data) {
        setError("No se pudo cargar la lección.")
        setIsFetching(false)
        return
      }

      setTitle(leccionResult.data.titulo)
      setInstructions(leccionResult.data.contenido ?? "")
      setMaterialLectura((leccionResult.data as any).material_lectura ?? "")
      setMaterialAudiovisual((leccionResult.data as any).material_audiovisual ?? "")
      setMaterialPdfUrl((leccionResult.data as any).material_pdf_url ?? "")
      setMaterialPdfTitulo((leccionResult.data as any).material_pdf_titulo ?? "")

      const diffFromInt = (n: number | null): string => {
        if (n === 1) return "facil"
        if (n === 2) return "medio"
        if (n === 3) return "dificil"
        return "facil"
      }

      const acts: ActivityItem[] = (actividadesResult.data ?? []).map((a: any) => {
        const config = parseActivityConfig(a.instrucciones)
        return {
          id: a.id_actividad,
          type: dbToFormType[a.tipo] ?? a.tipo,
          title: activityTypes.find((t) => t.id === (dbToFormType[a.tipo] ?? a.tipo))?.label ?? a.titulo,
          instrucciones: a.instrucciones ?? "",
          nivel_dificultad: typeof a.nivel_dificultad === "number"
            ? diffFromInt(a.nivel_dificultad)
            : (a.nivel_dificultad ?? "facil"),
          imagen_url: a.imagen_url ?? null,
          audio_url: a.audio_url ?? null,
          opciones: config.opciones,
          respuesta_correcta: config.respuesta_correcta,
        }
      })
      setActivities(acts)
      setGlosario(glosarioResult.data ?? [])
      setIsFetching(false)
    }

    fetchLesson()
  }, [lessonId])

  const handleSelectType = (type: string, label: string) => {
    setConfiguringType({ type, label })
    setActInstrucciones("")
    setActDificultad("facil")
    setActOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
    setActCorrectAnswer("")
    setActPalabrasSopa([])
    setActPalabraInput("")
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

  const handleConfirmActivity = () => {
    if (!configuringType) return
    const showOpciones = configuringType.type === "multiple" || configuringType.type === "image" || configuringType.type === "sound"
    const showRespuesta = configuringType.type === "short" || configuringType.type === "voice"
    const opciones = showOpciones ? actOptions.filter((o) => o.text.trim()).map((o) => ({ texto: o.text, correcta: o.isCorrect })) : undefined
    const respuesta_correcta = showRespuesta && actCorrectAnswer ? actCorrectAnswer : undefined
    const palabras_sopa = configuringType.type === "wordsearch" && actPalabrasSopa.length > 0 ? actPalabrasSopa : undefined
    const serialized = serializeActivityConfig({ instrucciones: actInstrucciones, opciones, respuesta_correcta, palabras_sopa })
    const newActivity: ActivityItem = {
      id: Date.now().toString(),
      type: configuringType.type,
      title: configuringType.label,
      instrucciones: serialized,
      nivel_dificultad: actDificultad,
      opciones,
      respuesta_correcta,
    }
    setActivities([...activities, newActivity])
    speak(`Actividad ${configuringType.label} agregada`)
    setConfiguringType(null)
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
    setGlosarioPalabra("")
    setGlosarioDefin("")
    setGlosarioError("")
  }

  const handleRemoveGlosario = (pal: string) => {
    setGlosario(glosario.filter((g) => g.palabra !== pal))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!lessonId) {
      setError("No se encontró la lección.")
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

      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
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
            audio_url: a.audio_url ?? null,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error ?? "Error al guardar la lección")
        setIsLoading(false)
        return
      }

      // Sync glosario: delete existing entries then re-insert
      await supabase.from("glosario").delete().eq("id_leccion", lessonId)
      if (glosario.length > 0) {
        await supabase.from("glosario").insert(
          glosario.map((g) => ({ id_leccion: lessonId, palabra: g.palabra, definicion: g.definicion }))
        )
      }

      speak("Leccion actualizada exitosamente")
      onSave()
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    }

    setIsLoading(false)
  }

  if (isFetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Cargando lección...</p>
      </div>
    )
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
              onClick={() => setConfiguringType(null)}
              className="h-12 w-12 p-0"
              aria-label="Volver"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configurar Actividad</h1>
              <p className="text-sm text-muted-foreground">{configuringType.label}</p>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Instrucciones para el estudiante</CardTitle>
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

          {(configuringType?.type === "multiple" || configuringType?.type === "image" || configuringType?.type === "sound") && (
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActOptions(actOptions.filter((o) => o.id !== option.id))}
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
                  onClick={() => setActOptions([...actOptions, { id: Date.now().toString(), text: "", isCorrect: false }])}
                >
                  <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
                  Agregar Opcion
                </Button>
                <p className="text-sm text-muted-foreground">Haz clic en la letra para marcar la respuesta correcta</p>
              </CardContent>
            </Card>
          )}

          {(configuringType?.type === "short" || configuringType?.type === "voice") && (
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
                  Agrega las palabras que los estudiantes deben encontrar en la sopa de letras. Se convertirán a mayúsculas automáticamente. Máximo 10 palabras.
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
                  <Button
                    type="button"
                    onClick={handleAddPalabraSopa}
                    className="h-12 px-5"
                    disabled={actPalabrasSopa.length >= 10 || !actPalabraInput.trim()}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
                {actPalabrasSopa.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {actPalabrasSopa.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-2 bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-lg border border-primary/30"
                      >
                        {word}
                        <button
                          type="button"
                          onClick={() => handleRemovePalabraSopa(word)}
                          className="text-primary hover:text-destructive transition-colors"
                          aria-label={`Eliminar ${word}`}
                        >
                          ×
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

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 h-16 text-xl border-2"
              onClick={() => setConfiguringType(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1 h-16 text-xl"
              onClick={handleConfirmActivity}
            >
              <Plus className="w-6 h-6 mr-3" aria-hidden="true" />
              Agregar Actividad
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
            <h1 className="text-2xl font-bold text-foreground">Editar Leccion</h1>
          </div>
          {settings.voiceEnabled && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => speak("Editar leccion. Modifica el titulo, las instrucciones y las actividades. Luego presiona Guardar Cambios.")}
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
                placeholder="Escribe aquí el texto de lectura para los estudiantes..."
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
                Las palabras del glosario aparecerán resaltadas en el material de lectura. Los estudiantes podrán ver su definición al hacer clic.
              </p>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Input
                  value={glosarioPalabra}
                  onChange={(e) => setGlosarioPalabra(e.target.value)}
                  placeholder="Palabra"
                  className="h-11 border-2 flex-1 min-w-[120px]"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddGlosario())}
                />
                <Input
                  value={glosarioDefin}
                  onChange={(e) => setGlosarioDefin(e.target.value)}
                  placeholder="Definición"
                  className="h-11 border-2 flex-[2] min-w-[160px]"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddGlosario())}
                />
                <Button type="button" onClick={handleAddGlosario} className="h-11 px-4 shrink-0">
                  <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                  Agregar
                </Button>
              </div>
              {glosarioError && (
                <p className="text-sm text-destructive" role="alert">{glosarioError}</p>
              )}
              {glosario.length > 0 && (
                <ul className="space-y-2">
                  {glosario.map((g) => (
                    <li key={g.palabra} className="flex items-start justify-between gap-3 bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Pencil className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                        <span className="font-semibold text-foreground capitalize">{g.palabra}</span>
                        <span className="text-muted-foreground">—</span>
                        <span className="text-foreground text-sm leading-snug">{g.definicion}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGlosario(g.palabra)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        aria-label={`Eliminar ${g.palabra} del glosario`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {glosario.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No hay palabras en el glosario todavía.</p>
              )}
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

          {/* Activities List */}
          {activities.length > 0 && (
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">
                  Actividades ({activities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {activities.map((activity, index) => (
                    <li
                      key={activity.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <GripVertical className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                        <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-primary">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-medium text-foreground block">{activity.title}</span>
                          {activity.instrucciones && (
                            <span className="text-sm text-muted-foreground line-clamp-1">{activity.instrucciones}</span>
                          )}
                          <span className="text-xs text-muted-foreground capitalize">{activity.nivel_dificultad}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveActivity(activity.id)}
                        aria-label={`Eliminar ${activity.title}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

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
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
