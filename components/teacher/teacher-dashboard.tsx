"use client"

import { useState, useMemo, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { useTeacherDashboard } from "@/hooks/teacher/use-teacher-dashboard"
import { AccessibleTooltip, useSpeakOnHover } from "@/components/ui/accessible-tooltip"

import {
  BookOpen,
  Users,
  BarChart3,
  FolderOpen,
  Plus,
  LogOut,
  Settings,
  Volume2,
  TrendingUp,
  Clock,
  CheckCircle,
  History,
  RefreshCw,
  ChevronRight,
} from "lucide-react"

interface TeacherDashboardProps {
  onNavigate: (screen: string) => void
  onLogout: () => void
}

export function TeacherDashboard({ onNavigate, onLogout }: TeacherDashboardProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()
  const { stats: dashboardStats, recentActivity, loading, refetch } = useTeacherDashboard()

  const [avatarColor] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("ea_avatar_color") : null
  )

  const hoverCursos      = useSpeakOnHover("Cursos: gestionar tus cursos y lecciones")
  const hoverLecciones   = useSpeakOnHover("Lecciones: ver y editar lecciones de tus cursos")
  const hoverActividades = useSpeakOnHover("Constructor de Actividades: crear y editar actividades")
  const hoverAnaliticas  = useSpeakOnHover("Analíticas: ver el progreso de tus estudiantes")
  const hoverCrearCurso  = useSpeakOnHover("Crear Nuevo Curso")
  const hoverEstudiantes = useSpeakOnHover("Ver la lista de tus estudiantes")
  const hoverActividadReciente = useSpeakOnHover("Actividad Reciente: registro de los últimos movimientos de tus alumnos.")
  const hoverEstudiantesCard   = useSpeakOnHover(`Estudiantes: total de alumnos inscritos. Actualmente ${dashboardStats.estudiantes}`)
  const hoverCursosCard        = useSpeakOnHover(`Cursos: cursos activos. Actualmente ${dashboardStats.cursos}`)
  const hoverProgresoCard      = useSpeakOnHover(`Progreso General: ${dashboardStats.progresoGeneral}`)

  const statCards = useMemo(() => [
    {
      label: "Estudiantes",
      sub: "Total inscritos",
      value: dashboardStats.estudiantes,
      icon: Users,
      hover: hoverEstudiantesCard,
      gradient: "from-blue-400 to-blue-600",
      border: "border-blue-200",
    },
    {
      label: "Cursos",
      sub: "Material disponible",
      value: dashboardStats.cursos,
      icon: BookOpen,
      hover: hoverCursosCard,
      gradient: "from-violet-400 to-violet-600",
      border: "border-violet-200",
    },
    {
      label: "Progreso general",
      sub: "Media de completado",
      value: dashboardStats.progresoGeneral,
      icon: TrendingUp,
      hover: hoverProgresoCard,
      gradient: "from-emerald-400 to-teal-600",
      border: "border-emerald-200",
    },
  ], [dashboardStats, hoverEstudiantesCard, hoverCursosCard, hoverProgresoCard])

  const handleReadInstructions = useCallback(() => {
    speak(
      `Panel del docente. Bienvenido ${user?.name}. Tienes ${dashboardStats.estudiantes} estudiantes, ${dashboardStats.cursos} cursos activos, y el progreso general es del ${dashboardStats.progresoGeneral}.`
    )
  }, [speak, user?.name, dashboardStats])

  const navItems = [
    { label: "Cursos",      sub: loading ? null : `${dashboardStats.cursos} activos`,  Icon: FolderOpen,  screen: "courses",    hover: hoverCursos,      color: "bg-blue-100 group-hover:bg-blue-200",       icon: "text-blue-600"    },
    { label: "Lecciones",   sub: "Por curso",                                           Icon: BookOpen,    screen: "courses",    hover: hoverLecciones,   color: "bg-amber-100 group-hover:bg-amber-200",    icon: "text-amber-600"   },
    { label: "Actividades", sub: "Crear y editar",                                      Icon: CheckCircle, screen: "activities", hover: hoverActividades, color: "bg-violet-100 group-hover:bg-violet-200",  icon: "text-violet-600"  },
    { label: "Analíticas",  sub: "Ver estadísticas",                                    Icon: BarChart3,   screen: "analytics",  hover: hoverAnaliticas,  color: "bg-emerald-100 group-hover:bg-emerald-200", icon: "text-emerald-600" },
  ]

  const initials = (user?.name ?? "D").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
  const firstName = user?.name?.split(" ")[0] ?? "Docente"

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[#008e92] shadow-sm">
              <img src="/2.svg" alt="EduAccess" className="h-full w-full object-cover" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-black leading-none text-foreground">EduAccess</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Panel del Docente</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.voiceEnabled && (
              <button
                type="button"
                onClick={handleReadInstructions}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]"
                aria-label="Escuchar resumen"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline text-xs">Escuchar</span>
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
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline text-xs">Salir</span>
              </button>
            </AccessibleTooltip>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-5 py-7">

        {/* ── WELCOME HERO ── */}
        <section aria-label="Bienvenida">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <div className="absolute -bottom-8 left-1/4 w-32 h-32 rounded-full bg-blue-500/15 blur-2xl" aria-hidden />
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} aria-hidden />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg border-2 border-white/30"
                  style={{ backgroundColor: avatarColor ?? "rgba(255,255,255,0.25)" }}
                  aria-hidden="true"
                >
                  {initials}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center">
                    <span className="text-[8px]">✓</span>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-black text-white leading-tight">
                    Hola, {firstName}
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">Este es el resumen de tu clase</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate("create-course")}
                  {...hoverCrearCurso}
                  className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.97]"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Crear curso
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("students")}
                  {...hoverEstudiantes}
                  className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/20 active:scale-[0.97]"
                >
                  <Users className="h-4 w-4" aria-hidden />
                  Estudiantes
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section aria-label="Estadísticas de la clase">
          <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
            {statCards.map((s) => (
              <li key={s.label}>
                <div
                  className={`relative overflow-hidden rounded-3xl border-2 ${s.border} bg-gradient-to-br ${s.gradient} p-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
                  {...s.hover}
                >
                  <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/15 blur-xl" aria-hidden />
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center shrink-0 shadow-inner">
                      <s.icon className="h-6 w-6 text-white" aria-hidden />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-white leading-none">{s.value}</p>
                      <p className="text-sm font-bold text-white/90 mt-0.5">{s.label}</p>
                      <p className="text-xs text-white/70">{s.sub}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── NAV CARDS ── */}
        <nav aria-label="Menú principal del docente">
          <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Gestionar</h3>
          <ul className="grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
            {navItems.map(({ label, sub, Icon, screen, hover, color, icon }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => onNavigate(screen)}
                  {...hover}
                  className="group flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${color}`}>
                    <Icon className={`h-6 w-6 ${icon}`} aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-foreground block leading-tight">{label}</span>
                    {sub != null
                      ? <span className="text-xs text-muted-foreground mt-0.5 block">{sub}</span>
                      : <span className="block h-3 w-12 rounded-md bg-muted animate-pulse mt-1 mx-auto" aria-hidden="true" />
                    }
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── RECENT ACTIVITY ── */}
        <section aria-label="Actividad reciente de estudiantes">
          <div className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-sm">
            <div
              className="flex items-center justify-between border-b border-border px-5 py-4"
              {...hoverActividadReciente}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" aria-hidden />
                </div>
                <h3 className="text-sm font-black text-foreground">Actividad reciente</h3>
              </div>
              <button
                type="button"
                onClick={refetch}
                aria-label="Actualizar actividad reciente"
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Actualizar
              </button>
            </div>

            <div className="p-4">
              {recentActivity.length === 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 py-10 text-center px-4">
                    <History className="mb-3 h-10 w-10 text-muted-foreground/30" aria-hidden />
                    <p className="text-sm font-bold text-foreground">Sin actividad reciente</p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      Aquí aparecerán los avances de tus alumnos cuando completen actividades.
                    </p>
                  </div>
                  <ul className="space-y-2 list-none p-0 opacity-40" aria-label="Ejemplo de actividad" aria-hidden="true">
                    {[
                      { student: "Nicolás", activity: 'Completó "Comprensión lectora"', time: "Hace 12 min", score: 85 },
                      { student: "Sofía",   activity: 'Completó "Sopa de letras"',      time: "Hace 45 min", score: 60 },
                    ].map((item, i) => (
                      <li key={i}>
                        <ActivityRow student={item.student} activity={item.activity} time={item.time} score={item.score} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ul className="space-y-2 list-none p-0" aria-label="Lista de actividad reciente">
                  {recentActivity.map((activity) => (
                    <li key={activity.id}>
                      <ActivityRow student={activity.student} activity={activity.activity} time={activity.time} score={activity.score} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}

function ActivityRow({ student, activity, time, score }: {
  student: string
  activity: string
  time: string
  score?: number | null
}) {
  const initials = student.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()

  const scoreBadge = score != null ? {
    label: `${score}%`,
    ariaLabel: `Puntaje: ${score}%`,
    className: score >= 70
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : score >= 40
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-red-50 text-red-700 border border-red-200",
  } : null

  return (
    <article
      aria-label={`${student}: ${activity}${score != null ? `, puntaje ${score}%` : ""}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary"
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground leading-tight">{student}</p>
        <p className="truncate text-xs text-muted-foreground mt-0.5">{activity}</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <time className="text-xs text-muted-foreground font-medium">{time}</time>
        {scoreBadge ? (
          <span
            aria-label={scoreBadge.ariaLabel}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${scoreBadge.className}`}
          >
            {scoreBadge.label}
          </span>
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        )}
      </div>
    </article>
  )
}
