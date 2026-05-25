import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { fechaTijuana, NIVELES } from "@/lib/utils"

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
  week:             string   // "Sem N"
  weekStart:        string   // ISO date inicio de semana (para agrupar por mes)
  progreso:         number   // avg puntaje %
  puntaje:          number
  intentos:         number   // intentos de actividad
  intentosLeccion:  number   // sesiones únicas de lección
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
  nivel:         number
  nivelNombre:   string
  nivelIcon:     string
  estrellas:     number
  racha:         number
  colorPerfil:   string
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

const nivelNombres: Record<number, string> = {
  1:  "Semilla Dormida",
  2:  "Semilla Saltarina",
  3:  "Brote Brillante",
  4:  "Trébol de la Suerte",
  5:  "Girasol Sonriente",
  6:  "Cactus Valiente",
  7:  "Árbol Alegre",
  8:  "Flor Guardiana",
  9:  "Gran Roble",
  10: "Bosque Mágico",
}

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
      .select("id_alumno, id_intento_leccion, puntaje_total, tiempo_total_segundos, fecha_creacion, actividad:id_actividad(id_leccion, leccion(titulo))")
      .in("id_grupo", grupoIds)
    if (filters.alumnoId)   intentosQuery = intentosQuery.eq("id_alumno", filters.alumnoId)
    if (filters.fechaDesde) intentosQuery = intentosQuery.gte("fecha_creacion", filters.fechaDesde)
    if (filters.fechaHasta) intentosQuery = intentosQuery.lte("fecha_creacion", filters.fechaHasta)
    const { data: intentosRaw } = await intentosQuery

    // Si hay filtro de curso, restringir intentos solo a lecciones de ese curso
    const intentos = leccionIdsForCurso
      ? intentosRaw?.filter((i: any) => {
          const leccionId = i.actividad?.id_leccion
          return leccionId && leccionIdsForCurso!.includes(leccionId)
        }) ?? []
      : intentosRaw ?? []

    // Rendimiento por lección desde intento_actividad (misma fuente que los KPIs)
    // sessionIds: sesiones únicas de lección por leccionId (para contar intentos a nivel lección)
    const leccionMap = new Map<string, { titulo: string; puntajes: number[]; total: number; sessionIds: Set<string> }>()
    intentos?.forEach((i: any) => {
      const leccionId = i.actividad?.id_leccion
      if (!leccionId) return
      const titulo = i.actividad?.leccion?.titulo ?? "Sin título"
      const prev   = leccionMap.get(leccionId) ?? { titulo, puntajes: [] as number[], total: 0, sessionIds: new Set<string>() }
      prev.total++
      if (i.puntaje_total != null) prev.puntajes.push(Number(i.puntaje_total))
      if (i.id_intento_leccion) prev.sessionIds.add(i.id_intento_leccion)
      leccionMap.set(leccionId, prev)
    })

    setPerformanceData(
      Array.from(leccionMap.values()).map((data) => {
        const avg = data.puntajes.length > 0
          ? Math.round(data.puntajes.reduce((a, b) => a + b, 0) / data.puntajes.length * 10) / 10
          : 0
        // total_intentos = sesiones únicas de lección; fallback a conteo de actividades si no hay FK
        const total_intentos = data.sessionIds.size > 0 ? data.sessionIds.size : data.total
        return {
          lesson:           data.titulo.length > 14 ? data.titulo.substring(0, 14) + "…" : data.titulo,
          lessonFull:       data.titulo,
          correctas:        avg,
          incorrectas:      100 - avg,
          total_intentos,
          promedio_puntaje: avg,
        }
      })
    )

    // 5. Stats generales basadas en sesiones de lección (intento_leccion via id_intento_leccion FK)
    //    totalAttempts = sesiones únicas de lección (no conteo de actividades individuales)
    //    averageTime   = duración promedio por sesión de lección (suma de segundos de actividades por sesión)
    const pts  = intentos?.flatMap((i: any) => i.puntaje_total != null ? [i.puntaje_total] : []) ?? []
    const avgCorrect = pts.length > 0 ? Math.round(pts.reduce((a: number, b: number) => a + b, 0) / pts.length) : 0

    // Agrupar tiempo por sesión de lección para obtener duración real por lección
    const lessonSessionSecs = new Map<string, number>()
    intentos?.forEach((i: any) => {
      if (!i.id_intento_leccion || i.tiempo_total_segundos == null) return
      lessonSessionSecs.set(
        i.id_intento_leccion,
        (lessonSessionSecs.get(i.id_intento_leccion) ?? 0) + i.tiempo_total_segundos,
      )
    })
    const totalLessonAttempts = lessonSessionSecs.size || (intentos?.length ?? 0)
    const lessonDurations = Array.from(lessonSessionSecs.values())
    const avgLessonSecs = lessonDurations.length > 0
      ? lessonDurations.reduce((a, b) => a + b, 0) / lessonDurations.length
      : (() => {
          // Fallback para datos sin id_intento_leccion: promedio de segundos por actividad
          const segs = intentos?.flatMap((i: any) => i.tiempo_total_segundos != null ? [i.tiempo_total_segundos] : []) ?? []
          return segs.length > 0 ? segs.reduce((a: number, b: number) => a + b, 0) / segs.length : 0
        })()

    setOverallStats({
      averageCorrect: avgCorrect,
      totalAttempts:  totalLessonAttempts,
      averageTime:    `${(avgLessonSecs / 60).toFixed(1)} min`,
      activeStudents: alumnoIds.length,
    })

    // 6. Progreso DIARIO — el componente re-agrupa por semana o mes según config
    const dayMap = new Map<string, { pts: number[]; count: number; sessionIds: Set<string> }>()
    // Primera fecha de intento por lección (para calcular progreso acumulado real)
    const leccionPrimeraFecha = new Map<string, string>()
    intentos?.forEach((i: any) => {
      const fecha     = new Date(i.fecha_creacion)
      const dateISO   = fechaTijuana(fecha)
      const leccionId = i.actividad?.id_leccion
      const prev      = dayMap.get(dateISO) ?? { pts: [] as number[], count: 0, sessionIds: new Set<string>() }
      prev.count++
      if (i.puntaje_total != null) prev.pts.push(i.puntaje_total)
      if (i.id_intento_leccion) prev.sessionIds.add(i.id_intento_leccion)
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
          ? Math.round(data.pts.reduce((a, b) => a + b, 0) / data.pts.length * 10) / 10
          : 0
        // Progreso real: lecciones iniciadas hasta esta fecha / total lecciones publicadas
        const leccionesIniciadas = Array.from(leccionPrimeraFecha.values())
          .filter((d) => d <= dateISO).length
        const progreso = totalLeccionesPublicadas > 0
          ? Math.round((leccionesIniciadas / totalLeccionesPublicadas) * 100)
          : avg
        const d = new Date(dateISO + "T12:00:00")
        return {
          week:            d.toLocaleString("es", { day: "2-digit", month: "short" }),
          weekStart:       dateISO,
          progreso,
          puntaje:         avg,
          intentos:        data.count,
          intentosLeccion: data.sessionIds.size,
        }
      })
    )

    // 7. Tipos de actividad — filtrado por las lecciones ya calculadas (respeta filtro de curso/grupo)
    //    todasLecciones ya fue construido con el filtro de cursoId/grupoId correcto.
    const leccionIdsTipos = todasLecciones?.map((l: any) => l.id_leccion) ?? []
    const tipoCount = new Map<string, number>()

    if (leccionIdsTipos.length > 0) {
      const { data: actividades } = await supabase
        .from("actividad")
        .select("tipo")
        .in("id_leccion", leccionIdsTipos)

      actividades?.forEach((a: any) => {
        tipoCount.set(a.tipo, (tipoCount.get(a.tipo) ?? 0) + 1)
      })
    }

    setActivityTypeData(
      Array.from(tipoCount.entries()).map(([tipo, count]) => ({
        name:  tipoLabels[tipo] ?? tipo,
        tipo,
        value: count,
        color: tipoColores[tipo] ?? "#94a3b8",
      }))
    )

    // 8. Desempeño individual por alumno — batch queries (2 queries en paralelo vs N individuales)
    const [perfilesResult, gamiResult] = await Promise.all([
      supabase.from("perfil").select("id_perfil, nombre, color_perfil").in("id_perfil", alumnoIds),
      supabase.from("gamificacion").select("id_alumno, nivel, estrellas_totales, streaks_dias").in("id_alumno", alumnoIds),
    ])

    const perfilMap = new Map((perfilesResult.data ?? []).map((p: any) => [p.id_perfil, { nombre: p.nombre as string, colorPerfil: p.color_perfil as string | null }]))
    const gamiMap   = new Map((gamiResult.data ?? []).map((g: any) => [g.id_alumno, g]))

    const studentPerfData: StudentPerformance[] = alumnoIds.map((alumnoId) => {
      const perfilData  = perfilMap.get(alumnoId)
      const nombreRaw   = perfilData?.nombre ?? "Alumno"
      const partes      = nombreRaw.split(" ")
      const name        = partes.length > 1 ? `${partes[0]} ${partes[1].charAt(0)}.` : nombreRaw
      const colorPerfil = perfilData?.colorPerfil ?? "#6366f1"

      const gami        = gamiMap.get(alumnoId)
      const nivel       = gami?.nivel ?? 1
      const nivelNombre = nivelNombres[nivel] ?? "Semilla Dormida"
      const nivelIcon   = NIVELES[nivel]?.icon ?? NIVELES[1].icon

      const ai   = intentos?.filter((i: any) => i.id_alumno === alumnoId) ?? []
      const aPts = ai.flatMap((i: any) => i.puntaje_total != null ? [i.puntaje_total] : [])
      const avgP = aPts.length > 0 ? Math.round(aPts.reduce((a: number, b: number) => a + b, 0) / aPts.length) : 0

      // Sesiones únicas de lección (consistente con KPI "Intentos de Lecciones")
      const studentSessions = new Map<string, number>()
      ai.forEach((i: any) => {
        if (!i.id_intento_leccion) return
        studentSessions.set(
          i.id_intento_leccion,
          (studentSessions.get(i.id_intento_leccion) ?? 0) + (i.tiempo_total_segundos ?? 0),
        )
      })

      const lessonAttemptCount = studentSessions.size > 0 ? studentSessions.size : ai.length
      const sessionDurations   = Array.from(studentSessions.values())
      const avgSessionSecs     = sessionDurations.length > 0
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
        : (() => {
            const segs = ai.flatMap((i: any) => i.tiempo_total_segundos != null ? [i.tiempo_total_segundos] : [])
            return segs.length > 0 ? segs.reduce((a: number, b: number) => a + b, 0) / segs.length : 0
          })()

      return {
        id:            alumnoId,
        name,
        correctas:     avgP,
        intentos:      lessonAttemptCount,
        tiempo:        `${(avgSessionSecs / 60).toFixed(1)} min`,
        tiempoSeconds: avgSessionSecs,
        nivel,
        nivelNombre,
        nivelIcon,
        estrellas:     gami?.estrellas_totales ?? 0,
        racha:         gami?.streaks_dias ?? 0,
        colorPerfil,
      }
    })

    setStudentPerformance(studentPerfData)
    setLoading(false)
  }

  return { performanceData, progressData, activityTypeData, studentPerformance, overallStats, loading }
}
