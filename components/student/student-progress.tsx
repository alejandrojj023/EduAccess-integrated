"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { useStudentProgress } from "@/hooks/student/use-student-progress"
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
} from "lucide-react"

interface StudentProgressProps {
  onBack: () => void
}

export function StudentProgress({ onBack }: StudentProgressProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()
  const { lessons: lessonProgressData, stats, loading } = useStudentProgress()

  const {
    completedLessons,
    totalLessons,
    overallProgress,
    averageScore,
    totalAttempts,
    currentStreak,
    totalStars,
  } = stats

  const handleReadInstructions = () => {
    speak(
      `Tu reporte de progreso. Has completado ${completedLessons} de ${totalLessons} lecciones. Tu puntaje promedio es ${averageScore} por ciento. Tu racha actual es de ${currentStreak} dias.`
    )
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
        <Card className="border-2 shadow-xl mb-8 overflow-hidden">
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
                      Nivel 3 - Explorador
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-2 shadow-lg">
            <CardContent className="p-5 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
                <BookOpen className="w-7 h-7 text-primary" aria-hidden="true" />
              </div>
              <p className="text-3xl font-bold text-foreground">{completedLessons}</p>
              <p className="text-sm text-muted-foreground">Lecciones Completadas</p>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardContent className="p-5 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center mb-3">
                <Target className="w-7 h-7 text-success" aria-hidden="true" />
              </div>
              <p className="text-3xl font-bold text-foreground">{averageScore}%</p>
              <p className="text-sm text-muted-foreground">Puntaje Promedio</p>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardContent className="p-5 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center mb-3">
                <Star className="w-7 h-7 text-accent-foreground" aria-hidden="true" />
              </div>
              <p className="text-3xl font-bold text-foreground">45</p>
              <p className="text-sm text-muted-foreground">Estrellas Ganadas</p>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardContent className="p-5 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-chart-4/20 rounded-2xl flex items-center justify-center mb-3">
                <Clock className="w-7 h-7 text-chart-4" aria-hidden="true" />
              </div>
              <p className="text-3xl font-bold text-foreground">{totalAttempts}</p>
              <p className="text-sm text-muted-foreground">Total Intentos</p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
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
                <Progress value={overallProgress} className="h-6" />
              </div>
              <span className="text-3xl font-bold text-primary">{overallProgress}%</span>
            </div>
            <p className="text-muted-foreground mt-4">
              Has completado {completedLessons} de {totalLessons} lecciones. Sigue asi!
            </p>
          </CardContent>
        </Card>

        {/* Lessons List */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Detalle por Leccion</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {lessonProgressData.map((lesson, index) => (
                <li key={lesson.id} className="p-5 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          lesson.completed ? "bg-success/10" : "bg-muted"
                        }`}
                      >
                        {lesson.completed ? (
                          <CheckCircle className="w-6 h-6 text-success" aria-hidden="true" />
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-foreground">{lesson.name}</h4>
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

                    {lesson.completed && (
                      <div className="text-right">
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
                        <div className="flex items-center gap-1 justify-end">
                          {[...Array(Math.floor(lesson.score / 20))].map((_, i) => (
                            <Star
                              key={i}
                              className="w-4 h-4 text-accent fill-accent"
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
