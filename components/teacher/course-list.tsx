"use client"

import { useState } from "react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAccessibility } from "@/lib/accessibility-context"
import { useCourses } from "@/hooks/teacher/use-courses"
import {
  ArrowLeft, Plus, Trash2, BookOpen, Users, Volume2, Pause, Play, RotateCcw,
  FolderOpen, Settings, Check, UserPlus, MoreVertical,
} from "lucide-react"

interface CourseListProps {
  onNavigate: (screen: string) => void
  onBack: () => void
}

const MATERIA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  español:      { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200" },
  matematicas:  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  otra:         { bg: "bg-violet-100",  text: "text-violet-700",  border: "border-violet-200" },
}

export function CourseList({ onNavigate, onBack }: CourseListProps) {
  const { courses, loading, deleteCourse } = useCourses()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; name: string } | null>(null)
  const { speak, stopSpeak, settings } = useAccessibility()
  const [coursesAudioState, setCoursesAudioState] = useState<"idle" | "playing" | "paused" | "ended">("idle")

  const handleCopyCode = (courseId: string, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(courseId)
    setTimeout(() => setCopiedId(null), 2000)
    speak("Código copiado al portapapeles")
  }

  const handleReadInstructions = async () => {
    const text = `Lista de cursos. Tienes ${courses.length} cursos creados.`
    if (coursesAudioState === "playing") { stopSpeak(); setCoursesAudioState("paused") }
    else { setCoursesAudioState("playing"); await speak(text); setCoursesAudioState("ended") }
  }

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return
    const success = await deleteCourse(courseToDelete.id)
    if (success) speak("Curso eliminado")
    setCourseToDelete(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver al panel">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-sm font-black text-foreground leading-none">Mis Cursos</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{courses.length} cursos creados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.voiceEnabled && (
              <button type="button" onClick={handleReadInstructions}
                aria-label={coursesAudioState === "playing" ? "Pausar" : coursesAudioState === "paused" ? "Reanudar" : coursesAudioState === "ended" ? "Repetir" : "Escuchar descripción de la sección"}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
                {coursesAudioState === "playing" ? <Pause className="w-4 h-4" aria-hidden="true" />
                 : coursesAudioState === "paused" ? <Play className="w-4 h-4" aria-hidden="true" />
                 : coursesAudioState === "ended"  ? <RotateCcw className="w-4 h-4" aria-hidden="true" />
                 : <Volume2 className="w-4 h-4" aria-hidden="true" />}
                <span className="hidden sm:inline" aria-hidden="true">
                  {coursesAudioState === "playing" ? "Pausar" : coursesAudioState === "paused" ? "Reanudar" : coursesAudioState === "ended" ? "Repetir" : "Escuchar"}
                </span>
              </button>
            )}
            <button type="button" onClick={() => onNavigate("create-course")}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]">
              <Plus className="w-4 h-4" aria-hidden="true" />
              Crear curso
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-7">
        <section aria-label="Lista de cursos">
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Cargando cursos">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-3xl border-2 border-border bg-card p-5 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 rounded-md bg-muted" />
                      <div className="h-3 w-3/4 rounded-md bg-muted" />
                      <div className="flex gap-2 mt-1">
                        <div className="h-5 w-16 rounded-full bg-muted" />
                        <div className="h-5 w-20 rounded-full bg-muted" />
                        <div className="h-5 w-12 rounded-full bg-muted" />
                      </div>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-muted shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card py-16 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FolderOpen className="w-7 h-7 text-muted-foreground/50" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1">No hay cursos</h2>
              <p className="text-sm text-muted-foreground mb-5">Crea tu primer curso para comenzar</p>
              <button type="button" onClick={() => onNavigate("create-course")}
                className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.98]">
                <Plus className="w-4 h-4" aria-hidden="true" /> Crear curso
              </button>
            </div>
          ) : (
            <ul className="space-y-3 list-none p-0">
              {courses.map((course) => {
                const mc = MATERIA_COLORS[course.materiaLabel?.toLowerCase()] ?? MATERIA_COLORS.otra
                return (
                  <li key={course.id}>
                    <article aria-label={`Curso: ${course.name}`}
                      className="group rounded-3xl border-2 border-border bg-card p-5 shadow-sm transition-shadow hover:border-primary/30 hover:shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          {/* Icon */}
                          <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
                            <BookOpen className="w-6 h-6 text-primary" aria-hidden="true" />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <h2 className="text-sm font-black text-foreground truncate">{course.name}</h2>
                            {course.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{course.description}</p>
                            )}

                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {(course.grupoNombre || course.grade) && (
                                <span className="inline-flex items-center text-xs font-bold bg-muted text-foreground px-2.5 py-0.5 rounded-full">
                                  {course.grupoNombre || course.grade}
                                </span>
                              )}
                              <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${mc.bg} ${mc.text} ${mc.border}`}>
                                {course.materiaLabel}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                                aria-label={`${course.students} estudiantes`}>
                                <Users className="w-3 h-3" aria-hidden="true" />
                                <span aria-hidden="true">{course.students}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                                aria-label={`${course.lessons} lecciones`}>
                                <BookOpen className="w-3 h-3" aria-hidden="true" />
                                <span aria-hidden="true">{course.lessons} lec.</span>
                              </span>
                            </div>

                            {/* Code */}
                            {course.codigoCurso && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">Código:</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(course.id, course.codigoCurso)}
                                  aria-label={`Copiar código ${course.codigoCurso} del curso ${course.name}`}
                                  title="Clic para copiar"
                                  className={`flex items-center gap-1 font-mono font-black text-xs tracking-widest px-2 py-0.5 rounded-lg border transition-colors cursor-copy ${
                                    copiedId === course.id
                                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                      : "bg-muted text-foreground border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                                  }`}
                                >
                                  {copiedId === course.id
                                    ? <><Check className="w-3 h-3" aria-hidden="true" /> Copiado</>
                                    : course.codigoCurso}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
                                aria-label={`Opciones del curso ${course.name}`}>
                                <MoreVertical className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate(`lessons-${course.id}`)}>
                                <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />Lecciones
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate(`course-students-${course.id}?name=${encodeURIComponent(course.name)}`)}>
                                <Users className="w-4 h-4 mr-2" aria-hidden="true" />Estudiantes
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate(`invite-course-${course.id}?name=${encodeURIComponent(course.name)}`)}>
                                <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />Invitar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate(`edit-course-${course.id}`)}>
                                <Settings className="w-4 h-4 mr-2" aria-hidden="true" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => setCourseToDelete({ id: course.id, name: course.name })}
                              >
                                <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      <AlertDialog open={courseToDelete !== null} onOpenChange={(open) => { if (!open) setCourseToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{courseToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán el curso y todas sus lecciones. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteCourse}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
