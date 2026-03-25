import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// Tipos exportados
// ============================================================

export interface AnalyticsFilters {
  grupoId:    string | null
  cursoId:    string | null
  alumnoId:   string | null
  fechaDesde: string | null
  fechaHasta: string | null
}

export interface PerformanceData {
  lesson:           string   // truncado para el eje X
  lessonFull:       string   // nombre completo (para ordenar)
  correctas:        number   // avg puntaje %
  incorrectas:      number
  total_intentos:   number
  promedio_puntaje: number
}

export interface ProgressData {
  week:      string   // "Sem N"
  weekStart: string   // ISO date inicio de semana (para agrupar por mes)
  progreso:  number   // avg puntaje %
  puntaje:   number
  intentos:  number
}

export interface ActivityTypeData {
  name:  string   // etiqueta legible
  tipo:  string   // valor crudo DB (para filtrar checkboxes)
  value: number
  color: string
}

export interface StudentPerformance {
  id:            string
  name:          string
  correctas:     number
  intentos:      number
  tiempo:        string
  tiempoSeconds: number
}

export interface OverallStats {
  averageCorrect: number
  totalAttempts:  number
  averageTime:    string
  activeStudents: number
}

export interface UseAnalyticsReturn {
  performanceData:    PerformanceData[]
  progressData:       ProgressData[]
  activityTypeData:   ActivityTypeData[]
  studentPerformance: StudentPerformance[]
  overallStats:       OverallStats
  loading:            boolean
}

// ============================================================
// Mapas de colores y etiquetas
// ============================================================

const tipoColores: Record<string, string> = {
  identificacion:         "#0d9488",
  reconocimiento_sonidos: "#f59e0b",
  seleccion_guiada:       "#22c55e",
  secuenciacion:          "#8b5cf6",
  respuesta_oral:         "#ec4899",
  respuesta_corta:        "#3b82f6",
  completar_oracion:      "#f97316",
  asociacion:             "#6366f1",
}

const tipoLabels: Record<string, string> = {
  identificacion:         "Imagenes",
  reconocimiento_sonidos: "Sonidos",
  seleccion_guiada:       "Opcion Multiple",
  secuenciacion:          "Secuencias",
  respuesta_oral:         "Voz",
  respuesta_corta:        "Respuesta Corta",
  completar_oracion:      "Completar oración",
  asociacion:             "Asociacion",
}

// ============================================================
// Hook
// ============================================================

export function useAnalytics(filters: AnalyticsFilters): UseAnalyticsReturn {
  const { user } = useAuth()

  const [performanceData,    setPerformanceData]    = useState<PerformanceData[]>([])
  const [progressData,       setProgressData]       = useState<ProgressData[]>([])
  const [activityTypeData,   setActivityTypeData]   = useState<ActivityTypeData[]>([])
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([])
  const [overallStats,       setOverallStats]       = useState<OverallStats>({
    averageCorrect: 0, totalAttempts: 0, averageTime: "0 min", activeStudents: 0,
  })
  const [loading, setLoading] = useState(true)
  const [tick,    setTick]    = useState(0)

  // Re-fetch cuando cambian filtros o llega un nuevo intento en tiempo real
  useEffect(() => {
    if (!user) return
    fetchAnalytics()
  }, [user, tick, filters.grupoId, filters.cursoId, filters.alumnoId, filters.fechaDesde, filters.fechaHasta])

  // Suscripción en tiempo real a intento_actividad
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel("analytics-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "intento_actividad" }, () => {
        setTick((t) => t + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  async function fetchAnalytics() {
    setLoading(true)

    // 1. Grupos del docente (filtrado si hay grupoId seleccionado)
    let grupoQuery = supabase.from("grupo").select("id_grupo").eq("id_docente", user!.id)
    if (filters.grupoId) grupoQuery = grupoQuery.eq("id_grupo", filters.grupoId)
    const { data: grupos } = await grupoQuery
    const grupoIds = grupos?.map((g) => g.id_grupo) ?? []
    if (grupoIds.length === 0) {
      setLoading(false)
      return
    }

    // 2. Alumnos del docente (filtrado si hay alumnoId seleccionado)
    const { data: inscripciones } = await supabase
      .from("alumno_grupo")
      .select("id_alumno")
      .in("id_grupo", grupoIds)
    let alumnoIds = [...new Set(inscripciones?.map((i) => i.id_alumno) ?? [])]
    if (filters.alumnoId) alumnoIds = alumnoIds.filter((id) => id === filters.alumnoId)
    if (alumnoIds.length === 0) {
      setLoading(false)
      return
    }

    // 3. Cursos del docente + lecciones publicadas totales (denominador correcto de progreso)
    const { data: cursosData } = await supabase
      .from("curso")
      .select("id_curso")
      .in("id_grupo", grupoIds)
    const cursoIdsList = cursosData?.map((c) => c.id_curso) ?? []

    let leccionIdsForCurso: string[] | null = null
    if (filters.cursoId) {
      const { data: lecciones } = await supabase
        .from("leccion")
        .select("id_leccion")
        .eq("id_curso", filters.cursoId)
        .eq("publicado", true)
      leccionIdsForCurso = lecciones?.map((l) => l.id_leccion) ?? []
    }

    // Total de lecciones publicadas (incluyendo las no iniciadas por el alumno)
    let totalLecQuery = supabase
      .from("leccion")
      .select("id_leccion")
      .eq("publicado", true)
    if (filters.cursoId) {
      totalLecQuery = totalLecQuery.eq("id_curso", filters.cursoId)
    } else if (cursoIdsList.length > 0) {
      totalLecQuery = totalLecQuery.in("id_curso", cursoIdsList)
    }
    const { data: todasLecciones } = await totalLecQuery
    const totalLeccionesPublicadas = todasLecciones?.length ?? 0

    // 4. Intentos con filtros (fecha, alumno) + join a actividad→leccion para rendimiento por lección
    let intentosQuery = supabase
      .from("intento_actividad")
      .select("id_alumno, puntaje_total, tiempo_total_segundos, fecha_creacion, actividad:id_actividad(id_leccion, leccion(titulo))")
      .in("id_grupo", grupoIds)
    if (filters.alumnoId)   intentosQuery = intentosQuery.eq("id_alumno", filters.alumnoId)
    if (filters.fechaDesde) intentosQuery = intentosQuery.gte("fecha_creacion", filters.fechaDesde)
    if (filters.fechaHasta) intentosQuery = intentosQuery.lte("fecha_creacion", filters.fechaHasta)
    const { data: intentos } = await intentosQuery

    // Rendimiento por lección desde intento_actividad (misma fuente que los KPIs)
    const leccionMap = new Map<string, { titulo: string; puntajes: number[]; total: number }>()
    intentos?.forEach((i: any) => {
      const leccionId = i.actividad?.id_leccion
      if (!leccionId) return
      if (leccionIdsForCurso && !leccionIdsForCurso.includes(leccionId)) return
      const titulo = i.actividad?.leccion?.titulo ?? "Sin título"
      const prev   = leccionMap.get(leccionId) ?? { titulo, puntajes: [] as number[], total: 0 }
      prev.total++
      if (i.puntaje_total != null) prev.puntajes.push(Number(i.puntaje_total))
      leccionMap.set(leccionId, prev)
    })

    setPerformanceData(
      Array.from(leccionMap.values()).map((data) => {
        const avg = data.puntajes.length > 0
          ? Math.round(data.puntajes.reduce((a, b) => a + b, 0) / data.puntajes.length)
          : 0
        return {
          lesson:           data.titulo.length > 14 ? data.titulo.substring(0, 14) + "…" : data.titulo,
          lessonFull:       data.titulo,
          correctas:        avg,
          incorrectas:      100 - avg,
          total_intentos:   data.total,
          promedio_puntaje: avg,
        }
      })
    )

    // 5. intentos ya está cargado arriba (reutilizamos la misma variable)

    // Stats generales
    const pts  = intentos?.filter((i: any) => i.puntaje_total != null).map((i: any) => i.puntaje_total) ?? []
    const segs = intentos?.filter((i: any) => i.tiempo_total_segundos != null).map((i: any) => i.tiempo_total_segundos) ?? []
    const avgCorrect = pts.length  > 0 ? Math.round(pts.reduce((a: number, b: number) => a + b, 0) / pts.length) : 0
    const avgSecs    = segs.length > 0 ? segs.reduce((a: number, b: number) => a + b, 0) / segs.length : 0

    setOverallStats({
      averageCorrect: avgCorrect,
      totalAttempts:  intentos?.length ?? 0,
      averageTime:    `${(avgSecs / 60).toFixed(1)} min`,
      activeStudents: alumnoIds.length,
    })

    // 6. Progreso DIARIO — el componente re-agrupa por semana o mes según config
    const dayMap = new Map<string, { pts: number[]; count: number }>()
    // Primera fecha de intento por lección (para calcular progreso acumulado real)
    const leccionPrimeraFecha = new Map<string, string>()
    intentos?.forEach((i: any) => {
      const fecha     = new Date(i.fecha_creacion)
      const dateISO   = fecha.toISOString().slice(0, 10)
      const leccionId = i.actividad?.id_leccion
      const prev      = dayMap.get(dateISO) ?? { pts: [] as number[], count: 0 }
      prev.count++
      if (i.puntaje_total != null) prev.pts.push(i.puntaje_total)
      dayMap.set(dateISO, prev)
      // Registrar la fecha más antigua de primer intento por lección
      if (leccionId) {
        const existing = leccionPrimeraFecha.get(leccionId)
        if (!existing || dateISO < existing) leccionPrimeraFecha.set(leccionId, dateISO)
      }
    })

    const sortedDays = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b))
    setProgressData(
      sortedDays.map(([dateISO, data]) => {
        const avg = data.pts.length > 0
          ? Math.round(data.pts.reduce((a, b) => a + b, 0) / data.pts.length)
          : 0
        // Progreso real: lecciones iniciadas hasta esta fecha / total lecciones publicadas
        const leccionesIniciadas = Array.from(leccionPrimeraFecha.values())
          .filter((d) => d <= dateISO).length
        const progreso = totalLeccionesPublicadas > 0
          ? Math.round((leccionesIniciadas / totalLeccionesPublicadas) * 100)
          : avg
        const d = new Date(dateISO + "T12:00:00")
        return {
          week:      d.toLocaleString("es", { day: "2-digit", month: "short" }),
          weekStart: dateISO,
          progreso,
          puntaje:   avg,
          intentos:  data.count,
        }
      })
    )

    // 7. Tipos de actividad
    const { data: actividades } = await supabase
      .from("actividad")
      .select("tipo, leccion:id_leccion ( curso:id_curso ( id_grupo ) )")

    const tipoCount = new Map<string, number>()
    actividades?.forEach((a: any) => {
      const gId = a.leccion?.curso?.id_grupo
      if (grupoIds.includes(gId)) {
        tipoCount.set(a.tipo, (tipoCount.get(a.tipo) ?? 0) + 1)
      }
    })

    setActivityTypeData(
      Array.from(tipoCount.entries()).map(([tipo, count]) => ({
        name:  tipoLabels[tipo] ?? tipo,
        tipo,
        value: count,
        color: tipoColores[tipo] ?? "#94a3b8",
      }))
    )

    // 8. Desempeño individual por alumno
    const studentPerfData: StudentPerformance[] = await Promise.all(
      alumnoIds.map(async (alumnoId) => {
        const { data: perfil } = await supabase
          .from("perfil").select("nombre").eq("id_perfil", alumnoId).single()

        const ai   = intentos?.filter((i: any) => i.id_alumno === alumnoId) ?? []
        const aPts = ai.filter((i: any) => i.puntaje_total != null).map((i: any) => i.puntaje_total)
        const aSeg = ai.filter((i: any) => i.tiempo_total_segundos != null).map((i: any) => i.tiempo_total_segundos)

        const avgP = aPts.length > 0 ? Math.round(aPts.reduce((a: number, b: number) => a + b, 0) / aPts.length) : 0
        const avgS = aSeg.length > 0 ? aSeg.reduce((a: number, b: number) => a + b, 0) / aSeg.length : 0

        const nombre = perfil?.nombre ?? "Alumno"
        const partes = nombre.split(" ")
        const nombreCorto = partes.length > 1 ? `${partes[0]} ${partes[1].charAt(0)}.` : nombre

        return {
          id:            alumnoId,
          name:          nombreCorto,
          correctas:     avgP,
          intentos:      ai.length,
          tiempo:        `${(avgS / 60).toFixed(1)} min`,
          tiempoSeconds: avgS,
        }
      })
    )

    setStudentPerformance(studentPerfData)
    setLoading(false)
  }

  return { performanceData, progressData, activityTypeData, studentPerformance, overallStats, loading }
}
