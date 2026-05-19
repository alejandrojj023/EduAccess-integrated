"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, BookOpen, ChevronRight, CheckCircle2, Star, Lock } from "lucide-react"
import { VoiceAssistant } from "@/components/student/voice-assistant"

function StarRow({ stars, size = "w-4 h-4" }: { stars: number | null; size?: string }) {
  if (stars == null || stars === 0) return null
  return (
    <div className="flex gap-0.5" title={`${stars.toFixed(1)} ⭐`} aria-label={`${stars.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fillPct = stars >= i ? 100 : stars > i - 1 ? Math.round((stars - (i - 1)) * 100) : 0
        return (
          <span key={i} className="relative inline-flex shrink-0">
            <Star className={`${size} text-amber-200 fill-amber-100`} />
            {fillPct > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
                <Star className={`${size} text-amber-400 fill-amber-400`} />
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

interface Lesson {
  id_leccion: string
  titulo: string
  contenido: string | null
  orden: number
  pct_completado: number
  total_actividades: number
  estrellas: number | null
}

interface StudentCourseProps {
  courseId: string | null
  courseName: string | null
  onSelectLesson: (id: string, name: string) => void
  onBack: () => void
}

export function StudentCourse({ courseId, courseName, onSelectLesson, onBack }: StudentCourseProps) {
  const { user } = useAuth()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [highlightedLessonIdx, setHighlightedLessonIdx] = useState<number | null>(null)

  useEffect(() => {
    if (!user || !courseId) return
    load()
  }, [user, courseId])

  async function load() {
    setLoading(true)
    const { data: leccionesRaw } = await supabase
      .from("leccion")
      .select("id_leccion, titulo, contenido, orden")
      .eq("id_curso", courseId!)
      .eq("publicado", true)
      .order("orden", { ascending: true })

    if (!leccionesRaw) { setLoading(false); return }

    const ids = leccionesRaw.map(l => l.id_leccion)
    const [progResult, actCountResult] = await Promise.all([
      supabase
        .from("progresion_alumno")
        .select("id_leccion, pct_completado, estrellas")
        .eq("id_alumno", user!.id)
        .in("id_leccion", ids),
      supabase
        .from("actividad")
        .select("id_leccion")
        .in("id_leccion", ids)
        .eq("publicado", true),
    ])

    const progMap = new Map(progResult.data?.map(p => [p.id_leccion, p]) ?? [])
    const actCount = new Map<string, number>()
    for (const a of actCountResult.data ?? []) {
      actCount.set(a.id_leccion, (actCount.get(a.id_leccion) ?? 0) + 1)
    }

    setLessons(leccionesRaw.map(l => ({
      ...l,
      pct_completado:    progMap.get(l.id_leccion)?.pct_completado ?? 0,
      estrellas:         progMap.get(l.id_leccion)?.estrellas ?? null,
      total_actividades: actCount.get(l.id_leccion) ?? 0,
    })))
    setLoading(false)
  }

  const completadas = lessons.filter(l => l.pct_completado >= 100).length
  const overallPct  = lessons.length > 0 ? Math.round((completadas / lessons.length) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center gap-4">
          <button
            onClick={onBack}
            aria-label="Volver a mis cursos"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.97] shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-foreground truncate leading-tight">{courseName}</h1>
              <p className="text-xs text-muted-foreground">{completadas} de {lessons.length} lecciones</p>
            </div>
          </div>

          {lessons.length > 0 && (
            <div className="shrink-0 flex items-center gap-2">
              <div className="hidden sm:block w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${overallPct}%` }} />
              </div>
              <span className="text-xs font-black text-primary">{overallPct}%</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-7">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando lecciones">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-3xl border-2 border-border bg-card p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded-md bg-muted" />
                    <div className="h-3 w-1/2 rounded-md bg-muted" />
                    <div className="h-2 w-full rounded-full bg-muted mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Este curso aún no tiene lecciones disponibles.</p>
          </div>
        ) : (
          <ul className="space-y-3 list-none p-0">
            {lessons.map((lesson, i) => {
              const done    = lesson.pct_completado >= 100
              const started = lesson.pct_completado > 0 && !done
              const locked  = i > 0 && lessons[i - 1].pct_completado < 100 && !started && !done

              return (
                <li key={lesson.id_leccion}>
                  <article>
                    <button
                      type="button"
                      onClick={() => !locked && onSelectLesson(lesson.id_leccion, lesson.titulo)}
                      disabled={locked}
                      className={`group w-full rounded-3xl border-2 p-5 text-left shadow-sm transition-all duration-200 ${
                        done
                          ? "border-border bg-card hover:border-primary/40 hover:shadow-md"
                          : started
                            ? "border-primary/30 bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
                            : locked
                              ? "border-border bg-muted/30 cursor-not-allowed opacity-60"
                              : "border-border bg-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                      } ${highlightedLessonIdx === i ? "ring-4 ring-emerald-400/70 ring-offset-2 ring-offset-background scale-[1.02] shadow-2xl" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Number / check / lock */}
                        <div
                          className={`relative w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm ${
                            done    ? "bg-emerald-500 text-white"
                            : started ? "bg-primary text-primary-foreground"
                            : locked  ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                          }`}
                          aria-hidden
                        >
                          {done   ? <CheckCircle2 className="w-6 h-6" />
                          : locked ? <Lock className="w-5 h-5" />
                          : <span>{i + 1}</span>}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-foreground text-sm leading-tight truncate">
                              {lesson.titulo}
                            </p>
                            <StarRow stars={lesson.estrellas} size="w-3.5 h-3.5" />
                          </div>

                          {lesson.contenido && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {lesson.contenido}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
                              {lesson.total_actividades} actividad{lesson.total_actividades !== 1 ? "es" : ""}
                            </span>

                            {(started || done) && (
                              <div className="flex items-center gap-1.5 flex-1">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : "bg-primary"}`}
                                    style={{ width: `${lesson.pct_completado}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold w-9 text-right ${done ? "text-emerald-500 dark:text-emerald-400" : "text-primary"}`}>
                                  {lesson.pct_completado}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {!locked && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                        )}
                      </div>
                    </button>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {!loading && (
        <VoiceAssistant
          // Required dashboard props (unused in lessons mode but required by type)
          firstName=""
          estrellasTotales={0}
          nivelActual={0}
          nivelNombre=""
          streakDays={0}
          courses={[]}
          onNavigate={() => {}}
          // Lessons mode
          courseName={courseName ?? ""}
          lessons={lessons}
          onSelectLesson={onSelectLesson}
          onHighlightLesson={setHighlightedLessonIdx}
          onBack={onBack}
        />
      )}
    </div>
  )
}
