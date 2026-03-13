"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccessibility } from "@/lib/accessibility-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Save, Volume2, BookOpen } from "lucide-react"

interface CreateCourseProps {
  onBack: () => void
  onSave: () => void
}

export function CreateCourse({ onBack, onSave }: CreateCourseProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [grade, setGrade] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { speak, settings } = useAccessibility()

  const grades = ["1er Grado", "2do Grado", "3er Grado"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError("No hay sesión activa. Inicia sesión nuevamente.")
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ titulo: name, descripcion: description, grade }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error ?? "Error al guardar el curso")
        setIsLoading(false)
        return
      }

      speak("Curso creado exitosamente")
      onSave()
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    }

    setIsLoading(false)
  }

  const handleReadInstructions = () => {
    speak(
      "Crear nuevo curso. Ingresa el nombre del curso, una descripcion breve, y selecciona el grado escolar. Luego presiona el boton Guardar Curso."
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-foreground">Crear Curso</h1>
          </div>
          {settings.voiceEnabled && (
            <Button variant="outline" size="lg" onClick={handleReadInstructions} className="h-12">
              <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
              Escuchar
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-primary-foreground" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl">Nuevo Curso</CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="course-name" className="text-lg font-semibold text-foreground block">
                  Nombre del curso
                </label>
                <Input
                  id="course-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Matematicas Basicas"
                  className="h-14 text-lg border-2"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-lg font-semibold text-foreground block">
                  Descripcion
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe brevemente el contenido del curso"
                  className="w-full min-h-[120px] p-4 text-lg border-2 border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div className="space-y-3">
                <span className="text-lg font-semibold text-foreground block">Grado escolar</span>
                <div className="grid grid-cols-3 gap-4">
                  {grades.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`p-5 rounded-xl border-2 text-lg font-semibold transition-all ${
                        grade === g
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted text-foreground"
                      }`}
                      aria-pressed={grade === g}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-destructive text-base font-medium" role="alert">
                  {error}
                </p>
              )}

              <div className="flex gap-4 pt-4">
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
                  disabled={isLoading || !name || !description || !grade}
                >
                  <Save className="w-6 h-6 mr-3" aria-hidden="true" />
                  {isLoading ? "Guardando..." : "Guardar Curso"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
