"use client"

import { useState } from "react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAccessibility } from "@/lib/accessibility-context"
import { useCourses } from "@/hooks/teacher/use-courses"
import {
  ArrowLeft, Plus, Trash2, BookOpen, Users, Volume2,
  FolderOpen, Settings, Copy, Check, UserPlus, MoreVertical,
} from "lucide-react"

interface CourseListProps {
  onNavigate: (screen: string) => void
  onBack: () => void
}

export function CourseList({ onNavigate, onBack }: CourseListProps) {
  const { courses, loading, deleteCourse } = useCourses()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { speak, settings } = useAccessibility()

  const handleCopyCode = (courseId: string, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(courseId)
    setTimeout(() => setCopiedId(null), 2000)
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
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver al panel">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">Mis Cursos</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{courses.length} cursos creados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.voiceEnabled && (
              <button type="button" onClick={handleReadInstructions}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Escuchar</span>
              </button>
            )}
            <button type="button" onClick={() => onNavigate("create-course")}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]">
              <Plus className="w-4 h-4" aria-hidden="true" />
              Crear curso
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <section aria-label="Lista de cursos">
          {courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" aria-hidden="true" />
              <h3 className="text-base font-bold text-foreground mb-1">No hay cursos</h3>
              <p className="text-sm text-muted-foreground mb-5">Crea tu primer curso para comenzar</p>
              <button type="button" onClick={() => onNavigate("create-course")}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98]">
                <Plus className="w-4 h-4" aria-hidden="true" />Crear curso
              </button>
            </div>
          ) : (
            <ul className="space-y-3 list-none p-0">
              {courses.map((course, idx) => (
                <li key={course.id}>
                  <article aria-label={`Curso: ${course.name}`}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-foreground truncate">{course.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{course.description}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                              {course.grupoNombre || course.grade}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                              {course.materiaLabel}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" aria-hidden="true" />{course.students}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <BookOpen className="w-3 h-3" aria-hidden="true" />{course.lessons} lecciones
                            </span>
                          </div>
                          {course.codigoCurso && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="text-xs text-muted-foreground">Código:</span>
                              <span className="font-mono font-bold text-xs tracking-widest text-foreground bg-muted px-2 py-0.5 rounded">
                                {course.codigoCurso}
                              </span>
                              <button type="button"
                                onClick={() => handleCopyCode(course.id, course.codigoCurso)}
                                aria-label={`Copiar código del curso ${course.name}`}
                                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                {copiedId === course.id
                                  ? <Check className="w-3 h-3 text-green-600" aria-hidden="true" />
                                  : <Copy className="w-3 h-3" aria-hidden="true" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
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
                          <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => handleDeleteCourse(course.id)}>
                            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
