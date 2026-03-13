"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { useStudentDashboard } from "@/hooks/student/use-student-dashboard"
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
} from "lucide-react"

interface StudentDashboardProps {
  onNavigate: (screen: string) => void
  onLogout: () => void
}

export function StudentDashboard({ onNavigate, onLogout }: StudentDashboardProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()
  const { courses, gamification, loading } = useStudentDashboard()

  const { totalStars, currentLevel, streakDays } = gamification

  const handleReadInstructions = () => {
    speak(
      `Hola ${user?.name}! Bienvenido a tu panel de aprendizaje. Tienes ${courses.length} cursos asignados. Tu nivel actual es ${currentLevel} y has ganado ${totalStars} estrellas. Presiona el boton Continuar Aprendiendo para seguir con tu leccion actual.`
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6" aria-hidden="true" />
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
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onNavigate("accessibility")}
              className="h-12 w-12 p-0"
              aria-label="Configuracion"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={onLogout}
              className="h-12 w-12 p-0"
              aria-label="Cerrar sesion"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <Card className="border-2 shadow-xl mb-8 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center text-4xl font-bold text-primary-foreground shadow-lg">
                  {user?.name?.charAt(0) || "E"}
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-3xl font-bold text-foreground mb-2">
                    Hola, {user?.name?.split(" ")[0]}!
                  </h2>
                  <p className="text-xl text-muted-foreground">
                    Que bueno verte de nuevo. Sigamos aprendiendo!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <Card className="border-2 shadow-lg">
            <CardContent className="p-6 flex items-center gap-5">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center">
                <Star className="w-8 h-8 text-primary-foreground" aria-hidden="true" />
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">{totalStars}</p>
                <p className="text-lg text-muted-foreground">Estrellas</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardContent className="p-6 flex items-center gap-5">
              <div className="w-16 h-16 bg-success rounded-2xl flex items-center justify-center">
                <Trophy className="w-8 h-8 text-success-foreground" aria-hidden="true" />
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">Nivel {currentLevel}</p>
                <p className="text-lg text-muted-foreground">Explorador</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Action Button */}
        <Button
          size="lg"
          className="w-full h-20 text-2xl mb-8 shadow-lg"
          onClick={() => onNavigate("activity-image")}
        >
          <Play className="w-8 h-8 mr-4" aria-hidden="true" />
          Continuar Aprendiendo
          <Sparkles className="w-6 h-6 ml-4" aria-hidden="true" />
        </Button>

        {/* Courses */}
        <h3 className="text-2xl font-bold text-foreground mb-6">Mis Cursos</h3>
        <div className="grid gap-6 mb-8">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="border-2 shadow-lg hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => onNavigate(`activity-${course.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-foreground">{course.name}</h4>
                      <p className="text-base text-muted-foreground mt-1">
                        Siguiente: {course.currentLesson}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {course.completedLessons} de {course.totalLessons} lecciones
                      </p>
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
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-lg border-2"
            onClick={() => onNavigate("student-progress")}
          >
            <BarChart3 className="w-6 h-6 mr-3" aria-hidden="true" />
            Mi Progreso
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-lg border-2"
            onClick={() => onNavigate("accessibility")}
          >
            <Settings className="w-6 h-6 mr-3" aria-hidden="true" />
            Ajustes
          </Button>
        </div>
      </main>
    </div>
  )
}
