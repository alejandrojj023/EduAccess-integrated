"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { useStudentDashboard } from "@/hooks/student/use-student-dashboard"
import { AccessibleTooltip, SpeakableText, useSpeakOnHover } from "@/components/ui/accessible-tooltip"

import {
  BookOpen,
  Play,
  Star,
  Trophy,
  Volume2,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  BarChart3,
  Calendar,
  Users,
  Flame,
} from "lucide-react"

interface StudentDashboardProps {
  onNavigate: (screen: string) => void
  onLogout: () => void
}

export function StudentDashboard({ onNavigate, onLogout }: StudentDashboardProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()
  const { courses, gamification, loading } = useStudentDashboard()

  const [avatarColor, setAvatarColor] = useState<string | null>(null)
  useEffect(() => {
    setAvatarColor(localStorage.getItem("ea_avatar_color"))
  }, [])

  // Hover-to-speak para botones con texto visible
  const hoverContinuar   = useSpeakOnHover("Continuar Aprendiendo")
  const hoverProgreso    = useSpeakOnHover("Mi Progreso: ver tu avance en los cursos")
  const hoverCalendario  = useSpeakOnHover("Mi Calendario: actividades completadas por día")
  const hoverAjustes     = useSpeakOnHover("Ajustes: cambiar accesibilidad y perfil")
  const hoverUnirse      = useSpeakOnHover("Unirse a un Curso: ingresar código de curso o aceptar invitación")

  const {
    estrellasTotales,
    nivelActual,
    nivelNombre,
    nivelEmoji,
    nivelMin,
    nivelMax,
    streakDays,
  } = gamification

  const progressToNext =
    nivelMax === Infinity
      ? 100
      : Math.min(
          100,
          Math.round(((estrellasTotales - nivelMin) / (nivelMax - nivelMin + 1)) * 100)
        )

  const handleReadInstructions = () => {
    speak(
      `Hola ${user?.name}! Bienvenido a tu panel de aprendizaje. Tienes ${courses.length} cursos asignados. Tu nivel actual es ${nivelNombre} y has ganado ${estrellasTotales} estrellas. Presiona el boton Continuar Aprendiendo para seguir con tu leccion actual.`
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-[#008e92]">
              <img src="/2.svg" alt="EduAccess logo" className="w-full h-full object-cover" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold">EduAccess</h1>
              <p className="text-sm opacity-90">Aprende jugando</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings.voiceEnabled && (
              <Button
                variant="secondary"
                size="lg"
                onClick={handleReadInstructions}
                className="h-12"
              >
                <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Escuchar</span>
              </Button>
            )}
            <AccessibleTooltip label="Ajustes de accesibilidad y perfil">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => onNavigate("accessibility")}
                className="h-12 w-12 p-0"
                aria-label="Configuracion"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </AccessibleTooltip>
            <AccessibleTooltip label="Cerrar sesión">
              <Button
                variant="secondary"
                size="lg"
                onClick={onLogout}
                className="h-12 w-12 p-0"
                aria-label="Cerrar sesion"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </AccessibleTooltip>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <section aria-label="Bienvenida">
          <Card className="border-2 shadow-xl mb-8 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg"
                    style={{ backgroundColor: avatarColor ?? "hsl(var(--primary))" }}
                    aria-hidden="true"
                  >
                    {(user?.name ?? "E").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-center sm:text-left">
                    <SpeakableText
                      as="h2"
                      className="text-3xl font-bold text-foreground mb-2"
                      speakText={`Hola, ${user?.name?.split(" ")[0]}! Bienvenido a EduAccess.`}
                    >
                      Hola, {user?.name?.split(" ")[0]}!
                    </SpeakableText>
                    <SpeakableText as="p" className="text-xl text-muted-foreground">
                      Que bueno verte de nuevo. Sigamos aprendiendo!
                    </SpeakableText>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Stats Cards */}
        <section aria-label="Tu progreso y logros" className="mb-8">
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-6 list-none p-0">
            {/* ── Estrellas ── */}
            <li>
              <Card className="border-2 shadow-lg h-full">
                <CardContent className="p-6 flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-md" aria-hidden="true">
                    <Star className="w-9 h-9 text-white fill-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-bold text-foreground leading-none">{estrellasTotales}</span>
                      <Star className="w-6 h-6 text-amber-400 fill-amber-400 shrink-0" aria-hidden="true" />
                    </div>
                    <p className="text-base font-semibold text-muted-foreground mt-0.5">Estrellas totales</p>
                  </div>
                </CardContent>
              </Card>
            </li>

            {/* ── Nivel ── */}
            <li>
              <Card className="border-2 shadow-lg h-full">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-success rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-md" aria-hidden="true">
                      {nivelEmoji}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground leading-tight">
                        Nivel <span className="text-primary">{nivelActual}</span>
                      </p>
                      <p className="text-base font-semibold text-muted-foreground">{nivelNombre}</p>
                    </div>
                  </div>
                  {nivelMax !== Infinity && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="flex items-center gap-1 text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                          {estrellasTotales}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          Meta: <span className="text-amber-500 font-semibold">{nivelMax + 1}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline ml-0.5 -mt-0.5" aria-hidden="true" />
                        </span>
                      </div>
                      <Progress value={progressToNext} className="h-3" aria-label={`${progressToNext}% hacia el siguiente nivel`} />
                      <p className="text-xs text-right text-muted-foreground">{progressToNext}% hacia el siguiente nivel</p>
                    </div>
                  )}
                  {nivelMax === Infinity && (
                    <p className="text-sm font-semibold text-muted-foreground">✨ Nivel máximo alcanzado</p>
                  )}
                </CardContent>
              </Card>
            </li>

            {/* ── Racha ── */}
            <li>
              <Card className="border-2 shadow-lg h-full">
                <CardContent className="p-6 flex items-center gap-5">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                      streakDays > 0
                        ? "bg-gradient-to-br from-orange-400 to-red-500"
                        : "bg-gradient-to-br from-slate-300 to-slate-400"
                    }`}
                    aria-hidden="true"
                  >
                    <Flame className="w-9 h-9 text-white fill-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-bold text-foreground leading-none">{streakDays}</span>
                      <Flame
                        className={`w-6 h-6 shrink-0 ${
                          streakDays > 0 ? "text-orange-500 fill-orange-500" : "text-slate-400 fill-slate-400"
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-base font-semibold text-muted-foreground mt-0.5">
                      {streakDays === 1 ? "Día de racha" : "Días de racha"}
                    </p>
                    {streakDays > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 bg-orange-100 rounded-full px-3 py-1 mt-2">
                        🔥 ¡Sigue así!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground bg-muted rounded-full px-3 py-1 mt-2">
                        Comienza tu racha hoy
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          </ul>
        </section>

        {/* Main Action Button */}
        <Button
          size="lg"
          className="w-full h-20 text-2xl mb-8 shadow-lg"
          onClick={() => onNavigate("activity-image")}
          {...hoverContinuar}
        >
          <Play className="w-8 h-8 mr-4" aria-hidden="true" />
          Continuar Aprendiendo
          <Sparkles className="w-6 h-6 ml-4" aria-hidden="true" />
        </Button>

        {/* Courses */}
        <section aria-label="Mis cursos">
          <h3 className="text-2xl font-bold text-foreground mb-6">Mis Cursos</h3>

          {!loading && courses.length === 0 && (
            <Card className="border-2 border-dashed mb-8">
              <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center" aria-hidden="true">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">Aún no tienes cursos</p>
                <p className="text-base text-muted-foreground max-w-xs">
                  Pídele a tu docente el código de curso e ingrésalo para ver tus cursos aquí.
                </p>
                <Button
                  variant="outline"
                  className="mt-2 border-2"
                  onClick={() => onNavigate("join-group")}
                >
                  <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />
                  Unirme a un Curso
                </Button>
              </CardContent>
            </Card>
          )}

          <ul className="grid gap-6 mb-8 list-none p-0">
          {courses.map((course) => (
            <li key={course.id}>
            <article aria-label={`Curso: ${course.name}`}>
            <Card
              className="border-2 shadow-lg hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => onNavigate(`course-${course.id}|${course.name}`)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <SpeakableText as="h4" className="text-xl font-bold text-foreground">
                        {course.name}
                      </SpeakableText>
                      <SpeakableText
                        as="p"
                        className="text-base text-muted-foreground mt-1"
                        speakText={`Siguiente lección: ${course.currentLesson}`}
                      >
                        Siguiente: {course.currentLesson}
                      </SpeakableText>
                      <SpeakableText
                        as="p"
                        className="text-sm text-muted-foreground"
                        speakText={`${course.completedLessons} de ${course.totalLessons} lecciones completadas`}
                      >
                        {course.completedLessons} de {course.totalLessons} lecciones
                      </SpeakableText>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="w-32">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Progreso</span>
                        <span className="text-lg font-bold text-primary">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-3" />
                    </div>
                    <ChevronRight className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                  </div>
                </div>
              </CardContent>
            </Card>
            </article>
            </li>
          ))}
          </ul>
        </section>

        {/* Quick Actions */}
        <nav aria-label="Acciones rápidas del estudiante">
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-lg border-2"
            onClick={() => onNavigate("student-progress")}
            {...hoverProgreso}
          >
            <BarChart3 className="w-6 h-6 mr-3" aria-hidden="true" />
            Mi Progreso
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-lg border-2"
            onClick={() => onNavigate("student-calendar")}
            {...hoverCalendario}
          >
            <Calendar className="w-6 h-6 mr-3" aria-hidden="true" />
            Mi Calendario
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-lg border-2"
            onClick={() => onNavigate("accessibility")}
            {...hoverAjustes}
          >
            <Settings className="w-6 h-6 mr-3" aria-hidden="true" />
            Ajustes
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-lg border-2 col-span-2"
            onClick={() => onNavigate("join-group")}
            {...hoverUnirse}
          >
            <BookOpen className="w-6 h-6 mr-3" aria-hidden="true" />
            Unirme a un Curso
          </Button>
        </div>
        </nav>
      </main>
    </div>
  )
}
