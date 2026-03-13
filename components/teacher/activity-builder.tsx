"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { parseActivityConfig, serializeActivityConfig } from "@/lib/activity-config"

interface ActivityBuilderProps {
  onBack: () => void
  onSave: () => void
}

type ActivityType = "image" | "sound" | "sequence" | "multiple" | "short" | "voice" | null
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
  lessonId: string
  lessonTitle: string
  courseTitle: string
}

interface LessonOption {
  id: string
  title: string
  courseTitle: string
}

const activityTypes = [
  { id: "image" as const,    label: "Identificacion de imagenes", icon: Image,        color: "bg-chart-1" },
  { id: "sound" as const,    label: "Reconocimiento de sonidos",  icon: Music,        color: "bg-chart-2" },
  { id: "sequence" as const, label: "Ordenar secuencias",         icon: ListOrdered,  color: "bg-chart-3" },
  { id: "multiple" as const, label: "Opcion multiple",            icon: CheckSquare,  color: "bg-chart-4" },
  { id: "short" as const,    label: "Respuesta corta escrita",    icon: PenLine,      color: "bg-chart-5" },
  { id: "voice" as const,    label: "Respuesta por voz",          icon: Mic,          color: "bg-primary" },
]

const difficultyLevels = [
  { id: "facil",   label: "Facil",   description: "Para comenzar" },
  { id: "medio",   label: "Medio",   description: "Un poco mas dificil" },
  { id: "dificil", label: "Dificil", description: "Para avanzados" },
]

const dbToFormType: Record<string, ActivityType> = {
  identificacion:         "image",
  reconocimiento_sonidos: "sound",
  secuenciacion:          "sequence",
  seleccion_guiada:       "multiple",
  respuesta_corta:        "short",
  respuesta_oral:         "voice",
}

const dbToTypeLabel: Record<string, string> = {
  identificacion:         "Identificacion de imagenes",
  reconocimiento_sonidos: "Reconocimiento de sonidos",
  secuenciacion:          "Ordenar secuencias",
  seleccion_guiada:       "Opcion multiple",
  respuesta_corta:        "Respuesta corta escrita",
  respuesta_oral:         "Respuesta por voz",
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
      .select("id_actividad, tipo, instrucciones, nivel_dificultad, id_leccion, orden")
      .in("id_leccion", leccionIds)
      .order("orden", { ascending: true })

    const mapped: ExistingActivity[] = (actividadesRaw ?? []).map((a: any) => ({
      id: a.id_actividad,
      type: dbToFormType[a.tipo] ?? null,
      typeLabel: dbToTypeLabel[a.tipo] ?? a.tipo,
      instrucciones: a.instrucciones,
      nivel_dificultad: a.nivel_dificultad,
      lessonId: a.id_leccion,
      lessonTitle: leccionTitleMap[a.id_leccion] ?? "",
      courseTitle: cursoMap[leccionCursoMap[a.id_leccion]] ?? "",
    }))

    setExistingActivities(mapped)
    setLoadingData(false)
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
    setView("config")
  }

  const openConfigForEdit = (activity: ExistingActivity) => {
    setEditingActivity(activity)
    setSelectedType(activity.type)
    const config = parseActivityConfig(activity.instrucciones)
    setInstrucciones(config.instrucciones)
    setDificultad(difficultyFromInt(activity.nivel_dificultad))
    if (config.opciones && config.opciones.length > 0) {
      setOptions(config.opciones.map((o, i) => ({ id: String(i + 1), text: o.texto, isCorrect: o.correcta })))
    } else {
      setOptions([{ id: "1", text: "", isCorrect: false }, { id: "2", text: "", isCorrect: false }])
    }
    setCorrectAnswer(config.respuesta_correcta ?? "")
    setSaveError("")
    setView("config")
  }

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveError("")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setSaveError("No hay sesión activa.")
        setIsSaving(false)
        return
      }

      const typeShowsOptions = selectedType === "multiple" || selectedType === "image" || selectedType === "sound"
      const typeShowsCorrect = selectedType === "short" || selectedType === "voice"
      const serialized = serializeActivityConfig({
        instrucciones,
        opciones: typeShowsOptions
          ? options.filter((o) => o.text.trim()).map((o) => ({ texto: o.text, correcta: o.isCorrect }))
          : undefined,
        respuesta_correcta: typeShowsCorrect && correctAnswer ? correctAnswer : undefined,
      })

      if (editingActivity) {
        // PUT existing activity
        const response = await fetch(`/api/activities/${editingActivity.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ instrucciones: serialized, nivel_dificultad: dificultad }),
        })
        if (!response.ok) {
          const data = await response.json()
          setSaveError(data.error ?? "Error al guardar")
          setIsSaving(false)
          return
        }
        const diffInt = dificultad === "facil" ? 1 : dificultad === "medio" ? 2 : 3
        setExistingActivities((prev) =>
          prev.map((a) =>
            a.id === editingActivity.id
              ? { ...a, instrucciones: serialized, nivel_dificultad: diffInt }
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
        const response = await fetch("/api/activities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            lessonId: selectedLessonId,
            type: selectedType,
            instrucciones: serialized,
            nivel_dificultad: dificultad,
          }),
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
    const showOptions = selectedType === "multiple" || selectedType === "image" || selectedType === "sound"
    const showCorrectAnswer = selectedType === "short" || selectedType === "voice"

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
                  required
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
                        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
                          option.isCorrect
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
                      className={`p-5 rounded-xl border-2 text-center transition-all ${
                        dificultad === level.id
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
                disabled={isSaving || !instrucciones || (!isEditing && lessons.length === 0)}
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
