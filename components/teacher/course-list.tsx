"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAccessibility } from "@/lib/accessibility-context"
import { useCourses } from "@/hooks/teacher/use-courses"
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Users,
  Volume2,
  FolderOpen,
  Settings,
} from "lucide-react"

interface CourseListProps {
  onNavigate: (screen: string) => void
  onBack: () => void
}

export function CourseList({ onNavigate, onBack }: CourseListProps) {
  const { courses, loading, deleteCourse } = useCourses()
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const { speak, settings } = useAccessibility()

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
          <div className="grid gap-6">
            {courses.map((course) => (
              <Card
                key={course.id}
                className={`border-2 shadow-lg transition-all hover:border-primary/50 ${
                  selectedCourse === course.id ? "border-primary ring-2 ring-primary/20" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-5">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                        <BookOpen className="w-8 h-8 text-primary" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{course.name}</h3>
                        <p className="text-base text-muted-foreground mt-1">{course.description}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          <span className="inline-flex items-center text-sm bg-secondary px-3 py-1 rounded-full font-medium">
                            {course.grade}
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
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-col lg:flex-row">
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 px-6 border-2"
                        onClick={() => onNavigate(`lessons-${course.id}`)}
                      >
                        <Edit className="w-5 h-5 mr-2" aria-hidden="true" />
                        Lecciones
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 px-6 border-2"
                        onClick={() => onNavigate(`edit-course-${course.id}`)}
                      >
                        <Settings className="w-5 h-5 mr-2" aria-hidden="true" />
                        Editar Info
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 px-6 border-2 text-destructive hover:bg-destructive/10 hover:border-destructive"
                        onClick={() => handleDeleteCourse(course.id)}
                      >
                        <Trash2 className="w-5 h-5 mr-2" aria-hidden="true" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
