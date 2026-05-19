"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { useAccessibility } from "@/lib/accessibility-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Volume2 } from "lucide-react"

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
const gradeLabels: Record<string, string> = { "1": "1er Grado", "2": "2do Grado", "3": "3er Grado" }

export function EditCourse({ courseId, onBack, onSave }: EditCourseProps) {
  const [titulo,      setTitulo]      = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [materia,     setMateria]     = useState("español")
  const [materiaPers, setMateriaPers] = useState("")
  const [grade,       setGrade]       = useState("")
  const [isLoading,   setIsLoading]   = useState(false)
  const [isFetching,  setIsFetching]  = useState(true)
  const [error,       setError]       = useState("")
  const { speak, settings } = useAccessibility()

  useEffect(() => {
    if (!courseId) { setError("No se encontró el curso."); setIsFetching(false); return }
    const fetchCourse = async () => {
      const { data, error: fetchError } = await supabase.from("curso")
        .select("titulo, descripcion, materia, materia_personalizada, grupo:id_grupo ( grado )")
        .eq("id_curso", courseId).single()
      if (fetchError || !data) { setError("No se pudo cargar el curso."); setIsFetching(false); return }
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
    setIsLoading(true); setError("")
    if (!courseId) { setError("No se encontró el curso."); setIsLoading(false); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError("No hay sesión activa."); setIsLoading(false); return }
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ titulo, descripcion, materia, materia_personalizada: materia === "otra" ? materiaPers.trim() : null }),
      })
      if (!response.ok) { const d = await response.json(); setError(d.error ?? "Error al guardar"); setIsLoading(false); return }
      speak("Curso actualizado exitosamente")
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
              <div className="h-5 w-28 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-8">
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5 animate-pulse">
            <div className="h-4 w-40 rounded-md bg-muted" />
            <div className="h-10 w-full rounded-xl bg-muted" />
            <div className="h-20 w-full rounded-xl bg-muted" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-10 rounded-xl bg-muted" />
              <div className="h-10 rounded-xl bg-muted" />
              <div className="h-10 rounded-xl bg-muted" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-base font-bold text-foreground">Editar Curso</h1>
          </div>
          {settings.voiceEnabled && (
            <button type="button"
              onClick={() => speak("Editar curso. Modifica el título, descripción y materia. Luego presiona Guardar cambios.")}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Escuchar</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-semibold text-foreground">Información del curso</h2>

            {grade && (
              <div className="rounded-xl bg-muted/50 border border-border px-4 py-2.5">
                <p className="text-xs text-muted-foreground">
                  Grado: <span className="font-semibold text-foreground">{grade}</span>{" "}
                  <span className="text-muted-foreground/60">(no editable)</span>
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="course-title" className="text-sm font-semibold text-foreground block">Título del curso</label>
              <Input id="course-title" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Matemáticas Básicas" className="border-border" required />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="course-desc" className="text-sm font-semibold text-foreground block">Descripción</label>
              <textarea id="course-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe brevemente el curso"
                className="w-full min-h-[90px] p-3 text-sm border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-semibold text-foreground block">Materia</span>
              <div className="grid grid-cols-3 gap-2">
                {materias.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMateria(m.id)} aria-pressed={materia === m.id}
                    className={`rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-all active:scale-[0.98] ${
                      materia === m.id ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "border-border bg-background text-foreground hover:bg-muted"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              {materia === "otra" && (
                <Input id="materia-pers-edit" type="text" value={materiaPers}
                  onChange={(e) => setMateriaPers(e.target.value)}
                  placeholder="Ej: Ciencias Naturales, Arte..." className="border-border mt-2" required />
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive font-medium" role="alert">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onBack}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading || !titulo || (materia === "otra" && !materiaPers.trim())}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
