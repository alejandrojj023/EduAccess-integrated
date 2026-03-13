import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// Hook: useAnalytics
// ============================================================
// Reemplaza los 4 bloques de datos mock en teacher-analytics.tsx
// Consume: vw_metricas_alumno, intento_actividad, actividad,
//          respuesta, perfil, alumno_grupo, grupo
// ============================================================

interface PerformanceData {
  lesson: string
  correctas: number
  incorrectas: number
}

interface ProgressData {
  week: string
  progreso: number
}

interface ActivityTypeData {
  name: string
  value: number
  color: string
}

interface StudentPerformance {
  name: string
  correctas: number
  intentos: number
  tiempo: string
}

interface OverallStats {
  averageCorrect: number
  totalAttempts: number
  averageTime: string
  activeStudents: number
}

interface UseAnalyticsReturn {
  performanceData: PerformanceData[]
  progressData: ProgressData[]
  activityTypeData: ActivityTypeData[]
  studentPerformance: StudentPerformance[]
  overallStats: OverallStats
  loading: boolean
}

// Colores para el gráfico de tipos de actividad
const tipoColores: Record<string, string> = {
  identificacion: "#0d9488",
  reconocimiento_sonidos: "#f59e0b",
  seleccion_guiada: "#22c55e",
  secuenciacion: "#8b5cf6",
  respuesta_oral: "#ec4899",
  respuesta_corta: "#3b82f6",
  asociacion: "#f97316",
  refuerzo: "#6366f1",
}

const tipoLabels: Record<string, string> = {
  identificacion: "Imagenes",
  reconocimiento_sonidos: "Sonidos",
  seleccion_guiada: "Opcion Multiple",
  secuenciacion: "Secuencias",
  respuesta_oral: "Voz",
  respuesta_corta: "Respuesta Corta",
  asociacion: "Asociacion",
  refuerzo: "Refuerzo",
}

export function useAnalytics(): UseAnalyticsReturn {
  const { user } = useAuth()
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [progressData, setProgressData] = useState<ProgressData[]>([])
  const [activityTypeData, setActivityTypeData] = useState<ActivityTypeData[]>([])
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([])
  const [overallStats, setOverallStats] = useState<OverallStats>({
    averageCorrect: 0,
    totalAttempts: 0,
    averageTime: "0 min",
    activeStudents: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchAnalytics = async () => {
      setLoading(true)

      // 1. Obtener grupos del docente
      const { data: grupos } = await supabase
        .from("grupo")
        .select("id_grupo")
        .eq("id_docente", user.id)

      const grupoIds = grupos?.map((g) => g.id_grupo) ?? []
      if (grupoIds.length === 0) {
        setLoading(false)
        return
      }

      // 2. Alumnos del docente
      const { data: inscripciones } = await supabase
        .from("alumno_grupo")
        .select("id_alumno")
        .in("id_grupo", grupoIds)

      const alumnoIds = [...new Set(inscripciones?.map((i) => i.id_alumno) ?? [])]

      // 3. Métricas desde la vista (rendimiento por lección)
      const { data: metricas } = await supabase
        .from("vw_metricas_alumno")
        .select("*")
        .in("id_alumno", alumnoIds)

      // Rendimiento por lección (agrupar por titulo_leccion)
      const leccionMap = new Map<string, { total: number; puntajes: number[] }>()
      metricas?.forEach((m: any) => {
        const key = m.titulo_leccion ?? "Sin titulo"
        const existing = leccionMap.get(key) ?? { total: 0, puntajes: [] }
        existing.total += m.total_intentos ?? 0
        if (m.promedio_puntaje != null) existing.puntajes.push(Number(m.promedio_puntaje))
        leccionMap.set(key, existing)
      })

      const perfData: PerformanceData[] = Array.from(leccionMap.entries()).map(
        ([lesson, data]) => {
          const avg =
            data.puntajes.length > 0
              ? Math.round(data.puntajes.reduce((a, b) => a + b, 0) / data.puntajes.length)
              : 0
          return {
            lesson: lesson.length > 12 ? lesson.substring(0, 12) + "..." : lesson,
            correctas: avg,
            incorrectas: 100 - avg,
          }
        }
      )
      setPerformanceData(perfData)

      // 4. Todos los intentos de estos grupos
      const { data: intentos } = await supabase
        .from("intento_actividad")
        .select("id_alumno, puntaje_total, tiempo_total_segundos, fecha_creacion")
        .in("id_grupo", grupoIds)

      // Stats generales
      const totalIntentos = intentos?.length ?? 0
      const tiempos = intentos
        ?.filter((i: any) => i.tiempo_total_segundos != null)
        .map((i: any) => i.tiempo_total_segundos) ?? []
      const avgTimeSeconds =
        tiempos.length > 0
          ? tiempos.reduce((a: number, b: number) => a + b, 0) / tiempos.length
          : 0
      const avgTimeMinutes = (avgTimeSeconds / 60).toFixed(1)

      const puntajes = intentos
        ?.filter((i: any) => i.puntaje_total != null)
        .map((i: any) => i.puntaje_total) ?? []
      const avgCorrect =
        puntajes.length > 0
          ? Math.round(puntajes.reduce((a: number, b: number) => a + b, 0) / puntajes.length)
          : 0

      setOverallStats({
        averageCorrect: avgCorrect,
        totalAttempts: totalIntentos,
        averageTime: `${avgTimeMinutes} min`,
        activeStudents: alumnoIds.length,
      })

      // 5. Progreso semanal (agrupar intentos por semana)
      const weekMap = new Map<number, number[]>()
      intentos?.forEach((i: any) => {
        const fecha = new Date(i.fecha_creacion)
        const startOfYear = new Date(fecha.getFullYear(), 0, 1)
        const weekNum = Math.ceil(
          ((fecha.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
        )
        const existing = weekMap.get(weekNum) ?? []
        if (i.puntaje_total != null) existing.push(i.puntaje_total)
        weekMap.set(weekNum, existing)
      })

      const sortedWeeks = Array.from(weekMap.entries())
        .sort(([a], [b]) => a - b)
        .slice(-5)

      setProgressData(
        sortedWeeks.map(([week, puntajes], index) => ({
          week: `Sem ${index + 1}`,
          progreso:
            puntajes.length > 0
              ? Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length)
              : 0,
        }))
      )

      // 6. Tipos de actividad (contar actividades por tipo)
      const { data: actividades } = await supabase
        .from("actividad")
        .select("tipo, leccion:id_leccion ( curso:id_curso ( id_grupo ) )")

      const tipoCount = new Map<string, number>()
      actividades?.forEach((a: any) => {
        const grupoId = a.leccion?.curso?.id_grupo
        if (grupoIds.includes(grupoId)) {
          tipoCount.set(a.tipo, (tipoCount.get(a.tipo) ?? 0) + 1)
        }
      })

      setActivityTypeData(
        Array.from(tipoCount.entries()).map(([tipo, count]) => ({
          name: tipoLabels[tipo] ?? tipo,
          value: count,
          color: tipoColores[tipo] ?? "#94a3b8",
        }))
      )

      // 7. Desempeño individual por alumno
      const studentPerfData: StudentPerformance[] = await Promise.all(
        alumnoIds.slice(0, 10).map(async (alumnoId) => {
          // Nombre
          const { data: perfil } = await supabase
            .from("perfil")
            .select("nombre")
            .eq("id_perfil", alumnoId)
            .single()

          // Intentos del alumno
          const alumnoIntentos = intentos?.filter((i: any) => i.id_alumno === alumnoId) ?? []
          const totalInt = alumnoIntentos.length
          const puntajesAlumno = alumnoIntentos
            .filter((i: any) => i.puntaje_total != null)
            .map((i: any) => i.puntaje_total)
          const avgPuntaje =
            puntajesAlumno.length > 0
              ? Math.round(puntajesAlumno.reduce((a: number, b: number) => a + b, 0) / puntajesAlumno.length)
              : 0

          const tiemposAlumno = alumnoIntentos
            .filter((i: any) => i.tiempo_total_segundos != null)
            .map((i: any) => i.tiempo_total_segundos)
          const avgTiempo =
            tiemposAlumno.length > 0
              ? (tiemposAlumno.reduce((a: number, b: number) => a + b, 0) / tiemposAlumno.length / 60).toFixed(1)
              : "0"

          // Abreviar nombre: "Ana Martinez" → "Ana M."
          const nombre = perfil?.nombre ?? "Alumno"
          const partes = nombre.split(" ")
          const nombreCorto =
            partes.length > 1
              ? `${partes[0]} ${partes[1].charAt(0)}.`
              : nombre

          return {
            name: nombreCorto,
            correctas: avgPuntaje,
            intentos: totalInt,
            tiempo: `${avgTiempo} min`,
          }
        })
      )

      setStudentPerformance(studentPerfData)
      setLoading(false)
    }

    fetchAnalytics()
  }, [user])

  return {
    performanceData,
    progressData,
    activityTypeData,
    studentPerformance,
    overallStats,
    loading,
  }
}
