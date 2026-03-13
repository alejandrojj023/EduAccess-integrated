"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { useTeacherDashboard } from "@/hooks/teacher/use-teacher-dashboard"
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
} from "lucide-react"

interface TeacherDashboardProps {
  onNavigate: (screen: string) => void
  onLogout: () => void
}

export function TeacherDashboard({ onNavigate, onLogout }: TeacherDashboardProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()
  const { stats: dashboardStats, recentActivity, loading } = useTeacherDashboard()

  const stats = [
    { label: "Estudiantes", value: dashboardStats.estudiantes, icon: Users, color: "bg-primary" },
    { label: "Cursos", value: dashboardStats.cursos, icon: BookOpen, color: "bg-accent" },
    { label: "Progreso General", value: dashboardStats.progresoGeneral, icon: TrendingUp, color: "bg-success" },
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
            <Button
              variant="outline"
              size="lg"
              onClick={() => onNavigate("accessibility")}
              className="h-12"
            >
              <Settings className="w-5 h-5" aria-hidden="true" />
              <span className="sr-only">Configuracion de accesibilidad</span>
            </Button>
            <Button variant="outline" size="lg" onClick={onLogout} className="h-12">
              <LogOut className="w-5 h-5 mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground">
            Hola, {user?.name?.split(" ")[0]}
          </h2>
          <p className="text-xl text-muted-foreground mt-2">
            Este es el resumen de tu clase
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-2 shadow-lg">
              <CardContent className="p-6 flex items-center gap-5">
                <div className={`w-16 h-16 ${stat.color} rounded-2xl flex items-center justify-center`}>
                  <stat.icon className="w-8 h-8 text-primary-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-4xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-lg text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation Cards */}
        <h3 className="text-2xl font-bold text-foreground mb-6">Gestionar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Button
            variant="outline"
            className="h-auto p-8 flex flex-col items-center gap-4 border-2 hover:border-primary hover:bg-primary/5"
            onClick={() => onNavigate("courses")}
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <span className="text-xl font-semibold text-foreground">Cursos</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-8 flex flex-col items-center gap-4 border-2 hover:border-primary hover:bg-primary/5"
            onClick={() => onNavigate("courses")}
          >
            <div className="w-16 h-16 bg-accent/30 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-accent-foreground" aria-hidden="true" />
            </div>
            <span className="text-xl font-semibold text-foreground">Lecciones</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-8 flex flex-col items-center gap-4 border-2 hover:border-primary hover:bg-primary/5"
            onClick={() => onNavigate("activities")}
          >
            <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" aria-hidden="true" />
            </div>
            <span className="text-xl font-semibold text-foreground">Actividades</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-8 flex flex-col items-center gap-4 border-2 hover:border-primary hover:bg-primary/5"
            onClick={() => onNavigate("analytics")}
          >
            <div className="w-16 h-16 bg-chart-4/20 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-chart-4" aria-hidden="true" />
            </div>
            <span className="text-xl font-semibold text-foreground">Analiticas</span>
          </Button>
        </div>

        {/* Recent Activity */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-2xl flex items-center gap-3">
              <Clock className="w-6 h-6 text-primary" aria-hidden="true" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {recentActivity.map((activity, index) => (
                <li key={index} className="p-5 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{activity.student}</p>
                      <p className="text-base text-muted-foreground">{activity.activity}</p>
                    </div>
                    <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {activity.time}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Button
            size="lg"
            className="h-14 text-lg px-8"
            onClick={() => onNavigate("create-course")}
          >
            <Plus className="w-6 h-6 mr-3" aria-hidden="true" />
            Crear Nuevo Curso
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-14 text-lg px-8 border-2"
            onClick={() => onNavigate("students")}
          >
            <Users className="w-6 h-6 mr-3" aria-hidden="true" />
            Ver Estudiantes
          </Button>
        </div>
      </main>
    </div>
  )
}
