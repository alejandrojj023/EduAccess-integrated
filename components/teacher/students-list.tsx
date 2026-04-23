"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAuth } from "@/lib/auth-context"
import { useStudents } from "@/hooks/teacher/use-students"
import { useSpeakOnHover } from "@/components/ui/accessible-tooltip"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft,
  Volume2,
  Search,
  User,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  BookOpen,
  Loader2,
} from "lucide-react"

interface CursoDelAlumno {
  id_curso: string
  titulo: string
}

interface StudentsListProps {
  onNavigate: (screen: string) => void
  onBack: () => void
}

export function StudentsList({ onNavigate, onBack }: StudentsListProps) {
  const { students, loading } = useStudents()
  const [searchQuery, setSearchQuery] = useState("")
  const { speak, settings } = useAccessibility()
  const { user } = useAuth()

  const [selectorAbierto,    setSelectorAbierto]    = useState(false)
  const [cursosDisponibles,  setCursosDisponibles]  = useState<CursoDelAlumno[]>([])
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<{ id: string; nombre: string } | null>(null)
  const [buscandoCursos,     setBuscandoCursos]     = useState<string | null>(null)
  const [errorReporte,       setErrorReporte]       = useState<string | null>(null)

  const abrirReporte = (alumnoId: string, cursoId: string, cursoTitulo: string) => {
    const qs = new URLSearchParams({ name: cursoTitulo, openStudent: alumnoId, back: "students" }).toString()
    onNavigate(`course-students-${cursoId}?${qs}`)
  }

  const handleVerReporte = async (alumnoId: string, alumnoNombre: string) => {
    if (!user) return
    setErrorReporte(null)
    setBuscandoCursos(alumnoId)

    const { data: grupos } = await supabase.from("grupo").select("id_grupo").eq("id_docente", user.id)
    const grupoIds = new Set((grupos ?? []).map((g: any) => g.id_grupo))

    const { data: cursosDelAlumno } = await supabase
      .from("alumno_curso")
      .select("id_curso, curso:id_curso(id_curso, titulo, id_grupo)")
      .eq("id_alumno", alumnoId)

    const cursosFiltrados: CursoDelAlumno[] = (cursosDelAlumno ?? [])
      .map((ac: any) => ac.curso)
      .filter((c: any) => c && grupoIds.has(c.id_grupo))
      .map((c: any) => ({ id_curso: c.id_curso, titulo: c.titulo }))

    setBuscandoCursos(null)

    if (cursosFiltrados.length === 0) {
      setErrorReporte("Este alumno no está inscrito en ninguno de tus cursos")
      setTimeout(() => setErrorReporte(null), 4000)
      return
    }

    if (cursosFiltrados.length === 1) {
      abrirReporte(alumnoId, cursosFiltrados[0].id_curso, cursosFiltrados[0].titulo)
      return
    }

    setCursosDisponibles(cursosFiltrados)
    setAlumnoSeleccionado({ id: alumnoId, nombre: alumnoNombre })
    setSelectorAbierto(true)
  }

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const studentsNeedingSupport = students.filter((s) => s.needsSupport).length
  const averageProgress = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length)
    : 0

  const hoverTotal    = useSpeakOnHover(`Total de estudiantes inscritos en tus cursos: ${students.length}`)
  const hoverPromedio = useSpeakOnHover(`Progreso promedio: porcentaje de avance de todos tus alumnos. Actualmente ${averageProgress}%`)
  const hoverApoyo    = useSpeakOnHover(`Estudiantes que necesitan apoyo adicional: ${studentsNeedingSupport}`)

  const handleReadInstructions = () => {
    speak(`Lista de estudiantes. Tienes ${students.length} estudiantes. El progreso promedio es ${averageProgress} por ciento. ${studentsNeedingSupport} estudiantes necesitan apoyo adicional.`)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Regresar al panel principal">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">Mis Estudiantes</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{students.length} estudiantes</p>
            </div>
          </div>
          {settings.voiceEnabled && (
            <button type="button" onClick={handleReadInstructions}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Escuchar</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Summary Cards */}
        <section aria-label="Resumen de estudiantes" className="mb-6">
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 list-none p-0">
            <li>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-4 flex items-center gap-4" {...hoverTotal}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10" aria-hidden="true">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{students.length}</p>
                  <p className="text-xs text-muted-foreground">Total Estudiantes</p>
                </div>
              </div>
            </li>
            <li>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-4 flex items-center gap-4" {...hoverPromedio}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100" aria-hidden="true">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{averageProgress}%</p>
                  <p className="text-xs text-muted-foreground">Progreso Promedio</p>
                </div>
              </div>
            </li>
            <li>
              <div className="rounded-2xl border border-border bg-card shadow-sm p-4 flex items-center gap-4" {...hoverApoyo}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100" aria-hidden="true">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{studentsNeedingSupport}</p>
                  <p className="text-xs text-muted-foreground">Necesitan Apoyo</p>
                </div>
              </div>
            </li>
          </ul>
        </section>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Buscar estudiante por nombre..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border-border" aria-label="Buscar estudiante" />
        </div>

        {/* Students List */}
        <section aria-label="Lista de estudiantes">
          {filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
              <User className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" aria-hidden="true" />
              <h3 className="text-base font-bold text-foreground mb-1">No se encontraron estudiantes</h3>
              <p className="text-sm text-muted-foreground">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <ul className="space-y-3 list-none p-0">
              {filteredStudents.map((student) => (
                <li key={student.id}>
                  <article
                    aria-label={`${student.name}${student.needsSupport ? ", necesita apoyo" : ""}, progreso ${student.progress}%`}
                    className={`rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md ${
                      student.needsSupport ? "border-amber-200 bg-amber-50/30" : "border-border hover:border-primary/20"
                    }`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold text-primary-foreground ${
                          student.needsSupport ? "bg-amber-500" : "bg-primary"
                        }`} aria-hidden="true">
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-foreground">{student.name}</h3>
                            {student.needsSupport && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium">
                                <AlertCircle className="w-3 h-3" aria-hidden="true" />Necesita apoyo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" aria-hidden="true" /><time>{student.lastActive}</time>
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" aria-hidden="true" />
                              {student.completedActivities}/{student.totalActivities} actividades
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="w-32" aria-label={`Progreso: ${student.progress}%`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">Progreso</span>
                            <span className={`text-sm font-bold ${
                              student.progress >= 70 ? "text-green-600"
                              : student.progress >= 40 ? "text-amber-600"
                              : "text-destructive"
                            }`} aria-hidden="true">{student.progress}%</span>
                          </div>
                          <Progress value={student.progress} className="h-2" />
                        </div>

                        <button type="button"
                          onClick={() => handleVerReporte(student.id, student.name)}
                          disabled={buscandoCursos === student.id}
                          aria-label={`Ver reporte de ${student.name}`}
                          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50">
                          {buscandoCursos === student.id
                            ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            : <Eye className="w-4 h-4" aria-hidden="true" />}
                          Ver Reporte
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Error banner */}
        {errorReporte && (
          <div role="alert"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-6 py-4 rounded-2xl shadow-xl border border-destructive flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-medium">{errorReporte}</p>
          </div>
        )}
      </main>

      {/* Course selector dialog */}
      <Dialog open={selectorAbierto} onOpenChange={setSelectorAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Ver reporte de{alumnoSeleccionado ? ` ${alumnoSeleccionado.nombre}` : ""}:
            </DialogTitle>
            <DialogDescription>
              Este alumno está inscrito en varios de tus cursos. Selecciona uno para ver su reporte.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            {cursosDisponibles.map((c) => (
              <button key={c.id_curso} type="button"
                onClick={() => {
                  if (!alumnoSeleccionado) return
                  setSelectorAbierto(false)
                  abrirReporte(alumnoSeleccionado.id, c.id_curso, c.titulo)
                }}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted hover:border-primary/40 active:scale-[0.98] transition-all">
                <BookOpen className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span>{c.titulo}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
