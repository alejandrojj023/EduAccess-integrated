"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, BookOpen, ChevronRight, CheckCircle2 } from "lucide-react"

interface Lesson {
  id_leccion: string
  titulo: string
  contenido: string | null
  orden: number
  pct_completado: number
  total_actividades: number
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
        .select("id_leccion, pct_completado")
        .eq("id_alumno", user!.id)
        .in("id_leccion", ids),
      supabase
        .from("actividad")
        .select("id_leccion")
        .in("id_leccion", ids)
        .eq("publicado", true),
    ])

    const progMap = new Map(progResult.data?.map(p => [p.id_leccion, p.pct_completado]) ?? [])
    const actCount = new Map<string, number>()
    for (const a of actCountResult.data ?? []) {
      actCount.set(a.id_leccion, (actCount.get(a.id_leccion) ?? 0) + 1)
    }

    setLessons(leccionesRaw.map(l => ({
      ...l,
      pct_completado:    progMap.get(l.id_leccion) ?? 0,
      total_actividades: actCount.get(l.id_leccion) ?? 0,
    })))
    setLoading(false)
  }

  const completadas = lessons.filter(l => l.pct_completado >= 100).length

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={onBack}
            aria-label="Volver a mis cursos"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{courseName}</h1>
              <p className="text-sm opacity-90">
                {completadas} de {lessons.length} lecciones completadas
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-muted-foreground py-8">Cargando lecciones…</p>
        ) : lessons.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Este curso aún no tiene lecciones disponibles.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-4 list-none p-0">
            {lessons.map((lesson, i) => (
              <li key={lesson.id_leccion}>
                <article>
                  <Card
                    className="border-2 hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => onSelectLesson(lesson.id_leccion, lesson.titulo)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        {/* Number / check */}
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                            lesson.pct_completado >= 100
                              ? "bg-green-100 text-green-700"
                              : "bg-primary/10 text-primary"
                          }`}
                          aria-hidden="true"
                        >
                          {lesson.pct_completado >= 100
                            ? <CheckCircle2 className="w-6 h-6" />
                            : i + 1}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-lg leading-tight">
                            {lesson.titulo}
                          </p>
                          {lesson.contenido && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                              {lesson.contenido}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {lesson.total_actividades} actividad{lesson.total_actividades !== 1 ? "es" : ""}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Progress
                              value={lesson.pct_completado}
                              className="h-2 flex-1"
                              aria-label={`${lesson.pct_completado}% completado`}
                            />
                            <span className="text-sm font-bold text-primary w-10 text-right">
                              {lesson.pct_completado}%
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
                      </div>
                    </CardContent>
                  </Card>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
