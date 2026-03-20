"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useAccessibility } from "@/lib/accessibility-context"
import { useStudents } from "@/hooks/teacher/use-students"
import { useSpeakOnHover } from "@/components/ui/accessible-tooltip"
import {
  ArrowLeft,
  Volume2,
  Search,
  User,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react"

interface StudentsListProps {
  onNavigate: (screen: string) => void
  onBack: () => void
}

export function StudentsList({ onNavigate, onBack }: StudentsListProps) {
  const { students, loading } = useStudents()
  const [searchQuery, setSearchQuery] = useState("")
  const { speak, settings } = useAccessibility()

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const studentsNeedingSupport = students.filter((s) => s.needsSupport).length
  const averageProgress = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length)
    : 0

  const hoverTotal    = useSpeakOnHover(`Total de estudiantes inscritos en tus cursos: ${students.length}`)
  const hoverPromedio = useSpeakOnHover(`Progreso promedio: porcentaje de avance de todos tus alumnos. Actualmente ${averageProgress}%`)
  const hoverApoyo    = useSpeakOnHover(`Estudiantes que necesitan apoyo adicional: ${studentsNeedingSupport}`)

  const handleReadInstructions = () => {
    speak(
      `Lista de estudiantes. Tienes ${students.length} estudiantes. El progreso promedio es ${averageProgress} por ciento. ${studentsNeedingSupport} estudiantes necesitan apoyo adicional.`
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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
              <h1 className="text-2xl font-bold text-foreground">Mis Estudiantes</h1>
              <p className="text-sm text-muted-foreground">{students.length} estudiantes</p>
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

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <section aria-label="Resumen de estudiantes" className="mb-8">
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-6 list-none p-0">
            <li>
              <Card className="border-2 shadow-lg h-full" {...hoverTotal}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center" aria-hidden="true">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{students.length}</p>
                    <p className="text-muted-foreground">Total Estudiantes</p>
                  </div>
                </CardContent>
              </Card>
            </li>
            <li>
              <Card className="border-2 shadow-lg h-full" {...hoverPromedio}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center" aria-hidden="true">
                    <TrendingUp className="w-7 h-7 text-success" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{averageProgress}%</p>
                    <p className="text-muted-foreground">Progreso Promedio</p>
                  </div>
                </CardContent>
              </Card>
            </li>
            <li>
              <Card className="border-2 shadow-lg border-accent h-full" {...hoverApoyo}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center" aria-hidden="true">
                    <AlertCircle className="w-7 h-7 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{studentsNeedingSupport}</p>
                    <p className="text-muted-foreground">Necesitan Apoyo</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          </ul>
        </section>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Buscar estudiante por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 text-lg pl-14 border-2"
            aria-label="Buscar estudiante"
          />
        </div>

        {/* Students List */}
        <section aria-label="Lista de estudiantes">
          <ul className="grid gap-4 list-none p-0">
            {filteredStudents.map((student) => (
              <li key={student.id}>
              <article aria-label={`${student.name}${student.needsSupport ? ", necesita apoyo" : ""}, progreso ${student.progress}%`}>
              <Card
                className={`border-2 shadow-lg transition-all hover:border-primary/50 ${
                  student.needsSupport ? "border-accent/50 bg-accent/5" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-primary-foreground ${
                          student.needsSupport ? "bg-accent" : "bg-primary"
                        }`}
                        aria-hidden="true"
                      >
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-foreground">{student.name}</h3>
                          {student.needsSupport && (
                            <span className="inline-flex items-center gap-1 text-sm bg-accent/20 text-accent-foreground px-3 py-1 rounded-full font-medium">
                              <AlertCircle className="w-4 h-4" aria-hidden="true" />
                              Necesita apoyo
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground">{student.email}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" aria-hidden="true" />
                            <time>{student.lastActive}</time>
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" aria-hidden="true" />
                            {student.completedActivities}/{student.totalActivities} actividades
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="w-40" aria-label={`Progreso: ${student.progress}%`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">Progreso</span>
                          <span
                            className={`text-lg font-bold ${
                              student.progress >= 70
                                ? "text-success"
                                : student.progress >= 40
                                ? "text-accent-foreground"
                                : "text-destructive"
                            }`}
                            aria-hidden="true"
                          >
                            {student.progress}%
                          </span>
                        </div>
                        <Progress value={student.progress} className="h-3" />
                      </div>

                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 px-6 border-2"
                        onClick={() => onNavigate(`student-report-${student.id}`)}
                        aria-label={`Ver reporte de ${student.name}`}
                      >
                        <Eye className="w-5 h-5 mr-2" aria-hidden="true" />
                        Ver Reporte
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </article>
              </li>
            ))}
          </ul>
        </section>

        {filteredStudents.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
              <h3 className="text-2xl font-bold text-foreground mb-2">No se encontraron estudiantes</h3>
              <p className="text-lg text-muted-foreground">
                Intenta con otro termino de busqueda
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
