"use client"

import { useState } from "react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAccessibility } from "@/lib/accessibility-context"
import { useCourses } from "@/hooks/teacher/use-courses"
import {
  ArrowLeft, Plus, Trash2, BookOpen, Users, Volume2,
  FolderOpen, Settings, Copy, Check, UserPlus, MoreVertical, ChevronRight,
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
  const { speak, settings } = useAccessibility()

  const handleCopyCode = (courseId: string, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(courseId)
    setTimeout(() => setCopiedId(null), 2000)
    speak("Código copiado al portapapeles")
  }

  const handleReadInstructions = () => {
    speak(`Lista de cursos. Tienes ${courses.length} cursos creados.`)
  }

  const handleDeleteCourse = async (courseId: string) => {
    const success = await deleteCourse(courseId)
    if (success) speak("Curso eliminado")
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
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-black text-foreground leading-none">Mis Cursos</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">{courses.length} cursos creados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.voiceEnabled && (
              <button type="button" onClick={handleReadInstructions}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
                <Volume2 className="w-4 h-4" aria-hidden />
                <span className="hidden sm:inline">Escuchar</span>
              </button>
            )}
            <button type="button" onClick={() => onNavigate("create-course")}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]">
              <Plus className="w-4 h-4" aria-hidden />
              Crear curso
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-7">
        <section aria-label="Lista de cursos">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-3xl bg-muted animate-pulse" />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card py-16 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FolderOpen className="w-7 h-7 text-muted-foreground/50" aria-hidden />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">No hay cursos</h3>
              <p className="text-sm text-muted-foreground mb-5">Crea tu primer curso para comenzar</p>
              <button type="button" onClick={() => onNavigate("create-course")}
                className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.98]">
                <Plus className="w-4 h-4" aria-hidden /> Crear curso
              </button>
            </div>
          ) : (
            <ul className="space-y-3 list-none p-0">
              {courses.map((course) => {
                const mc = MATERIA_COLORS[course.materiaLabel?.toLowerCase()] ?? MATERIA_COLORS.otra
                return (
                  <li key={course.id}>
                    <article aria-label={`Curso: ${course.name}`}
                      className="group rounded-3xl border-2 border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          {/* Icon */}
                          <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
                            <BookOpen className="w-6 h-6 text-primary" aria-hidden />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-black text-foreground truncate">{course.name}</h3>
                            {course.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{course.description}</p>
                            )}

                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {(course.grupoNombre || course.grade) && (
                                <span className="inline-flex items-center text-[11px] font-bold bg-muted text-foreground px-2.5 py-0.5 rounded-full">
                                  {course.grupoNombre || course.grade}
                                </span>
                              )}
                              <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${mc.bg} ${mc.text} ${mc.border}`}>
                                {course.materiaLabel}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Users className="w-3 h-3" aria-hidden /> {course.students}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <BookOpen className="w-3 h-3" aria-hidden /> {course.lessons} lec.
                              </span>
                            </div>

                            {/* Code */}
                            {course.codigoCurso && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[11px] text-muted-foreground">Código:</span>
                                <span className="font-mono font-black text-xs tracking-widest text-foreground bg-muted px-2 py-0.5 rounded-lg border border-border">
                                  {course.codigoCurso}
                                </span>
                                <button type="button"
                                  onClick={() => handleCopyCode(course.id, course.codigoCurso)}
                                  aria-label={`Copiar código del curso ${course.name}`}
                                  className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition-colors ${
                                    copiedId === course.id
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                  }`}>
                                  {copiedId === course.id
                                    ? <><Check className="w-3 h-3" /> Copiado</>
                                    : <><Copy className="w-3 h-3" /> Copiar</>}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onNavigate(`lessons-${course.id}`)}
                            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
                          >
                            <BookOpen className="w-3.5 h-3.5" aria-hidden /> Lecciones
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
                                aria-label={`Opciones del curso ${course.name}`}>
                                <MoreVertical className="w-4 h-4" aria-hidden />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate(`lessons-${course.id}`)}>
                                <BookOpen className="w-4 h-4 mr-2" />Lecciones
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate(`course-students-${course.id}?name=${encodeURIComponent(course.name)}`)}>
                                <Users className="w-4 h-4 mr-2" />Estudiantes
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate(`invite-course-${course.id}?name=${encodeURIComponent(course.name)}`)}>
                                <UserPlus className="w-4 h-4 mr-2" />Invitar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate(`edit-course-${course.id}`)}>
                                <Settings className="w-4 h-4 mr-2" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => handleDeleteCourse(course.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />Eliminar
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
    </div>
  )
}
