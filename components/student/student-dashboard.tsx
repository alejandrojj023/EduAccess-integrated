"use client"

import { useState, useMemo, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { useStudentDashboard } from "@/hooks/student/use-student-dashboard"
import { AccessibleTooltip, SpeakableText, useSpeakOnHover } from "@/components/ui/accessible-tooltip"

import { StarsCard } from "@/components/student/stars-card"
import { LevelCard } from "@/components/student/level-card"
import { StreakCard } from "@/components/student/streak-card"
import { VoiceAssistant } from "@/components/student/voice-assistant"

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
  const colorPerfil = gamification.colorPerfil ?? avatarColor

  const [highlightOption, setHighlightOption] = useState<1 | 2 | 3 | 4 | 5 | 6 | null>(null)
  const [highlightCourseIdx, setHighlightCourseIdx] = useState<number | null>(null)
  const ringClass = (opt: 1 | 2 | 3 | 4 | 5 | 6) =>
    highlightOption === opt
      ? "ring-4 ring-emerald-400/70 ring-offset-2 ring-offset-background scale-[1.03] shadow-2xl"
      : ""
  const courseRing = (idx: number) =>
    highlightCourseIdx === idx
      ? "ring-4 ring-emerald-400/70 ring-offset-2 ring-offset-background scale-[1.02] shadow-2xl"
      : ""

  const hoverContinuar  = useSpeakOnHover("Continuar Aprendiendo")
  const hoverProgreso   = useSpeakOnHover("Mi Progreso: ver tu avance en los cursos")
  const hoverCalendario = useSpeakOnHover("Mi Calendario: actividades completadas por día")
  const hoverUnirse     = useSpeakOnHover("Unirse a un Curso: ingresar código de curso")

  const {
    estrellasTotales,
    nivelActual,
    nivelNombre,
    nivelEmoji,
    nivelIcon,
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
  const firstName = user?.name?.split(" ")[0] ?? "Estudiante"

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[#008e92] shadow-sm">
              <img src="/2.svg" alt="EduAccess" className="h-full w-full object-cover" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-black leading-none text-foreground">EduAccess</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Aprende jugando</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.voiceEnabled && (
              <button
                type="button"
                onClick={handleReadInstructions}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground active:scale-[0.98]"
                aria-label="Escuchar resumen"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline text-xs">Escuchar</span>
              </button>
            )}
            <button
                type="button"
                onClick={() => onNavigate("accessibility")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:text-foreground active:scale-[0.98]"
                aria-label="Configuración"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </button>
            <button
                type="button"
                onClick={onLogout}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:text-foreground active:scale-[0.98]"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-5 py-7">

        {/* ── WELCOME HERO ── */}
        <section aria-label="Bienvenida">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-xl shadow-primary/20">
            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="absolute -bottom-8 left-1/3 w-32 h-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} aria-hidden />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg border-2 border-white/30"
                  style={{ backgroundColor: colorPerfil ?? "rgba(255,255,255,0.25)" }}
                  aria-hidden="true"
                >
                  {initials}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center">
                    <span className="text-[8px]">✓</span>
                  </div>
                </div>
                <div>
                  <SpeakableText
                    as="h2"
                    className="text-xl font-black text-white leading-tight"
                    speakText={`Hola, ${firstName}! Bienvenido a EduAccess.`}
                  >
                    ¡Hola, {firstName}!
                  </SpeakableText>
                  <SpeakableText as="p" className="text-sm text-primary-foreground/80 mt-0.5">
                    ¡Qué bueno verte de nuevo! Sigamos aprendiendo.
                  </SpeakableText>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinuar}
                disabled={loading || courses.length === 0}
                {...hoverContinuar}
                className={`flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-primary shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 shrink-0 ${ringClass(1)}`}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Continuar
                <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
              </button>
            </div>
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
                nivelIcon={nivelIcon}
                nivelMax={nivelMax}
                estrellasTotales={estrellasTotales}
                progressToNext={progressToNext}
              />
            </li>
            <li><StreakCard streakDays={streakDays} /></li>
          </ul>
        </section>

        {/* ── COURSES ── */}
        <section aria-label="Mis cursos" className={`rounded-3xl transition-all duration-200 ${ringClass(2)}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Mis cursos</h3>
            {courses.length > 0 && (
              <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                {courses.length} {courses.length === 1 ? "curso" : "cursos"}
              </span>
            )}
          </div>

          {!loading && courses.length === 0 && (
            <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card py-12 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center" aria-hidden>
                <Users className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Aún no tienes cursos</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Pídele a tu docente el código de curso e ingrésalo para comenzar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("join-group")}
                className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                Unirme a un curso
              </button>
            </div>
          )}

          <ul className="space-y-3 list-none p-0">
            {courses.map((course, idx) => {
              const done = course.progress >= 100
              const started = course.progress > 0
              return (
                <li key={course.id}>
                  <article aria-label={`Curso: ${course.name}`}>
                    <button
                      type="button"
                      onClick={() => onNavigate(`course-${course.id}|${course.name}`)}
                      className={`group w-full rounded-3xl border-2 border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] ${courseRing(idx)}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                          done ? "bg-emerald-500/15" : started ? "bg-primary/15" : "bg-muted"
                        }`}>
                          <BookOpen className={`h-6 w-6 ${done ? "text-emerald-600 dark:text-emerald-400" : started ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
                          {done && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                              <span className="text-white text-[9px] font-black">✓</span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <SpeakableText as="p" className="truncate text-sm font-bold text-foreground leading-tight">
                            {course.name}
                          </SpeakableText>
                          <SpeakableText
                            as="p"
                            className="mt-0.5 truncate text-xs text-muted-foreground"
                            speakText={`Siguiente: ${course.currentLesson}`}
                          >
                            {done ? "✅ Completado" : `Siguiente: ${course.currentLesson}`}
                          </SpeakableText>

                          {/* Progress bar */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${done ? "bg-emerald-500" : "bg-primary"}`}
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold w-9 text-right ${done ? "text-emerald-600" : "text-primary"}`}>
                              {course.progress}%
                            </span>
                          </div>
                        </div>

                        {/* Lessons count + arrow */}
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
                            {course.completedLessons}/{course.totalLessons}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                        </div>
                      </div>
                    </button>
                  </article>
                </li>
              )
            })}
          </ul>
        </section>

        {/* ── QUICK ACTIONS ── */}
        <nav aria-label="Acciones rápidas">
          <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Acciones</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate("student-progress")}
              {...hoverProgreso}
              className={`group flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-4 text-left transition-all hover:border-primary/40 hover:bg-muted active:scale-[0.98] ${ringClass(4)}`}
            >
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 group-hover:bg-violet-500/25 flex items-center justify-center transition-colors shrink-0">
                <BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden />
              </div>
              <span className="text-sm font-bold text-foreground">Mi progreso</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("student-calendar")}
              {...hoverCalendario}
              className={`group flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-4 text-left transition-all hover:border-primary/40 hover:bg-muted active:scale-[0.98] ${ringClass(3)}`}
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 group-hover:bg-blue-500/25 flex items-center justify-center transition-colors shrink-0">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden />
              </div>
              <span className="text-sm font-bold text-foreground">Mi calendario</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("join-group")}
              {...hoverUnirse}
              className={`group col-span-2 flex items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card px-4 py-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] ${ringClass(5)}`}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors shrink-0">
                <BookOpen className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div>
                <span className="text-sm font-bold text-foreground">Unirme a un curso</span>
                <p className="text-xs text-muted-foreground">Ingresar código del docente</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-transform" aria-hidden />
            </button>
          </div>
        </nav>

      </main>

      <VoiceAssistant
        firstName={firstName}
        estrellasTotales={estrellasTotales}
        nivelActual={nivelActual}
        nivelNombre={nivelNombre}
        streakDays={streakDays}
        courses={courses}
        onNavigate={onNavigate}
        onHighlight={setHighlightOption}
        onHighlightCourse={setHighlightCourseIdx}
      />
    </div>
  )
}
