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

  const stats = useMemo(() => [
    { label: "Estudiantes",      sub: "Total inscritos",     value: dashboardStats.estudiantes,     icon: Users,      hover: hoverEstudiantesCard },
    { label: "Cursos",           sub: "Material disponible", value: dashboardStats.cursos,          icon: BookOpen,   hover: hoverCursosCard      },
    { label: "Progreso general", sub: "Media de completado", value: dashboardStats.progresoGeneral, icon: TrendingUp, hover: hoverProgresoCard     },
  ], [dashboardStats, hoverEstudiantesCard, hoverCursosCard, hoverProgresoCard])

  const handleReadInstructions = useCallback(() => {
    speak(
      `Panel del docente. Bienvenido ${user?.name}. Tienes ${dashboardStats.estudiantes} estudiantes, ${dashboardStats.cursos} cursos activos, y el progreso general es del ${dashboardStats.progresoGeneral}.`
    )
  }, [speak, user?.name, dashboardStats])

  const navItems = [
    { label: "Cursos",      Icon: FolderOpen,  screen: "courses",    hover: hoverCursos      },
    { label: "Lecciones",   Icon: BookOpen,    screen: "courses",    hover: hoverLecciones   },
    { label: "Actividades", Icon: CheckCircle, screen: "activities", hover: hoverActividades },
    { label: "Analíticas",  Icon: BarChart3,   screen: "analytics",  hover: hoverAnaliticas  },
  ]

  const initials = (user?.name ?? "D").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[#008e92]">
              <img src="/2.svg" alt="EduAccess" className="h-full w-full object-cover" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-foreground">EduAccess</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Panel del Docente</p>
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
                aria-label="Configuración de accesibilidad"
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
                <span className="hidden sm:inline">Salir</span>
              </button>
            </AccessibleTooltip>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">

        {/* ── WELCOME BANNER ── */}
        <section aria-label="Bienvenida">
          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm"
                style={{ backgroundColor: avatarColor ?? "#008e92" }}
                aria-hidden="true"
              >
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Hola, {user?.name?.split(" ")[0]}
                </h2>
                <p className="text-sm text-muted-foreground">Este es el resumen de tu clase</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate("create-course")}
                {...hoverCrearCurso}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Crear curso
              </button>
              <button
                type="button"
                onClick={() => onNavigate("students")}
                {...hoverEstudiantes}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Ver estudiantes
              </button>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section aria-label="Estadísticas de la clase">
          <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
            {stats.map((stat) => (
              <li key={stat.label}>
                <div
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                  {...stat.hover}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <stat.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm font-semibold text-foreground">{stat.label}</p>
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── NAV CARDS ── */}
        <nav aria-label="Menú principal del docente">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gestionar</h3>
          <ul className="grid list-none grid-cols-2 gap-4 p-0 lg:grid-cols-4">
            {navItems.map(({ label, Icon, screen, hover }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => onNavigate(screen)}
                  {...hover}
                  className="group flex w-full flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── RECENT ACTIVITY ── */}
        <section aria-label="Actividad reciente de estudiantes">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div
              className="flex items-center justify-between border-b border-border px-6 py-4"
              {...hoverActividadReciente}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-bold text-foreground">Actividad reciente</h3>
              </div>
              <button
                type="button"
                onClick={refetch}
                aria-label="Actualizar actividad reciente"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Actualizar
              </button>
            </div>

            <div className="p-4">
              {recentActivity.length === 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-8 text-center">
                    <History className="mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">Sin actividad reciente</p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      Aquí aparecerán los avances de tus alumnos cuando completen actividades.
                    </p>
                  </div>
                  <ul className="space-y-2 list-none p-0" aria-label="Ejemplo de actividad">
                    {[
                      { student: "Nicolás", activity: "Completó Comprensión de lectura", time: "Hace 12 min" },
                      { student: "Sofía",   activity: "Completó Sopa de letras",         time: "Hace 45 min" },
                    ].map((item, i) => (
                      <li key={i}>
                        <ActivityRow student={item.student} activity={item.activity} time={item.time} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ul className="space-y-2 list-none p-0" aria-label="Lista de actividad reciente">
                  {recentActivity.map((activity, i) => (
                    <li key={i}>
                      <ActivityRow student={activity.student} activity={activity.activity} time={activity.time} />
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

function ActivityRow({ student, activity, time }: { student: string; activity: string; time: string }) {
  return (
    <article
      aria-label={`${student}: ${activity}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/60"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <CheckCircle className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{student}</p>
        <p className="truncate text-xs text-muted-foreground">{activity}</p>
      </div>
      <time className="shrink-0 text-xs text-muted-foreground">{time}</time>
    </article>
  )
}
