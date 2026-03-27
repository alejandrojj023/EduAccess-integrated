"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  const [avatarColor, setAvatarColor] = useState<string | null>(null)
  useEffect(() => {
    setAvatarColor(localStorage.getItem("ea_avatar_color"))
  }, [])

  // Hover-to-speak para botones con texto visible
  const hoverCursos      = useSpeakOnHover("Cursos: gestionar tus cursos y lecciones")
  const hoverLecciones   = useSpeakOnHover("Lecciones: ver y editar lecciones de tus cursos")
  const hoverActividades = useSpeakOnHover("Constructor de Actividades: crear y editar actividades")
  const hoverAnaliticas  = useSpeakOnHover("Analíticas: ver el progreso de tus estudiantes")
  const hoverCrearCurso  = useSpeakOnHover("Crear Nuevo Curso")
  const hoverEstudiantes = useSpeakOnHover("Ver la lista de tus estudiantes")

  const hoverActividadReciente = useSpeakOnHover("Actividad Reciente: registro de los últimos movimientos de tus alumnos. Aquí puedes ver qué actividades han completado y cuándo.")
  const hoverEstudiantesCard  = useSpeakOnHover(`Estudiantes: total de alumnos inscritos en tus grupos. Actualmente ${dashboardStats.estudiantes}`)
  const hoverCursosCard       = useSpeakOnHover(`Cursos: número de cursos que tienes activos. Actualmente ${dashboardStats.cursos}`)
  const hoverProgresoCard     = useSpeakOnHover(`Progreso General: porcentaje promedio de avance de todos tus alumnos en los cursos activos. Actualmente ${dashboardStats.progresoGeneral}`)

  const stats = [
    { label: "Estudiantes",     value: dashboardStats.estudiantes,    icon: Users,      color: "bg-primary", hover: hoverEstudiantesCard },
    { label: "Cursos",          value: dashboardStats.cursos,         icon: BookOpen,   color: "bg-accent",  hover: hoverCursosCard      },
    { label: "Progreso General",value: dashboardStats.progresoGeneral,icon: TrendingUp, color: "bg-success", hover: hoverProgresoCard     },
  ]

  const handleReadInstructions = () => {
    speak(
      `Panel del docente. Bienvenido ${user?.name}. Tienes ${dashboardStats.estudiantes} estudiantes, ${dashboardStats.cursos} cursos activos, y el progreso general es del ${dashboardStats.progresoGeneral}. Puedes gestionar cursos, lecciones, actividades y ver las analiticas.`
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">EduAccess</h1>
              <p className="text-sm text-muted-foreground">Panel del Docente</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings.voiceEnabled && (
              <Button
                variant="outline"
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
                variant="outline"
                size="lg"
                onClick={() => onNavigate("accessibility")}
                className="h-12 w-12 p-0"
                aria-label="Configuracion de accesibilidad"
              >
                <Settings className="w-5 h-5" aria-hidden="true" />
              </Button>
            </AccessibleTooltip>
            <AccessibleTooltip label="Cerrar sesión">
              <Button variant="outline" size="lg" onClick={onLogout} className="h-12">
                <LogOut className="w-5 h-5 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </AccessibleTooltip>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <section aria-label="Bienvenida" className="mb-8">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md"
              style={{ backgroundColor: avatarColor ?? "hsl(var(--primary))" }}
              aria-hidden="true"
            >
              {(user?.name ?? "D").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Hola, {user?.name?.split(" ")[0]}
              </h2>
              <p className="text-xl text-muted-foreground mt-1">
                Este es el resumen de tu clase
              </p>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section aria-label="Estadísticas de la clase" className="mb-8">
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0">
            {stats.map((stat) => (
              <li key={stat.label}>
                <Card className="border-2 shadow-lg h-full" {...stat.hover}>
                  <CardContent className="p-6 flex items-center gap-5">
                    <div className={`w-16 h-16 ${stat.color} rounded-2xl flex items-center justify-center`} aria-hidden="true">
                      <stat.icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-4xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-lg text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {/* Navigation Cards */}
        <nav aria-label="Menú principal del docente">
          <h3 className="text-2xl font-bold text-foreground mb-6">Gestionar</h3>
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 list-none p-0">
            <li>
              <Button
                variant="outline"
                className="w-full h-auto p-8 flex flex-col items-center gap-4 border-2 hover:border-primary hover:bg-primary/5"
                onClick={() => onNavigate("courses")}
                {...hoverCursos}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center" aria-hidden="true">
                  <FolderOpen className="w-8 h-8 text-primary" />
                </div>
                <span className="text-xl font-semibold text-foreground">Cursos</span>
              </Button>
            </li>
            <li>
              <Button
                variant="outline"
                className="w-full h-auto p-8 flex flex-col items-center gap-4 border-2 hover:border-primary hover:bg-primary/5"
                onClick={() => onNavigate("courses")}
                {...hoverLecciones}
              >
                <div className="w-16 h-16 bg-accent/30 rounded-2xl flex items-center justify-center" aria-hidden="true">
                  <BookOpen className="w-8 h-8 text-accent-foreground" />
                </div>
                <span className="text-xl font-semibold text-foreground">Lecciones</span>
              </Button>
            </li>
            <li>
              <Button
                variant="outline"
                className="w-full h-auto p-8 flex flex-col items-center gap-4 border-2 hover:border-primary hover:bg-primary/5"
                onClick={() => onNavigate("activities")}
                {...hoverActividades}
              >
                <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center" aria-hidden="true">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <span className="text-xl font-semibold text-foreground">Actividades</span>
              </Button>
            </li>
            <li>
              <Button
                variant="outline"
                className="w-full h-auto p-8 flex flex-col items-center gap-4 border-2 hover:border-primary hover:bg-primary/5"
                onClick={() => onNavigate("analytics")}
                {...hoverAnaliticas}
              >
                <div className="w-16 h-16 bg-chart-4/20 rounded-2xl flex items-center justify-center" aria-hidden="true">
                  <BarChart3 className="w-8 h-8 text-chart-4" />
                </div>
                <span className="text-xl font-semibold text-foreground">Analiticas</span>
              </Button>
            </li>
          </ul>
        </nav>

        {/* Recent Activity */}
        <section aria-label="Actividad reciente de estudiantes">
          <Card className="border-2 shadow-lg">
            <CardHeader className="border-b border-border" {...hoverActividadReciente}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Clock className="w-6 h-6 text-primary" aria-hidden="true" />
                  Actividad Reciente
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refetch}
                  aria-label="Actualizar actividad reciente"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="w-14 h-14 text-muted-foreground mb-4" aria-hidden="true" />
                  <p className="text-lg font-bold text-foreground mb-1">Sin actividad reciente</p>
                  <p className="text-base text-muted-foreground">
                    Aquí aparecerán los avances de tus alumnos cuando completen actividades
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border" aria-label="Lista de actividad reciente">
                  {recentActivity.map((activity, index) => (
                    <li key={index} className="p-5 hover:bg-muted/50 transition-colors">
                      <article aria-label={`${activity.student}: ${activity.activity}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-semibold text-foreground">{activity.student}</p>
                            <p className="text-base text-muted-foreground">{activity.activity}</p>
                          </div>
                          <time className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {activity.time}
                          </time>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Quick Actions */}
        <aside aria-label="Acciones rápidas" className="mt-8">
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              className="h-14 text-lg px-8"
              onClick={() => onNavigate("create-course")}
              {...hoverCrearCurso}
            >
              <Plus className="w-6 h-6 mr-3" aria-hidden="true" />
              Crear Nuevo Curso
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-14 text-lg px-8 border-2"
              onClick={() => onNavigate("students")}
              {...hoverEstudiantes}
            >
              <Users className="w-6 h-6 mr-3" aria-hidden="true" />
              Ver Estudiantes
            </Button>
          </div>
        </aside>
      </main>
    </div>
  )
}
