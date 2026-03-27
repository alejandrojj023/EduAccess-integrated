"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAccessibility } from "@/lib/accessibility-context"
import { useCourses } from "@/hooks/teacher/use-courses"
import {
  ArrowLeft,
  Plus,
  Trash2,
  BookOpen,
  Users,
  Volume2,
  FolderOpen,
  Settings,
  Copy,
  Check,
  UserPlus,
  MoreVertical,
} from "lucide-react"

interface CourseListProps {
  onNavigate: (screen: string) => void
  onBack: () => void
}

export function CourseList({ onNavigate, onBack }: CourseListProps) {
  const { courses, loading, deleteCourse } = useCourses()
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { speak, settings } = useAccessibility()

  const handleCopyCode = (courseId: string, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(courseId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleReadInstructions = () => {
    speak(
      `Lista de cursos. Tienes ${courses.length} cursos creados. Selecciona un curso para editar o eliminar, o crea uno nuevo con el boton Crear Curso.`
    )
  }

  const handleDeleteCourse = async (courseId: string) => {
    const success = await deleteCourse(courseId)
    if (success) speak("Curso eliminado")
    setSelectedCourse(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              className="h-12 w-12 p-0"
              aria-label="Volver al panel"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mis Cursos</h1>
              <p className="text-sm text-muted-foreground">{courses.length} cursos creados</p>
            </div>
          </div>
          {settings.voiceEnabled && (
            <Button variant="outline" size="lg" onClick={handleReadInstructions} className="h-12">
              <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
              Escuchar
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Create Button */}
        <Button
          size="lg"
          className="h-16 text-xl w-full mb-8"
          onClick={() => onNavigate("create-course")}
        >
          <Plus className="w-7 h-7 mr-3" aria-hidden="true" />
          Crear Nuevo Curso
        </Button>

        {/* Course List */}
        <section aria-label="Lista de cursos">
        {courses.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
              <h3 className="text-2xl font-bold text-foreground mb-2">No hay cursos</h3>
              <p className="text-lg text-muted-foreground mb-6">
                Crea tu primer curso para comenzar
              </p>
              <Button size="lg" onClick={() => onNavigate("create-course")}>
                <Plus className="w-6 h-6 mr-2" aria-hidden="true" />
                Crear Curso
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-6 list-none p-0">
            {courses.map((course) => (
              <li key={course.id}>
              <article aria-label={`Curso: ${course.name}`}>
              <Card
                className={`border-2 shadow-lg transition-all hover:border-primary/50 ${
                  selectedCourse === course.id ? "border-primary ring-2 ring-primary/20" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-5">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0" aria-hidden="true">
                        <BookOpen className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{course.name}</h3>
                        <p className="text-base text-muted-foreground mt-1">{course.description}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          <span className="inline-flex items-center text-sm bg-secondary px-3 py-1 rounded-full font-medium">
                            {course.grupoNombre || course.grade}
                          </span>
                          <span className="inline-flex items-center text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                            {course.materiaLabel}
                          </span>
                          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" aria-hidden="true" />
                            {course.students} estudiantes
                          </span>
                          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <BookOpen className="w-4 h-4" aria-hidden="true" />
                            {course.lessons} lecciones
                          </span>
                        </div>
                        {course.codigoCurso && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-muted-foreground">Código:</span>
                            <span className="font-mono font-bold text-sm tracking-widest text-foreground bg-muted px-2 py-0.5 rounded">
                              {course.codigoCurso}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleCopyCode(course.id, course.codigoCurso)}
                              aria-label={`Copiar código del curso ${course.name}`}
                            >
                              {copiedId === course.id
                                ? <Check className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
                                : <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              }
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 border-2"
                            aria-label={`Opciones del curso ${course.name}`}
                          >
                            <MoreVertical className="w-5 h-5" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            className="text-base py-3 cursor-pointer"
                            onClick={() => onNavigate(`lessons-${course.id}`)}
                          >
                            <BookOpen className="w-4 h-4 mr-3" aria-hidden="true" />
                            Lecciones
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-base py-3 cursor-pointer"
                            onClick={() => onNavigate(`invite-course-${course.id}?name=${encodeURIComponent(course.name)}`)}
                          >
                            <UserPlus className="w-4 h-4 mr-3" aria-hidden="true" />
                            Invitar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-base py-3 cursor-pointer"
                            onClick={() => onNavigate(`edit-course-${course.id}`)}
                          >
                            <Settings className="w-4 h-4 mr-3" aria-hidden="true" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-base py-3 cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-3" aria-hidden="true" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
