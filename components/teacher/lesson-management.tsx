"use client"

import { useState } from "react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAccessibility } from "@/lib/accessibility-context"
import { useLessons } from "@/hooks/teacher/use-lessons"
import {
  ArrowLeft, Plus, Edit, Trash2, Volume2, Pause, Play, RotateCcw,
  FileText, CheckCircle, BookOpen,
} from "lucide-react"

interface LessonManagementProps {
  courseId: string | null
  onNavigate: (screen: string) => void
  onBack: () => void
}

export function LessonManagement({ courseId, onNavigate, onBack }: LessonManagementProps) {
  const { lessons, loading, deleteLesson } = useLessons(courseId)
  const { speak, stopSpeak, settings } = useAccessibility()
  const [lessonToDelete, setLessonToDelete] = useState<{ id: string; title: string } | null>(null)
  const [lessonsAudioState, setLessonsAudioState] = useState<"idle" | "playing" | "paused" | "ended">("idle")

  const handleReadInstructions = async () => {
    if (loading) { speak("Cargando lecciones, por favor espera."); return }
    const text = `Gestión de lecciones. Tienes ${lessons.length} ${lessons.length === 1 ? "lección" : "lecciones"} en este curso.`
    if (lessonsAudioState === "playing") { stopSpeak(); setLessonsAudioState("paused") }
    else { setLessonsAudioState("playing"); await speak(text); setLessonsAudioState("ended") }
  }

  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return
    const success = await deleteLesson(lessonToDelete.id)
    if (success) speak("Lección eliminada")
    setLessonToDelete(null)
  }

  const publishedCount = lessons.filter(l => l.status === "published").length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-sm font-black text-foreground leading-none">Lecciones</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loading ? "Cargando…" : `${lessons.length} lecciones · ${publishedCount} publicadas`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.voiceEnabled && (
              <button type="button" onClick={handleReadInstructions}
                aria-label={lessonsAudioState === "playing" ? "Pausar" : lessonsAudioState === "paused" ? "Reanudar" : lessonsAudioState === "ended" ? "Repetir" : "Escuchar descripción de lecciones"}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
                {lessonsAudioState === "playing" ? <Pause className="w-4 h-4" aria-hidden="true" />
                 : lessonsAudioState === "paused" ? <Play className="w-4 h-4" aria-hidden="true" />
                 : lessonsAudioState === "ended"  ? <RotateCcw className="w-4 h-4" aria-hidden="true" />
                 : <Volume2 className="w-4 h-4" aria-hidden="true" />}
                <span className="hidden sm:inline" aria-hidden="true">
                  {lessonsAudioState === "playing" ? "Pausar" : lessonsAudioState === "paused" ? "Reanudar" : lessonsAudioState === "ended" ? "Repetir" : "Escuchar"}
                </span>
              </button>
            )}
            <button type="button" onClick={() => onNavigate("create-lesson")}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]">
              <Plus className="w-4 h-4" aria-hidden="true" />
              Nueva lección
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-7">
        <section aria-label="Lista de lecciones">
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Cargando lecciones">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-3xl border-2 border-border bg-card p-5 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 rounded-md bg-muted" />
                      <div className="h-3 w-1/3 rounded-md bg-muted" />
                      <div className="h-3 w-1/4 rounded-md bg-muted mt-1" />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <div className="h-8 w-16 rounded-xl bg-muted" />
                      <div className="h-8 w-8 rounded-xl bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : lessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card py-16 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-muted-foreground/50" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1">No hay lecciones</h2>
              <p className="text-sm text-muted-foreground mb-5">Crea tu primera lección para este curso</p>
              <button type="button" onClick={() => onNavigate("create-lesson")}
                className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.98]">
                <Plus className="w-4 h-4" aria-hidden="true" /> Nueva lección
              </button>
            </div>
          ) : (
            <ul className="space-y-3 list-none p-0">
              {lessons.map((lesson, index) => {
                const published = lesson.status === "published"
                return (
                  <li key={lesson.id}>
                    <article aria-label={`Lección ${index + 1}: ${lesson.title}`}
                      className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm transition-shadow hover:border-primary/30 hover:shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          {/* Number badge */}
                          <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${
                            published ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`} aria-hidden="true">
                            {index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-sm font-black text-foreground truncate">{lesson.title}</h2>
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                published
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {published
                                  ? <><CheckCircle className="w-3 h-3" aria-hidden="true" /> Publicada</>
                                  : <><FileText className="w-3 h-3" aria-hidden="true" /> Borrador</>}
                              </span>
                            </div>
                            {lesson.instructions && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{lesson.instructions}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Play className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                              <span className="text-xs text-muted-foreground font-medium">
                                {lesson.activitiesCount} {lesson.activitiesCount === 1 ? "actividad" : "actividades"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button"
                            onClick={() => onNavigate(`edit-lesson-${lesson.id}`)}
                            aria-label={`Editar lección ${lesson.title}`}
                            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition-all hover:bg-muted active:scale-[0.98]">
                            <Edit className="w-3.5 h-3.5" aria-hidden="true" /><span aria-hidden="true">Editar</span>
                          </button>
                          <button type="button"
                            onClick={() => setLessonToDelete({ id: lesson.id, title: lesson.title })}
                            aria-label={`Eliminar lección ${lesson.title}`}
                            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-[0.98]">
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
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

      <AlertDialog open={lessonToDelete !== null} onOpenChange={(open) => { if (!open) setLessonToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{lessonToDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán la lección y todas sus actividades. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteLesson}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
