"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccessibility } from "@/lib/accessibility-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Save, Volume2, FileText, Plus, Trash2, GripVertical, ChevronLeft } from "lucide-react"

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
}

const activityTypes = [
  { id: "image",    label: "Identificacion de imagenes",  icon: "🖼️" },
  { id: "sound",    label: "Reconocimiento de sonidos",   icon: "🔊" },
  { id: "sequence", label: "Ordenar secuencias",          icon: "📊" },
  { id: "multiple", label: "Opcion multiple",             icon: "☑️" },
  { id: "short",    label: "Respuesta corta escrita",     icon: "✏️" },
  { id: "voice",    label: "Respuesta por voz",           icon: "🎤" },
]

const difficultyLevels = [
  { id: "facil",   label: "Fácil",   description: "Para comenzar" },
  { id: "medio",   label: "Medio",   description: "Un poco más difícil" },
  { id: "dificil", label: "Difícil", description: "Para avanzados" },
]

// Mapeo inverso: valor de DB → id del formulario
const dbToFormType: Record<string, string> = {
  identificacion:         "image",
  reconocimiento_sonidos: "sound",
  secuenciacion:          "sequence",
  seleccion_guiada:       "multiple",
  respuesta_corta:        "short",
  respuesta_oral:         "voice",
}

export function EditLesson({ lessonId, onBack, onSave }: EditLessonProps) {
  const [title, setTitle] = useState("")
  const [instructions, setInstructions] = useState("")
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState("")

  // Inline config state
  const [configuringType, setConfiguringType] = useState<{ type: string; label: string } | null>(null)
  const [actInstrucciones, setActInstrucciones] = useState("")
  const [actDificultad, setActDificultad] = useState("facil")

  const { speak, settings } = useAccessibility()

  // Cargar datos existentes de la lección
  useEffect(() => {
    if (!lessonId) {
      setError("No se encontró la lección.")
      setIsFetching(false)
      return
    }

    const fetchLesson = async () => {
      const [leccionResult, actividadesResult] = await Promise.all([
        supabase
          .from("leccion")
          .select("titulo, contenido")
          .eq("id_leccion", lessonId)
          .single(),
        supabase
          .from("actividad")
          .select("id_actividad, tipo, titulo, instrucciones, nivel_dificultad, orden")
          .eq("id_leccion", lessonId)
          .order("orden", { ascending: true }),
      ])

      if (leccionResult.error || !leccionResult.data) {
        setError("No se pudo cargar la lección.")
        setIsFetching(false)
        return
      }

      setTitle(leccionResult.data.titulo)
      setInstructions(leccionResult.data.contenido ?? "")

      const acts: ActivityItem[] = (actividadesResult.data ?? []).map((a: any) => ({
        id: a.id_actividad,
        type: dbToFormType[a.tipo] ?? a.tipo,
        title: activityTypes.find((t) => t.id === (dbToFormType[a.tipo] ?? a.tipo))?.label ?? a.titulo,
        instrucciones: a.instrucciones ?? "",
        nivel_dificultad: a.nivel_dificultad ?? "facil",
      }))
      setActivities(acts)
      setIsFetching(false)
    }

    fetchLesson()
  }, [lessonId])

  const handleSelectType = (type: string, label: string) => {
    setConfiguringType({ type, label })
    setActInstrucciones("")
    setActDificultad("facil")
  }

  const handleConfirmActivity = () => {
    if (!configuringType) return
    const newActivity: ActivityItem = {
      id: Date.now().toString(),
      type: configuringType.type,
      title: configuringType.label,
      instrucciones: actInstrucciones,
      nivel_dificultad: actDificultad,
    }
    setActivities([...activities, newActivity])
    speak(`Actividad ${configuringType.label} agregada`)
    setConfiguringType(null)
  }

  const handleRemoveActivity = (id: string) => {
    setActivities(activities.filter((a) => a.id !== id))
    speak("Actividad eliminada")
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
          activities: activities.map((a) => ({
            type: a.type,
            title: a.title,
            instrucciones: a.instrucciones,
            nivel_dificultad: a.nivel_dificultad,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error ?? "Error al guardar la lección")
        setIsLoading(false)
        return
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
                    className={`p-5 rounded-xl border-2 text-center transition-all ${
                      actDificultad === level.id
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
