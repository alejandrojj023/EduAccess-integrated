"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, BookOpen, Volume2, Copy, Check } from "lucide-react"

interface CreateCourseProps {
  onBack: () => void
  onSave: () => void
}

const grados = [
  { id: "1", label: "1er Grado" },
  { id: "2", label: "2do Grado" },
  { id: "3", label: "3er Grado" },
]

const materias = [
  { id: "español",     label: "Español" },
  { id: "matematicas", label: "Matemáticas" },
  { id: "otra",        label: "Otra materia" },
]

const SECCIONES_RAPIDAS = ["A", "B", "C", "D"]

const gradoShort: Record<string, string> = {
  "1": "1ro",
  "2": "2do",
  "3": "3ro",
}

export function CreateCourse({ onBack, onSave }: CreateCourseProps) {
  const { user }            = useAuth()
  const { speak, settings } = useAccessibility()

  // Campos del formulario
  const [name,        setName]        = useState("")
  const [description, setDescription] = useState("")
  const [grado,       setGrado]       = useState("")
  const [seccion,     setSeccion]     = useState("")
  const [materia,     setMateria]     = useState("español")
  const [materiaPers, setMateriaPers] = useState("")

  // Estado de guardado
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState("")

  // Pantalla de éxito
  const [codigoCurso, setCodigoCurso] = useState<string | null>(null)
  const [copied,      setCopied]      = useState(false)

  const canSave =
    !!name.trim() &&
    !!description.trim() &&
    !!grado &&
    !!seccion.trim() &&
    !(materia === "otra" && !materiaPers.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsLoading(true)
    setError("")

    try {
      // 1. Buscar grupo existente para este docente + grado + sección
      const { data: grupoExistente } = await supabase
        .from("grupo")
        .select("id_grupo")
        .eq("id_docente", user.id)
        .eq("grado", grado)
        .eq("seccion", seccion.trim().toUpperCase())
        .maybeSingle()

      let grupoId: string

      if (grupoExistente) {
        grupoId = grupoExistente.id_grupo
      } else {
        // 2. Crear grupo automáticamente
        const nombreGrupo = `${gradoShort[grado]} ${seccion.trim().toUpperCase()}`
        const { data: nuevoGrupo, error: grupoError } = await supabase
          .from("grupo")
          .insert({
            id_docente: user.id,
            nombre: nombreGrupo,
            grado,
            seccion: seccion.trim().toUpperCase(),
          })
          .select("id_grupo")
          .single()

        if (grupoError || !nuevoGrupo) {
          setError(grupoError?.message ?? "Error al crear el grupo")
          setIsLoading(false)
          return
        }
        grupoId = nuevoGrupo.id_grupo
      }

      // 3. Crear el curso
      const { data: curso, error: cursoError } = await supabase
        .from("curso")
        .insert({
          id_grupo:              grupoId,
          titulo:                name.trim(),
          descripcion:           description.trim(),
          materia,
          materia_personalizada: materia === "otra" ? materiaPers.trim() : null,
          publicado:             true,
        })
        .select("id_curso, codigo_curso")
        .single()

      if (cursoError || !curso) {
        setError(cursoError?.message ?? "Error al crear el curso")
        setIsLoading(false)
        return
      }

      speak("Curso creado exitosamente")
      setCodigoCurso(curso.codigo_curso)
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    }

    setIsLoading(false)
  }

  const handleCopy = () => {
    if (!codigoCurso) return
    navigator.clipboard.writeText(codigoCurso)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Pantalla de éxito ──
  if (codigoCurso) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b-2 border-border sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-foreground">Crear Curso</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">¡Curso creado!</h2>
          <p className="text-lg text-muted-foreground max-w-sm">
            Comparte este código con tus alumnos para que se unan al curso.
          </p>

          <div className="bg-muted rounded-2xl px-10 py-6 flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Código del curso</p>
            <p className="text-5xl font-mono font-bold tracking-[0.3em] text-foreground">
              {codigoCurso}
            </p>
            <Button
              variant="outline"
              className="mt-1 border-2 gap-2"
              onClick={handleCopy}
            >
              {copied
                ? <><Check className="w-4 h-4 text-green-600" /> Copiado</>
                : <><Copy className="w-4 h-4" /> Copiar código</>
              }
            </Button>
          </div>

          <Button
            size="lg"
            className="h-14 text-lg px-10 mt-2"
            onClick={onSave}
          >
            Ir a mis cursos
          </Button>
        </main>
      </div>
    )
  }

  // ── Formulario ──
  return (
    <div className="min-h-screen bg-background">
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
            <Button
              variant="outline"
              size="lg"
              onClick={() => speak("Crear nuevo curso. Escribe el nombre, descripcion, elige el grado, la sección y la materia del curso.")}
              className="h-12"
            >
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

              {/* Nombre */}
              <div className="space-y-2">
                <label htmlFor="course-name" className="text-lg font-semibold text-foreground block">
                  Nombre del curso
                </label>
                <Input
                  id="course-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Matemáticas Básicas"
                  className="h-14 text-lg border-2"
                  required
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label htmlFor="description" className="text-lg font-semibold text-foreground block">
                  Descripción
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe brevemente el contenido del curso"
                  className="w-full min-h-[100px] p-4 text-lg border-2 border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              {/* Grado */}
              <div className="space-y-2">
                <span className="text-lg font-semibold text-foreground block">Grado</span>
                <div className="grid grid-cols-3 gap-3">
                  {grados.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGrado(g.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        grado === g.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted"
                      }`}
                      aria-pressed={grado === g.id}
                    >
                      <span className={`text-base font-bold ${grado === g.id ? "text-primary" : "text-foreground"}`}>
                        {g.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sección */}
              <div className="space-y-2">
                <label htmlFor="seccion" className="text-lg font-semibold text-foreground block">
                  Sección
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {SECCIONES_RAPIDAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeccion(s)}
                      className={`w-12 h-12 rounded-xl border-2 font-bold text-lg transition-all ${
                        seccion === s
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted text-foreground"
                      }`}
                      aria-pressed={seccion === s}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Input
                  id="seccion"
                  type="text"
                  value={seccion}
                  onChange={(e) => setSeccion(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="Ej: A, B, C o personalizada"
                  className="h-12 text-lg border-2"
                />
                {grado && seccion.trim() && (
                  <p className="text-sm text-muted-foreground pt-1">
                    Grupo: <span className="font-semibold text-foreground">
                      {gradoShort[grado]} {seccion.trim().toUpperCase()}
                    </span>
                  </p>
                )}
              </div>

              {/* Materia */}
              <div className="space-y-3">
                <span className="text-lg font-semibold text-foreground block">Materia</span>
                <div className="grid grid-cols-3 gap-4">
                  {materias.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMateria(m.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        materia === m.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted"
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
                    <label htmlFor="materia-pers" className="text-base font-medium text-foreground block">
                      Nombre de la materia
                    </label>
                    <Input
                      id="materia-pers"
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
                  disabled={isLoading || !canSave}
                >
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
