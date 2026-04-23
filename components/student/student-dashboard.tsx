"use client"

import { useState, useMemo, useCallback } from "react"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { useStudentDashboard } from "@/hooks/student/use-student-dashboard"
import { AccessibleTooltip, SpeakableText, useSpeakOnHover } from "@/components/ui/accessible-tooltip"

import { StarsCard } from "@/components/student/stars-card"
import { LevelCard } from "@/components/student/level-card"
import { StreakCard } from "@/components/student/streak-card"

import {
  BookOpen,
  Play,
  Volume2,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  BarChart3,
  Calendar,
  Users,
} from "lucide-react"

interface StudentDashboardProps {
  onNavigate: (screen: string) => void
  onLogout: () => void
}

export function StudentDashboard({ onNavigate, onLogout }: StudentDashboardProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()
  const { courses, gamification, loading } = useStudentDashboard()

  const [avatarColor] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("ea_avatar_color") : null
  )

  const hoverContinuar  = useSpeakOnHover("Continuar Aprendiendo")
  const hoverProgreso   = useSpeakOnHover("Mi Progreso: ver tu avance en los cursos")
  const hoverCalendario = useSpeakOnHover("Mi Calendario: actividades completadas por día")
  const hoverUnirse     = useSpeakOnHover("Unirse a un Curso: ingresar código de curso")

  const {
    estrellasTotales,
    nivelActual,
    nivelNombre,
    nivelEmoji,
    nivelMin,
    nivelMax,
    streakDays,
  } = gamification

  const progressToNext = useMemo(() =>
    nivelMax === Infinity
      ? 100
      : Math.min(100, Math.round(((estrellasTotales - nivelMin) / (nivelMax - nivelMin + 1)) * 100))
  , [nivelMax, estrellasTotales, nivelMin])

  const handleContinuar = useCallback(() => {
    if (courses.length === 0) return
    const noIniciados = courses.filter(c => c.progress === 0)
    if (noIniciados.length > 0) {
      const elegido = noIniciados[Math.floor(Math.random() * noIniciados.length)]
      onNavigate(`course-${elegido.id}|${elegido.name}`)
      return
    }
    const enProgreso = courses.filter(c => c.progress > 0 && c.progress < 100)
    if (enProgreso.length > 0) {
      const elegido = enProgreso[Math.floor(Math.random() * enProgreso.length)]
      onNavigate(`course-${elegido.id}|${elegido.name}`)
      return
    }
    const elegido = courses[Math.floor(Math.random() * courses.length)]
    onNavigate(`course-${elegido.id}|${elegido.name}`)
  }, [courses, onNavigate])

  const handleReadInstructions = useCallback(() => {
    speak(
      `Hola ${user?.name}! Tienes ${courses.length} cursos asignados. Tu nivel es ${nivelNombre} y llevas ${estrellasTotales} estrellas.`
    )
  }, [speak, user?.name, courses.length, nivelNombre, estrellasTotales])

  const initials = (user?.name ?? "E").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[#008e92]">
              <img src="/2.svg" alt="EduAccess" className="h-full w-full object-cover" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-foreground">EduAccess</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Aprende jugando</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.voiceEnabled && (
              <button
                type="button"
                onClick={handleReadInstructions}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Escuchar</span>
              </button>
            )}
            <AccessibleTooltip label="Ajustes de accesibilidad">
              <button
                type="button"
                onClick={() => onNavigate("accessibility")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]"
                aria-label="Configuración"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </button>
            </AccessibleTooltip>
            <AccessibleTooltip label="Cerrar sesión">
              <button
                type="button"
                onClick={onLogout}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </AccessibleTooltip>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">

        {/* ── WELCOME ── */}
        <section aria-label="Bienvenida">
          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: avatarColor ?? "#008e92" }}
                aria-hidden="true"
              >
                {initials}
              </div>
              <div>
                <SpeakableText
                  as="h2"
                  className="text-xl font-bold text-foreground"
                  speakText={`Hola, ${user?.name?.split(" ")[0]}! Bienvenido a EduAccess.`}
                >
                  Hola, {user?.name?.split(" ")[0]}!
                </SpeakableText>
                <SpeakableText as="p" className="text-sm text-muted-foreground">
                  ¡Qué bueno verte de nuevo! Sigamos aprendiendo.
                </SpeakableText>
              </div>
            </div>

            <button
              type="button"
              onClick={handleContinuar}
              disabled={loading || courses.length === 0}
              {...hoverContinuar}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Continuar aprendiendo
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* ── STATS ── */}
        <section aria-label="Tu progreso y logros">
          <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-3">
            <li><StarsCard estrellasTotales={estrellasTotales} /></li>
            <li>
              <LevelCard
                nivelActual={nivelActual}
                nivelNombre={nivelNombre}
                nivelEmoji={nivelEmoji}
                nivelMax={nivelMax}
                estrellasTotales={estrellasTotales}
                progressToNext={progressToNext}
              />
            </li>
            <li><StreakCard streakDays={streakDays} /></li>
          </ul>
        </section>

        {/* ── COURSES ── */}
        <section aria-label="Mis cursos">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mis cursos</h3>

          {!loading && courses.length === 0 && (
            <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10" aria-hidden="true">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Aún no tienes cursos</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Pídele a tu docente el código de curso e ingrésalo para ver tus cursos aquí.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("join-group")}
                className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Unirme a un curso
              </button>
            </div>
          )}

          <ul className="space-y-3 list-none p-0">
            {courses.map((course) => (
              <li key={course.id}>
                <article aria-label={`Curso: ${course.name}`}>
                  <button
                    type="button"
                    onClick={() => onNavigate(`course-${course.id}|${course.name}`)}
                    className="group w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <SpeakableText as="p" className="truncate text-sm font-bold text-foreground">
                            {course.name}
                          </SpeakableText>
                          <SpeakableText
                            as="p"
                            className="mt-0.5 truncate text-xs text-muted-foreground"
                            speakText={`Siguiente: ${course.currentLesson}`}
                          >
                            Siguiente: {course.currentLesson}
                          </SpeakableText>
                          <p className="text-xs text-muted-foreground">
                            {course.completedLessons} de {course.totalLessons} lecciones
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <div className="hidden w-28 sm:block">
                          <div className="mb-1 flex justify-between">
                            <span className="text-xs text-muted-foreground">Progreso</span>
                            <span className="text-xs font-bold text-primary">{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-1.5" />
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                      </div>
                    </div>
                  </button>
                </article>
              </li>
            ))}
          </ul>
        </section>

        {/* ── QUICK ACTIONS ── */}
        <nav aria-label="Acciones rápidas">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Acciones</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate("student-progress")}
              {...hoverProgreso}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
              Mi progreso
            </button>
            <button
              type="button"
              onClick={() => onNavigate("student-calendar")}
              {...hoverCalendario}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
              Mi calendario
            </button>
            <button
              type="button"
              onClick={() => onNavigate("join-group")}
              {...hoverUnirse}
              className="col-span-2 flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
              Unirme a un curso
            </button>
          </div>
        </nav>

      </main>
    </div>
  )
}
