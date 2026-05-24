"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Volume2, Pause, Play, RotateCcw, Copy, Check } from "lucide-react"

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
const gradoShort: Record<string, string> = { "1": "1ro", "2": "2do", "3": "3ro" }

export function CreateCourse({ onBack, onSave }: CreateCourseProps) {
  const { user } = useAuth()
  const { speak, stopSpeak, settings } = useAccessibility()
  const [createCourseAudioState, setCreateCourseAudioState] = useState<"idle" | "playing" | "paused" | "ended">("idle")

  const [name,        setName]        = useState("")
  const [description, setDescription] = useState("")
  const [grado,       setGrado]       = useState("")
  const [seccion,     setSeccion]     = useState("")
  const [materia,     setMateria]     = useState("español")
  const [materiaPers, setMateriaPers] = useState("")
  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState("")
  const [codigoCurso, setCodigoCurso] = useState<string | null>(null)
  const [copied,      setCopied]      = useState(false)

  const canSave = !!name.trim() && !!description.trim() && !!grado && !!seccion.trim() &&
    !(materia === "otra" && !materiaPers.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsLoading(true); setError("")
    try {
      const { data: grupoExistente } = await supabase.from("grupo").select("id_grupo")
        .eq("id_docente", user.id).eq("grado", grado).eq("seccion", seccion.trim().toUpperCase()).maybeSingle()

      let grupoId: string
      if (grupoExistente) {
        grupoId = grupoExistente.id_grupo
      } else {
        const nombreGrupo = `${gradoShort[grado]} ${seccion.trim().toUpperCase()}`
        const { data: nuevoGrupo, error: grupoError } = await supabase.from("grupo")
          .insert({ id_docente: user.id, nombre: nombreGrupo, grado, seccion: seccion.trim().toUpperCase() })
          .select("id_grupo").single()
        if (grupoError || !nuevoGrupo) { setError(grupoError?.message ?? "Error al crear el grupo"); setIsLoading(false); return }
        grupoId = nuevoGrupo.id_grupo
      }

      const { data: curso, error: cursoError } = await supabase.from("curso")
        .insert({ id_grupo: grupoId, titulo: name.trim(), descripcion: description.trim(), materia,
          materia_personalizada: materia === "otra" ? materiaPers.trim() : null, publicado: true })
        .select("id_curso, codigo_curso").single()

      if (cursoError || !curso) { setError(cursoError?.message ?? "Error al crear el curso"); setIsLoading(false); return }
      speak("Curso creado exitosamente")
      setCodigoCurso(curso.codigo_curso)
    } catch { setError("Error de conexión. Intenta de nuevo.") }
    setIsLoading(false)
  }

  const handleCopy = () => {
    if (!codigoCurso) return
    navigator.clipboard.writeText(codigoCurso)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  /* ── Success screen ── */
  if (codigoCurso) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-2xl items-center px-6">
            <h1 className="text-base font-bold text-foreground">Crear Curso</h1>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-16 flex flex-col items-center text-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="w-8 h-8 text-green-600" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">¡Curso creado!</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Comparte este código con tus alumnos para que se unan al curso.
          </p>
          <div className="rounded-2xl border border-border bg-muted/40 px-8 py-5 flex flex-col items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Código del curso</p>
            <p className="text-4xl font-mono font-bold tracking-[0.3em] text-foreground">{codigoCurso}</p>
            <button type="button" onClick={handleCopy}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]">
              {copied ? <><Check className="w-4 h-4 text-green-600" aria-hidden="true" />Copiado</> : <><Copy className="w-4 h-4" aria-hidden="true" />Copiar código</>}
            </button>
          </div>
          <button type="button" onClick={onSave}
            className="rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]">
            Ir a mis cursos
          </button>
        </main>
      </div>
    )
  }

  /* ── Form ── */
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <h1 className="text-base font-bold text-foreground">Crear Curso</h1>
          </div>
          {settings.voiceEnabled && (
            <button type="button"
              onClick={async () => {
                const text = "Crear nuevo curso. Escribe el nombre, descripción, elige el grado, sección y materia."
                if (createCourseAudioState === "playing") { stopSpeak(); setCreateCourseAudioState("paused") }
                else { setCreateCourseAudioState("playing"); await speak(text); setCreateCourseAudioState("ended") }
              }}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label={createCourseAudioState === "playing" ? "Pausar" : createCourseAudioState === "paused" ? "Reanudar" : createCourseAudioState === "ended" ? "Repetir" : "Escuchar instrucciones"}>
              {createCourseAudioState === "playing" ? <Pause className="w-4 h-4" aria-hidden="true" />
               : createCourseAudioState === "paused" ? <Play className="w-4 h-4" aria-hidden="true" />
               : createCourseAudioState === "ended"  ? <RotateCcw className="w-4 h-4" aria-hidden="true" />
               : <Volume2 className="w-4 h-4" aria-hidden="true" />}
              <span className="hidden sm:inline">
                {createCourseAudioState === "playing" ? "Pausar" : createCourseAudioState === "paused" ? "Reanudar" : createCourseAudioState === "ended" ? "Repetir" : "Escuchar"}
              </span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-1.5">
              <label htmlFor="course-name" className="text-sm font-semibold text-foreground block">Nombre del curso</label>
              <Input id="course-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Matemáticas Básicas" className="border-border" required
                onInvalid={(e) => (e.currentTarget as HTMLInputElement).setCustomValidity("Por favor, completa este campo.")}
                onInput={(e) => (e.currentTarget as HTMLInputElement).setCustomValidity("")} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-semibold text-foreground block">Descripción</label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe brevemente el contenido del curso"
                className="w-full min-h-[90px] p-3 text-sm border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" required
                onInvalid={(e) => (e.currentTarget as HTMLTextAreaElement).setCustomValidity("Por favor, completa este campo.")}
                onInput={(e) => (e.currentTarget as HTMLTextAreaElement).setCustomValidity("")} />
            </div>

            <div className="space-y-2">
              <span id="grado-label" className="text-sm font-semibold text-foreground block">Grado</span>
              <div role="group" aria-labelledby="grado-label" className="grid grid-cols-3 gap-2">
                {grados.map((g) => (
                  <button key={g.id} type="button" onClick={() => setGrado(g.id)} aria-pressed={grado === g.id}
                    className={`rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-all active:scale-[0.98] ${
                      grado === g.id ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "border-border bg-background text-foreground hover:bg-muted"}`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="seccion" className="text-sm font-semibold text-foreground block">Sección</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {SECCIONES_RAPIDAS.map((s) => (
                  <button key={s} type="button" onClick={() => setSeccion(s)} aria-pressed={seccion === s}
                    className={`h-10 w-10 rounded-xl border text-sm font-bold transition-all active:scale-[0.98] ${
                      seccion === s ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "border-border bg-background text-foreground hover:bg-muted"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <Input id="seccion" type="text" value={seccion}
                onChange={(e) => setSeccion(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="Ej: A, B, C o personalizada" className="border-border" />
              {grado && seccion.trim() && (
                <p className="text-xs text-muted-foreground">
                  Grupo: <span className="font-semibold text-foreground">{gradoShort[grado]} {seccion.trim().toUpperCase()}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <span id="materia-label" className="text-sm font-semibold text-foreground block">Materia</span>
              <div role="group" aria-labelledby="materia-label" className="grid grid-cols-3 gap-2">
                {materias.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMateria(m.id)} aria-pressed={materia === m.id}
                    className={`rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-all active:scale-[0.98] ${
                      materia === m.id ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "border-border bg-background text-foreground hover:bg-muted"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              {materia === "otra" && (
                <>
                  <label htmlFor="materia-pers" className="sr-only">Nombre de la materia personalizada</label>
                  <Input id="materia-pers" type="text" value={materiaPers}
                  onChange={(e) => setMateriaPers(e.target.value)}
                  placeholder="Ej: Ciencias Naturales, Arte, Geografía..." className="border-border mt-2" required
                  onInvalid={(e) => (e.currentTarget as HTMLInputElement).setCustomValidity("Por favor, completa este campo.")}
                  onInput={(e) => (e.currentTarget as HTMLInputElement).setCustomValidity("")} />
                </>
              )}
            </div>

            {error && <p className="text-sm text-destructive font-medium" role="alert">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onBack}
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]">
                Cancelar
              </button>
              <button type="submit" disabled={isLoading || !canSave}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? "Guardando..." : "Guardar curso"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
