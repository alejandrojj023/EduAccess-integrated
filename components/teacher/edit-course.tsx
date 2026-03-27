"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccessibility } from "@/lib/accessibility-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Save, Volume2, BookOpen } from "lucide-react"

interface EditCourseProps {
  courseId: string | null
  onBack: () => void
  onSave: () => void
}

const materias = [
  { id: "español",     label: "Español" },
  { id: "matematicas", label: "Matemáticas" },
  { id: "otra",        label: "Otra materia" },
]

const gradeLabels: Record<string, string> = {
  "1": "1er Grado",
  "2": "2do Grado",
  "3": "3er Grado",
}

export function EditCourse({ courseId, onBack, onSave }: EditCourseProps) {
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [materia, setMateria] = useState("español")
  const [materiaPers, setMateriaPers] = useState("")
  const [grade, setGrade] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState("")
  const { speak, settings } = useAccessibility()

  useEffect(() => {
    if (!courseId) {
      setError("No se encontró el curso.")
      setIsFetching(false)
      return
    }

    const fetchCourse = async () => {
      const { data, error: fetchError } = await supabase
        .from("curso")
        .select("titulo, descripcion, materia, materia_personalizada, grupo:id_grupo ( grado )")
        .eq("id_curso", courseId)
        .single()

      if (fetchError || !data) {
        setError("No se pudo cargar el curso.")
        setIsFetching(false)
        return
      }

      setTitulo(data.titulo)
      setDescripcion(data.descripcion ?? "")
      setMateria(data.materia ?? "español")
      setMateriaPers((data as any).materia_personalizada ?? "")
      setGrade(gradeLabels[(data.grupo as any)?.grado] ?? "")
      setIsFetching(false)
    }

    fetchCourse()
  }, [courseId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!courseId) {
      setError("No se encontró el curso.")
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

      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            titulo,
            descripcion,
            materia,
            materia_personalizada: materia === "otra" ? materiaPers.trim() : null,
          }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error ?? "Error al guardar el curso")
        setIsLoading(false)
        return
      }

      speak("Curso actualizado exitosamente")
      onSave()
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    }

    setIsLoading(false)
  }

  if (isFetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Cargando curso...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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
            <h1 className="text-2xl font-bold text-foreground">Editar Curso</h1>
          </div>
          {settings.voiceEnabled && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => speak("Editar curso. Modifica el titulo, descripcion y materia del curso. Luego presiona Guardar Cambios.")}
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
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-primary" aria-hidden="true" />
                Informacion del Curso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {grade && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Grado: <span className="font-semibold text-foreground">{grade}</span>{" "}
                    <span className="text-xs">(no editable)</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="course-title" className="text-lg font-semibold text-foreground block">
                  Titulo del curso
                </label>
                <Input
                  id="course-title"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Matematicas Basicas"
                  className="h-14 text-lg border-2"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="course-desc" className="text-lg font-semibold text-foreground block">
                  Descripcion
                </label>
                <textarea
                  id="course-desc"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe brevemente el curso"
                  className="w-full min-h-[100px] p-4 text-lg border-2 border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-lg font-semibold text-foreground block">Materia</label>
                <div className="grid grid-cols-3 gap-4">
                  {materias.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMateria(m.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        materia === m.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                      aria-pressed={materia === m.id}
                    >
                      <span className={`text-base font-bold ${materia === m.id ? "text-primary" : "text-foreground"}`}>
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
                {materia === "otra" && (
                  <div className="space-y-2 pt-1">
                    <label htmlFor="materia-pers-edit" className="text-base font-medium text-foreground block">
                      Nombre de la materia
                    </label>
                    <Input
                      id="materia-pers-edit"
                      type="text"
                      value={materiaPers}
                      onChange={(e) => setMateriaPers(e.target.value)}
                      placeholder="Ej: Ciencias Naturales, Arte, Geografía..."
                      className="h-12 text-lg border-2"
                      required
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {error && (
            <p className="text-destructive text-base font-medium" role="alert">
              {error}
            </p>
          )}

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
              disabled={isLoading || !titulo || (materia === "otra" && !materiaPers.trim())}
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
