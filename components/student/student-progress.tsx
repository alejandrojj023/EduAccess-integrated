"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { useStudentProgress, type LessonAttempt } from "@/hooks/student/use-student-progress"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft,
  Volume2,
  Star,
  Trophy,
  CheckCircle,
  Clock,
  TrendingUp,
  BookOpen,
  Target,
  Flame,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface StudentProgressProps {
  onBack: () => void
}

interface ActivityAttemptDetail {
  actividadId: string
  titulo: string
  tipo: string
  puntaje: number
}

function StarRow({ stars, size = "w-5 h-5" }: { stars: number | null; size?: string }) {
  if (stars === null) return null
  return (
    <div className="flex gap-0.5" aria-label={`${stars?.toFixed(1) ?? 0} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${stars >= i ? "text-amber-400 fill-amber-400" : stars >= i - 0.5 ? "text-amber-300 fill-amber-100" : "text-gray-300 fill-gray-100"}`}
        />
      ))}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
}

export function StudentProgress({ onBack }: StudentProgressProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()
  const { lessons: lessonProgressData, stats, loading } = useStudentProgress()

  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null)
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null)
  const [attemptDetails, setAttemptDetails] = useState<Record<string, ActivityAttemptDetail[]>>({})
  const [loadingAttempt, setLoadingAttempt] = useState<string | null>(null)

  const {
    completedLessons,
    totalLessons,
    overallProgress,
    averageScore,
    totalAttempts,
    currentStreak,
  } = stats

  const totalEstrellas = Math.round(
    lessonProgressData.reduce((acc, l) => acc + (l.estrellas ?? 0), 0)
  )

  const handleReadInstructions = () => {
    speak(
      `Tu reporte de progreso. Has completado ${completedLessons} de ${totalLessons} lecciones. Tu puntaje promedio es ${averageScore} por ciento. Tu racha actual es de ${currentStreak} dias.`
    )
  }

  function toggleLesson(lessonId: string) {
    setExpandedLessonId(prev => prev === lessonId ? null : lessonId)
    setExpandedAttemptId(null)
  }

  async function toggleAttempt(attempt: LessonAttempt) {
    if (expandedAttemptId === attempt.id) {
      setExpandedAttemptId(null)
      return
    }
    setExpandedAttemptId(attempt.id)
    if (attemptDetails[attempt.id]) return

    setLoadingAttempt(attempt.id)
    const { data } = await supabase
      .from("intento_actividad")
      .select("id_actividad, puntaje_total, actividad(titulo, tipo)")
      .eq("id_intento_leccion", attempt.id)
      .order("fecha_fin", { ascending: true })

    if (data) {
      setAttemptDetails(prev => ({
        ...prev,
        [attempt.id]: data.map((d: any) => ({
          actividadId: d.id_actividad,
          titulo: d.actividad?.titulo ?? "Actividad",
          tipo: d.actividad?.tipo ?? "",
          puntaje: Math.round(d.puntaje_total ?? 0),
        })),
      }))
    }
    setLoadingAttempt(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={onBack}
              className="h-12 w-12 p-0"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Mi Progreso</h1>
              <p className="text-sm opacity-90">Reporte de actividades</p>
            </div>
          </div>
          {settings.voiceEnabled && (
            <Button variant="secondary" size="lg" onClick={handleReadInstructions} className="h-12">
              <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
              Escuchar
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Summary */}
        <section aria-label="Perfil del estudiante" className="mb-8">
        <Card className="border-2 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center text-3xl font-bold text-primary-foreground">
                  {user?.name?.charAt(0) || "E"}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{user?.name}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Trophy className="w-5 h-5 text-accent" aria-hidden="true" />
                      {totalEstrellas} ⭐ Estrellas
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Flame className="w-5 h-5 text-destructive" aria-hidden="true" />
                      {currentStreak} dias de racha
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </section>

        {/* Stats Grid */}
        <section aria-label="Estadísticas del estudiante" className="mb-8">
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0">
            <li>
              <Card className="border-2 shadow-lg h-full">
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3" aria-hidden="true">
                    <BookOpen className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">{completedLessons}</p>
                  <p className="text-sm text-muted-foreground">Lecciones Completadas</p>
                </CardContent>
              </Card>
            </li>
            <li>
              <Card className="border-2 shadow-lg h-full">
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center mb-3" aria-hidden="true">
                    <Target className="w-7 h-7 text-success" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">{averageScore}%</p>
                  <p className="text-sm text-muted-foreground">Puntaje Promedio</p>
                </CardContent>
              </Card>
            </li>
            <li>
              <Card className="border-2 shadow-lg h-full">
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center mb-3" aria-hidden="true">
                    <Star className="w-7 h-7 text-accent-foreground" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">{totalEstrellas}</p>
                  <p className="text-sm text-muted-foreground">Estrellas Ganadas</p>
                </CardContent>
              </Card>
            </li>
            <li>
              <Card className="border-2 shadow-lg h-full">
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-chart-4/20 rounded-2xl flex items-center justify-center mb-3" aria-hidden="true">
                    <Clock className="w-7 h-7 text-chart-4" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">{totalAttempts}</p>
                  <p className="text-sm text-muted-foreground">Total Intentos</p>
                </CardContent>
              </Card>
            </li>
          </ul>
        </section>

        {/* Overall Progress */}
        <section aria-label="Progreso general">
          <Card className="border-2 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-primary" aria-hidden="true" />
                Progreso General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <Progress value={overallProgress} className="h-6" aria-label={`${overallProgress}% completado`} />
                </div>
                <span className="text-3xl font-bold text-primary" aria-hidden="true">{overallProgress}%</span>
              </div>
              <p className="text-muted-foreground mt-4">
                Has completado {completedLessons} de {totalLessons} lecciones. Sigue asi!
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Lessons List */}
        <section aria-label="Detalle por lección">
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Detalle por Leccion</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border" aria-label="Lista de lecciones con progreso">
                {lessonProgressData.map((lesson, index) => (
                  <li key={lesson.id}>
                    <article aria-label={`${lesson.name}${lesson.completed ? `, puntaje ${lesson.score}%` : ", pendiente"}`}>
                      {/* Fila principal de la lección */}
                      <div className="p-5 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                lesson.completed ? "bg-success/10" : "bg-muted"
                              }`}
                              aria-hidden="true"
                            >
                              {lesson.completed ? (
                                <CheckCircle className="w-6 h-6 text-success" />
                              ) : (
                                <span className="text-lg font-bold text-muted-foreground">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-lg font-semibold text-foreground truncate">{lesson.name}</h4>
                              {lesson.completed ? (
                                <p className="text-sm text-muted-foreground">
                                  Completada en {lesson.attempts} intento
                                  {lesson.attempts > 1 ? "s" : ""}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">Pendiente</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {lesson.completed && (
                              <div className="text-right" aria-label={`Puntaje: ${lesson.score}%`}>
                                <p
                                  className={`text-2xl font-bold ${
                                    lesson.score >= 90
                                      ? "text-success"
                                      : lesson.score >= 70
                                      ? "text-accent-foreground"
                                      : "text-foreground"
                                  }`}
                                >
                                  {lesson.score}%
                                </p>
                                <div className="flex justify-end mt-1">
                                  <StarRow stars={lesson.estrellas} size="w-4 h-4" />
                                </div>
                              </div>
                            )}

                            {lesson.historial.length > 0 && (
                              <button
                                onClick={() => toggleLesson(lesson.id)}
                                className="flex flex-col items-center gap-0.5 text-primary hover:text-primary/80 transition-colors px-2"
                                aria-expanded={expandedLessonId === lesson.id}
                                aria-label={`Ver historial de ${lesson.name}`}
                              >
                                <span className="text-xs font-medium">{lesson.historial.length} intentos</span>
                                {expandedLessonId === lesson.id
                                  ? <ChevronUp className="w-4 h-4" />
                                  : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Historial expandido */}
                      {expandedLessonId === lesson.id && lesson.historial.length > 0 && (
                        <div className="border-t border-border bg-muted/30 px-5 py-3 space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Historial de intentos
                          </p>
                          {lesson.historial.map((attempt) => (
                            <div key={attempt.id} className="rounded-lg border border-border bg-background overflow-hidden">
                              {/* Fila del intento */}
                              <button
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                                onClick={() => toggleAttempt(attempt)}
                                aria-expanded={expandedAttemptId === attempt.id}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                    {attempt.numero}
                                  </span>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">
                                      Intento {attempt.numero}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(attempt.fecha)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className={`text-sm font-bold ${
                                      attempt.puntaje >= 90 ? "text-success"
                                      : attempt.puntaje >= 70 ? "text-amber-600"
                                      : "text-foreground"
                                    }`}>
                                      {attempt.puntaje}%
                                    </p>
                                    <StarRow stars={attempt.estrellas} size="w-3 h-3" />
                                  </div>
                                  {expandedAttemptId === attempt.id
                                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                                </div>
                              </button>

                              {/* Detalle de actividades del intento */}
                              {expandedAttemptId === attempt.id && (
                                <div className="border-t border-border px-4 py-3 bg-muted/20">
                                  {loadingAttempt === attempt.id ? (
                                    <p className="text-xs text-muted-foreground py-2">Cargando actividades…</p>
                                  ) : attemptDetails[attempt.id]?.length > 0 ? (
                                    <ul className="space-y-2 list-none p-0">
                                      {attemptDetails[attempt.id].map((act) => (
                                        <li key={act.actividadId} className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            {act.puntaje >= 70
                                              ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                                              : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                                            <span className="text-sm text-foreground truncate">{act.titulo}</span>
                                          </div>
                                          <span className={`text-sm font-semibold shrink-0 ${
                                            act.puntaje >= 90 ? "text-success"
                                            : act.puntaje >= 70 ? "text-amber-600"
                                            : "text-destructive"
                                          }`}>
                                            {act.puntaje}%
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-muted-foreground py-1">
                                      Sin detalle de actividades disponible.
                                    </p>
                                  )}
                                  <div className="mt-3 pt-2 border-t border-border/50 flex gap-4 text-xs text-muted-foreground">
                                    <span>✓ Correctas al 1er intento: <strong>{attempt.correctasPrimerIntento}/{attempt.totalActividades}</strong></span>
                                    {attempt.totalReintentos > 0 && (
                                      <span>↺ Reintentos: <strong>{attempt.totalReintentos}</strong></span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
