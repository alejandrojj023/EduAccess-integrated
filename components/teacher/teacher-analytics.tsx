"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAnalytics } from "@/hooks/teacher/use-analytics"
import { useSpeakOnHover } from "@/components/ui/accessible-tooltip"
import {
  ArrowLeft,
  Volume2,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Target,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface TeacherAnalyticsProps {
  onBack: () => void
}

export function TeacherAnalytics({ onBack }: TeacherAnalyticsProps) {
  const { speak, settings } = useAccessibility()
  const {
    performanceData,
    progressData,
    activityTypeData,
    studentPerformance,
    overallStats,
    loading,
  } = useAnalytics()

  const hoverCorrect  = useSpeakOnHover(`Respuestas correctas: promedio de respuestas acertadas por tus alumnos. Actualmente ${overallStats.averageCorrect}%`)
  const hoverIntentos = useSpeakOnHover(`Total de intentos: número de actividades completadas por todos tus alumnos. Total: ${overallStats.totalAttempts}`)
  const hoverTiempo   = useSpeakOnHover(`Tiempo promedio: cuánto tardan tus alumnos en completar una actividad. Promedio: ${overallStats.averageTime}`)
  const hoverActivos  = useSpeakOnHover(`Estudiantes activos: alumnos que han realizado al menos una actividad. Total: ${overallStats.activeStudents}`)

  const handleReadInstructions = () => {
    speak(
      `Analiticas del curso. El promedio de respuestas correctas es ${overallStats.averageCorrect} por ciento. Hay ${overallStats.totalAttempts} intentos totales. El tiempo promedio es ${overallStats.averageTime}. Tienes ${overallStats.activeStudents} estudiantes activos.`
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              className="h-12 w-12 p-0"
              aria-label="Regresar al panel principal"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analiticas</h1>
              <p className="text-sm text-muted-foreground">Rendimiento de estudiantes</p>
            </div>
          </div>
          {settings.voiceEnabled && (
            <Button variant="outline" size="lg" onClick={handleReadInstructions} className="h-12">
              <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
              Escuchar
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Overview Stats */}
        <section aria-label="Estadísticas generales del curso" className="mb-8">
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0">
            <li>
              <Card className="border-2 shadow-lg h-full" {...hoverCorrect}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center" aria-hidden="true">
                    <CheckCircle className="w-7 h-7 text-success" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{overallStats.averageCorrect}%</p>
                    <p className="text-sm text-muted-foreground">Respuestas Correctas</p>
                  </div>
                </CardContent>
              </Card>
            </li>
            <li>
              <Card className="border-2 shadow-lg h-full" {...hoverIntentos}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center" aria-hidden="true">
                    <Target className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{overallStats.totalAttempts}</p>
                    <p className="text-sm text-muted-foreground">Total Intentos</p>
                  </div>
                </CardContent>
              </Card>
            </li>
            <li>
              <Card className="border-2 shadow-lg h-full" {...hoverTiempo}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center" aria-hidden="true">
                    <Clock className="w-7 h-7 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{overallStats.averageTime}</p>
                    <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
                  </div>
                </CardContent>
              </Card>
            </li>
            <li>
              <Card className="border-2 shadow-lg h-full" {...hoverActivos}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-chart-4/20 rounded-2xl flex items-center justify-center" aria-hidden="true">
                    <Users className="w-7 h-7 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{overallStats.activeStudents}</p>
                    <p className="text-sm text-muted-foreground">Estudiantes Activos</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          </ul>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance by Lesson */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-primary" aria-hidden="true" />
                Rendimiento por Leccion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="lesson" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "2px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="correctas" name="Correctas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="incorrectas" name="Incorrectas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Progress Over Time */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-primary" aria-hidden="true" />
                Progreso Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "2px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="progreso"
                      name="Progreso %"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activity Type Distribution */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Tipos de Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activityTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {activityTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "2px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {activityTypeData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Student Performance Table */}
          <Card className="border-2 shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl">Desempeño Individual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estudiante</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Correctas</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Intentos</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tiempo Prom.</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Progreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentPerformance.map((student) => (
                      <tr key={student.name} className="border-b border-border hover:bg-muted/50">
                        <td className="py-4 px-4 font-medium text-foreground">{student.name}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`font-semibold ${
                              student.correctas >= 80
                                ? "text-success"
                                : student.correctas >= 60
                                ? "text-accent-foreground"
                                : "text-destructive"
                            }`}
                          >
                            {student.correctas}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">{student.intentos}</td>
                        <td className="py-4 px-4 text-muted-foreground">{student.tiempo}</td>
                        <td className="py-4 px-4 w-32">
                          <Progress value={student.correctas} className="h-2" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
