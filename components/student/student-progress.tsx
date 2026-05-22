"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { useStudentProgress, type LessonAttempt } from "@/hooks/student/use-student-progress"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft,
  Volume2,
  Star,
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
import { VoiceAssistant } from "@/components/student/voice-assistant"

interface StudentProgressProps {
  onBack: () => void
}

interface ActivityAttemptDetail {
  actividadId: string
  titulo: string
  tipo: string
  puntaje: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
}

function StarRow({ stars, size = "w-5 h-5" }: { stars: number | null; size?: string }) {
  if (stars === null) return null
  return (
    <div
      className="flex gap-0.5 cursor-default"
      title={`${stars?.toFixed(1) ?? 0} ⭐`}
      aria-label={`${stars?.toFixed(1) ?? 0} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fillPct = stars >= i ? 100 : stars > i - 1 ? Math.round((stars - (i - 1)) * 100) : 0
        return (
          <span key={i} className="relative inline-flex shrink-0">
            <Star className={`${size} text-gray-300 fill-gray-100`} />
            {fillPct > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPct}%` }}
              >
                <Star className={`${size} text-amber-400 fill-amber-400`} />
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

export function StudentProgress({ onBack }: StudentProgressProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()
  const { lessons: lessonProgressData, stats, loading } = useStudentProgress()
  const localColor = typeof window !== "undefined" ? localStorage.getItem("ea_avatar_color") : null

  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null)
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null)
  const [attemptDetails, setAttemptDetails] = useState<Record<string, ActivityAttemptDetail[]>>({})
  const [loadingAttempt, setLoadingAttempt] = useState<string | null>(null)
  const [animatedProgress, setAnimatedProgress] = useState(0)

  const {
    completedLessons,
    totalLessons,
    overallProgress,
    averageScore,
    totalAttempts,
    currentStreak,
    totalStars,
    nivelNombre,
    nivelEmoji,
    colorPerfil,
  } = stats

  useEffect(() => {
    if (overallProgress > 0) {
      const t = setTimeout(() => setAnimatedProgress(overallProgress), 100)
      return () => clearTimeout(t)
    }
  }, [overallProgress])

  const totalEstrellas = totalStars

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
      // Deduplicar por id_actividad — quedarse con el último intento por actividad
      const seen = new Map<string, any>()
      for (const d of data) seen.set(d.id_actividad, d)
      setAttemptDetails(prev => ({
        ...prev,
        [attempt.id]: Array.from(seen.values()).map((d: any) => ({
          actividadId: d.id_actividad,
          titulo: d.actividad?.titulo ?? "Actividad",
          tipo: d.actividad?.tipo ?? "",
          puntaje: Math.round(d.puntaje_total ?? 0),
        })),
      }))
    }
    setLoadingAttempt(null)
  }

  const handleReadInstructions = () => {
    speak(
      `Tu reporte de progreso. Has completado ${completedLessons} de ${totalLessons} lecciones. Tu puntaje promedio es ${averageScore} por ciento. Tu racha actual es de ${currentStreak} dias.`
    )
  }

  const statCards = [
    {
      gradient: "from-blue-400 to-blue-600",
      shadow: "shadow-blue-500/20",
      border: "border-white/20",
      icon: <BookOpen className="w-6 h-6 text-white" aria-hidden />,
      value: completedLessons,
      label: "Lecciones",
      description: `Lecciones completadas: ${completedLessons}. Cada lección que terminas te acerca más a tu meta.`,
    },
    {
      gradient: "from-emerald-400 to-teal-600",
      shadow: "shadow-emerald-500/20",
      border: "border-white/20",
      icon: <Target className="w-6 h-6 text-white" aria-hidden />,
      value: `${averageScore}%`,
      label: "Promedio",
      description: `Tu promedio de calificaciones es ${averageScore} por ciento. ¡Sigue así para mejorarlo!`,
    },
    {
      gradient: "from-amber-400 to-orange-500",
      shadow: "shadow-amber-500/20",
      border: "border-white/20",
      icon: <Star className="w-6 h-6 text-white fill-white" aria-hidden />,
      value: totalEstrellas,
      label: "Estrellas",
      description: `Tienes ${totalEstrellas} estrellas en total. Las ganas completando actividades y lecciones.`,
    },
    {
      gradient: "from-violet-400 to-violet-600",
      shadow: "shadow-violet-500/20",
      border: "border-white/20",
      icon: <Clock className="w-6 h-6 text-white" aria-hidden />,
      value: totalAttempts,
      label: "Lecciones intentadas",
      description: `Has intentado ${totalAttempts} lecciones en total. Cada intento es una oportunidad de aprender.`,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-black text-foreground leading-none">Mi Progreso</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Reporte de actividades</p>
            </div>
          </div>
          {settings.voiceEnabled && (
            <button type="button" onClick={handleReadInstructions}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
              <Volume2 className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">Escuchar</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-7 space-y-6">

        {/* Hero profile card */}
        <section aria-label="Perfil del estudiante">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-xl shadow-primary/20">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-xl" aria-hidden />
            <div className="relative flex items-center gap-5">
              <div
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg border-2 border-white/30"
                style={{ backgroundColor: colorPerfil ?? localColor ?? "rgba(255,255,255,0.25)" }}
                aria-hidden="true"
              >
                {user?.name?.charAt(0)?.toUpperCase() || "E"}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center">
                  <span className="text-[8px]">✓</span>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-black text-white leading-tight">{user?.name}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white">
                    {nivelEmoji} {nivelNombre}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white">
                    <Flame className="w-3 h-3" /> {currentStreak} días
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section aria-label="Estadísticas del estudiante">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((card, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-3xl border-2 ${card.border} bg-gradient-to-br ${card.gradient} p-5 shadow-lg ${card.shadow} transition-all hover:-translate-y-1 hover:shadow-xl`}
                onMouseEnter={() => settings.voiceEnabled && speak(card.description)}
              >
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/20 blur-xl" aria-hidden />
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                  {card.icon}
                </div>
                <dd className="text-2xl font-black text-white">{card.value}</dd>
                <dt className="text-xs font-medium text-white/80 mt-0.5">{card.label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* Overall Progress */}
        <section aria-label="Progreso general">
          <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" aria-hidden />
              </div>
              <h3 className="text-sm font-black text-foreground">Progreso General</h3>
              <span className="ml-auto text-xl font-black text-primary" aria-hidden>{overallProgress}%</span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={overallProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${overallProgress}% completado`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80"
                style={{ width: `${animatedProgress}%`, transition: "width 3000ms linear" }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {completedLessons} de {totalLessons} lecciones completadas — ¡sigue así!
            </p>
          </div>
        </section>

        {/* Lessons List */}
        <section aria-label="Detalle por lección">
          <div className="rounded-3xl border-2 border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-black text-foreground">Detalle por Lección</h3>
            </div>
            <ul className="divide-y divide-border list-none p-0" aria-label="Lista de lecciones con progreso">
              {lessonProgressData.map((lesson, index) => (
                <li key={lesson.id}>
                  <article aria-label={`${lesson.name}${lesson.completed ? `, puntaje ${lesson.score}%` : ", pendiente"}`}>
                    <div className="p-5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                              lesson.completed
                                ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                                : "bg-muted"
                            }`}
                            aria-hidden
                          >
                            {lesson.completed
                              ? <CheckCircle className="w-5 h-5 text-white" />
                              : <span className="text-base font-black text-muted-foreground">{index + 1}</span>
                            }
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-foreground truncate">{lesson.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {lesson.completed ? "Completada" : "Pendiente"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {lesson.completed && (
                            <StarRow stars={lesson.estrellas} size="w-4 h-4" />
                          )}
                          {lesson.historial.length > 0 && (
                            <button
                              onClick={() => toggleLesson(lesson.id)}
                              className="flex items-center gap-1.5 text-primary hover:text-primary/70 transition-colors"
                              aria-expanded={expandedLessonId === lesson.id}
                              aria-label={`Ver historial de ${lesson.name}: ${lesson.historial.length} intento${lesson.historial.length !== 1 ? "s" : ""}`}
                            >
                              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-bold">
                                {lesson.historial.length} {lesson.historial.length === 1 ? "intento" : "intentos"}
                              </span>
                              {expandedLessonId === lesson.id
                                ? <ChevronUp className="w-3.5 h-3.5" />
                                : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Historial expandido */}
                    {expandedLessonId === lesson.id && lesson.historial.length > 0 && (
                      <div className="border-t border-border bg-muted/20 px-5 py-3 space-y-1.5">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                          Historial de intentos
                        </p>
                        {lesson.historial.map((attempt) => (
                          <div key={attempt.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                            <button
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                              onClick={() => toggleAttempt(attempt)}
                              aria-expanded={expandedAttemptId === attempt.id}
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary shrink-0">
                                  {attempt.numero}
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-foreground">Intento {attempt.numero}</p>
                                  <p className="text-xs text-muted-foreground">{formatDate(attempt.fecha)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <StarRow stars={attempt.estrellas} size="w-3.5 h-3.5" />
                                {expandedAttemptId === attempt.id
                                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              </div>
                            </button>

                            {expandedAttemptId === attempt.id && (
                              <div className="border-t border-border px-4 py-3 bg-muted/10">
                                {loadingAttempt === attempt.id ? (
                                  <p className="text-xs text-muted-foreground py-2">Cargando actividades…</p>
                                ) : attemptDetails[attempt.id]?.length > 0 ? (
                                  <ul className="space-y-1.5 list-none p-0">
                                    {attemptDetails[attempt.id].map((act) => (
                                      <li key={act.actividadId} className="flex items-center gap-2">
                                        {act.puntaje >= 70
                                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                          : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                        <span className="text-xs text-foreground truncate">{act.titulo}</span>
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
          </div>
        </section>
      </main>

      <VoiceAssistant
        subpageName="progreso"
        subpageMessage={
          loading ? undefined
          : `¡Veamos cómo vas, campeón! ` +
            `Lecciones completadas: ${completedLessons} de ${totalLessons}. ` +
            `Promedio: ${averageScore} por ciento. ` +
            `Estrellas totales: ${totalEstrellas}. ` +
            (totalAttempts > 0 ? `Lecciones intentadas: ${totalAttempts}. ` : "") +
            `Progreso general: ${Math.round(overallProgress)} por ciento. ` +
            `¡Estás haciendo un trabajo increíble! ¡Sigue así!`
        }
        firstName=""
        estrellasTotales={0}
        nivelActual={0}
        nivelNombre=""
        streakDays={0}
        courses={[]}
        onNavigate={() => {}}
        onBack={onBack}
      />
    </div>
  )
}
