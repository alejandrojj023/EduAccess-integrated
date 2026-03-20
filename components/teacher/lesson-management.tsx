"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAccessibility } from "@/lib/accessibility-context"
import { useLessons } from "@/hooks/teacher/use-lessons"
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Volume2,
  FileText,
  Play,
  CheckCircle,
  Settings,
} from "lucide-react"

interface LessonManagementProps {
  courseId: string | null
  onNavigate: (screen: string) => void
  onBack: () => void
}

export function LessonManagement({ courseId, onNavigate, onBack }: LessonManagementProps) {
  const { lessons, loading, deleteLesson } = useLessons(courseId)
  const { speak, settings } = useAccessibility()

  const handleReadInstructions = () => {
    speak(
      `Gestion de lecciones. Tienes ${lessons.length} lecciones en este curso. Puedes agregar, editar o eliminar lecciones.`
    )
  }

  const handleDeleteLesson = async (lessonId: string) => {
    const success = await deleteLesson(lessonId)
    if (success) speak("Leccion eliminada")
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
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Lecciones</h1>
              <p className="text-sm text-muted-foreground">
                {lessons.length} lecciones en el curso
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-5 border-2"
              onClick={() => onNavigate(`edit-course-${courseId}`)}
              disabled={!courseId}
            >
              <Settings className="w-5 h-5 mr-2" aria-hidden="true" />
              Editar Curso
            </Button>
            {settings.voiceEnabled && (
              <Button variant="outline" size="lg" onClick={handleReadInstructions} className="h-12">
                <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
                Escuchar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Create Button */}
        <Button
          size="lg"
          className="h-16 text-xl w-full mb-8"
          onClick={() => onNavigate("create-lesson")}
        >
          <Plus className="w-7 h-7 mr-3" aria-hidden="true" />
          Agregar Nueva Leccion
        </Button>

        {/* Lessons List */}
        <section aria-label="Lista de lecciones">
        {lessons.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
              <h3 className="text-2xl font-bold text-foreground mb-2">No hay lecciones</h3>
              <p className="text-lg text-muted-foreground mb-6">
                Crea tu primera leccion para este curso
              </p>
              <Button size="lg" onClick={() => onNavigate("create-lesson")}>
                <Plus className="w-6 h-6 mr-2" aria-hidden="true" />
                Crear Leccion
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-6 list-none p-0">
            {lessons.map((lesson, index) => (
              <li key={lesson.id}>
              <article aria-label={`Lección ${index + 1}: ${lesson.title}`}>
              <Card
                className="border-2 shadow-lg transition-all hover:border-primary/50"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0" aria-hidden="true">
                        <span className="text-2xl font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-foreground">{lesson.title}</h3>
                          <span
                            className={`inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full font-medium ${
                              lesson.status === "published"
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                            aria-label={lesson.status === "published" ? "Estado: Publicada" : "Estado: Borrador"}
                          >
                            {lesson.status === "published" ? (
                              <CheckCircle className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <FileText className="w-4 h-4" aria-hidden="true" />
                            )}
                            {lesson.status === "published" ? "Publicada" : "Borrador"}
                          </span>
                        </div>
                        <p className="text-base text-muted-foreground">{lesson.instructions}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <Play className="w-4 h-4" aria-hidden="true" />
                            {lesson.activitiesCount} actividades
                          </span>
                        </div>
                      </div>
                    </div>

                    <nav aria-label={`Acciones de la lección ${lesson.title}`} className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 px-6 border-2"
                        onClick={() => onNavigate(`edit-lesson-${lesson.id}`)}
                      >
                        <Edit className="w-5 h-5 mr-2" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 px-6 border-2 text-destructive hover:bg-destructive/10 hover:border-destructive"
                        onClick={() => handleDeleteLesson(lesson.id)}
                        aria-label={`Eliminar lección ${lesson.title}`}
                      >
                        <Trash2 className="w-5 h-5 mr-2" aria-hidden="true" />
                        Eliminar
                      </Button>
                    </nav>
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
