"use client"

import { useState } from "react"
import { useAccessibility } from "@/lib/accessibility-context"
import { useLessons } from "@/hooks/teacher/use-lessons"
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Volume2,
  FileText,
  Play,
  CheckCircle,
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
    if (loading) { speak("Cargando lecciones, por favor espera."); return }
    speak(`Gestion de lecciones. Tienes ${lessons.length} ${lessons.length === 1 ? "leccion" : "lecciones"} en este curso. Puedes agregar, editar o eliminar lecciones.`)
  }

  const handleDeleteLesson = async (lessonId: string) => {
    const success = await deleteLesson(lessonId)
    if (success) speak("Leccion eliminada")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">Lecciones</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loading ? "Cargando…" : `${lessons.length} lecciones en el curso`}
              </p>
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
            <button type="button" onClick={() => onNavigate("create-lesson")}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]">
              <Plus className="w-4 h-4" aria-hidden="true" />
              Nueva lección
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <section aria-label="Lista de lecciones">
          {lessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" aria-hidden="true" />
              <h3 className="text-base font-bold text-foreground mb-1">No hay lecciones</h3>
              <p className="text-sm text-muted-foreground mb-5">Crea tu primera lección para este curso</p>
              <button type="button" onClick={() => onNavigate("create-lesson")}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98]">
                <Plus className="w-4 h-4" aria-hidden="true" />Nueva lección
              </button>
            </div>
          ) : (
            <ul className="space-y-3 list-none p-0">
              {lessons.map((lesson, index) => (
                <li key={lesson.id}>
                  <article aria-label={`Lección ${index + 1}: ${lesson.title}`}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10" aria-hidden="true">
                          <span className="text-base font-bold text-primary">{index + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-foreground truncate">{lesson.title}</h3>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              lesson.status === "published"
                                ? "bg-green-100 text-green-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                              aria-label={lesson.status === "published" ? "Estado: Publicada" : "Estado: Borrador"}>
                              {lesson.status === "published"
                                ? <><CheckCircle className="w-3 h-3" aria-hidden="true" />Publicada</>
                                : <><FileText className="w-3 h-3" aria-hidden="true" />Borrador</>}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{lesson.instructions}</p>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                            <Play className="w-3 h-3" aria-hidden="true" />{lesson.activitiesCount} actividades
                          </span>
                        </div>
                      </div>
                      <nav aria-label={`Acciones de la lección ${lesson.title}`} className="flex items-center gap-2 shrink-0">
                        <button type="button"
                          onClick={() => onNavigate(`edit-lesson-${lesson.id}`)}
                          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]">
                          <Edit className="w-3.5 h-3.5" aria-hidden="true" />Editar
                        </button>
                        <button type="button"
                          onClick={() => handleDeleteLesson(lesson.id)}
                          aria-label={`Eliminar lección ${lesson.title}`}
                          className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-card px-3 py-2 text-sm font-semibold text-destructive transition-all hover:bg-destructive/10 active:scale-[0.98]">
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />Eliminar
                        </button>
                      </nav>
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
