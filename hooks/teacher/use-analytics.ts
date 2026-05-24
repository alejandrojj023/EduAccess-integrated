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
  lesson:              string
  lessonFull:          string
  correctas:           number
  incorrectas:         number
  total_intentos:      number   // intentos de lección
  total_intentos_act:  number   // intentos de actividad
  promedio_puntaje:    number
}

export interface ProgressData {
  week:            string
  weekStart:       string
  progreso:        number
  puntaje:         number
  intentos:        number   // intentos de actividad
  intentosLeccion: number   // intentos de lección
}

export interface ActivityTypeData {
  name:  string   // etiqueta legible
  tipo:  string   // valor crudo DB (para filtrar checkboxes)
  value: number
  color: string
}

export interface StudentPerformance {
  id:                  string
  name:                string
  correctas:           number
  intentos:            number
  tiempo:              string
  tiempoSeconds:       number
  progreso:            number   // % lecciones completadas del total
  leccionesCompletadas: number  // lecciones únicas completadas
  nivel:               number
  estrellas:           number
  racha:               number
  colorPerfil:         string | null
  nivelNombre:         string
  nivelIcon:           string
}

export interface OverallStats {
  averageCorrect: number
  totalAttempts:  number
  averageTime:    string
  activeStudents: number
}

export interface GrupoStudent {
  id:          string
  name:        string
  nivel:       number
  estrellas:   number
  racha:       number
  colorPerfil: string | null
  nivelNombre: string
  nivelIcon:   string
}

export interface UseAnalyticsReturn {
  performanceData:    PerformanceData[]
  progressData:       ProgressData[]
  activityTypeData:   ActivityTypeData[]
  studentPerformance: StudentPerformance[]
  grupoStudents:      GrupoStudent[]
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
  const [grupoStudents,      setGrupoStudents]      = useState<GrupoStudent[]>([])
  const [overallStats,       setOverallStats]       = useState<OverallStats>({
    averageCorrect: 0, totalAttempts: 0, averageTime: "0 s", activeStudents: 0,
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

    // 2. Alumnos del docente — allGrupoAlumnoIds ignora filtro de alumno individual
    const { data: inscripciones } = await supabase
      .from("alumno_grupo")
      .select("id_alumno")
      .in("id_grupo", grupoIds)
    const allGrupoAlumnoIds = [...new Set(inscripciones?.map((i) => i.id_alumno) ?? [])]
    let alumnoIds = [...allGrupoAlumnoIds]
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
    // Alumnos inscritos en el curso seleccionado (para Top/Dist. Niveles)
    let cursoAlumnoIds: string[] | null = null
    if (filters.cursoId) {
      const [leccionesResult, alumnoCursoResult] = await Promise.all([
        supabase.from("leccion").select("id_leccion").eq("id_curso", filters.cursoId).eq("publicado", true),
        supabase.from("alumno_curso").select("id_alumno").eq("id_curso", filters.cursoId),
      ])
      leccionIdsForCurso = leccionesResult.data?.map((l) => l.id_leccion) ?? []
      // Intersectar con allGrupoAlumnoIds para garantizar que pertenecen al grupo del docente
      const inscritosEnCurso = new Set(alumnoCursoResult.data?.map((a) => a.id_alumno) ?? [])
      cursoAlumnoIds = allGrupoAlumnoIds.filter((id) => inscritosEnCurso.has(id))
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
    const { data: intentosRaw } = await intentosQuery

    // Si hay filtro de curso, restringir intentos solo a lecciones de ese curso
    const intentos = leccionIdsForCurso
      ? intentosRaw?.filter((i: any) => {
          const leccionId = i.actividad?.id_leccion
          return leccionId && leccionIdsForCurso!.includes(leccionId)
        }) ?? []
      : intentosRaw ?? []

    // 5. Intentos de lección — RLS permite acceso a docentes vía política "docente_lee_intentos_leccion"
    let intentosLeccionQuery = supabase
      .from("intento_leccion")
      .select("id_alumno, id_leccion, duracion_segundos, fecha_completado")
      .in("id_alumno", alumnoIds)
    if (leccionIdsForCurso) intentosLeccionQuery = intentosLeccionQuery.in("id_leccion", leccionIdsForCurso)
    if (filters.fechaDesde) intentosLeccionQuery = intentosLeccionQuery.gte("fecha_completado", filters.fechaDesde)
    if (filters.fechaHasta) intentosLeccionQuery = intentosLeccionQuery.lte("fecha_completado", filters.fechaHasta)
    const { data: intentosLeccionRaw } = await intentosLeccionQuery

    const intentosLeccion: any[] = intentosLeccionRaw ?? []

    // Stats por alumno desde intentos de lección
    const porAlumnoLeccion: Record<string, { count: number; avgSecs: number }> = {}
    for (const alumnoId of alumnoIds) {
      const rows = intentosLeccion.filter((il: any) => il.id_alumno === alumnoId)
      const segs = rows.filter((il: any) => il.duracion_segundos != null).map((il: any) => il.duracion_segundos as number)
      porAlumnoLeccion[alumnoId] = {
        count:   rows.length,
        avgSecs: segs.length > 0 ? segs.reduce((a, b) => a + b, 0) / segs.length : 0,
      }
    }

    // Conteo de intentos de lección por id_leccion (para gráfica de rendimiento)
    const leccionAttemptCount = new Map<string, number>()
    intentosLeccion.forEach((il: any) => {
      leccionAttemptCount.set(il.id_leccion, (leccionAttemptCount.get(il.id_leccion) ?? 0) + 1)
    })

    // Helper de formato de tiempo
    const formatSecs = (s: number) => s <= 0 ? "0 s"
      : s < 60 ? `${Math.round(s)} s`
      : `${Math.floor(s / 60)} min${Math.round(s % 60) > 0 ? ` ${Math.round(s % 60)} s` : ""}`

    // Rendimiento por lección desde intento_actividad (puntajes) + intento_leccion (conteo sesiones)
    const leccionMap = new Map<string, { titulo: string; puntajes: number[]; leccionId: string; totalAct: number }>()
    intentos?.forEach((i: any) => {
      const leccionId = i.actividad?.id_leccion
      if (!leccionId) return
      const titulo = i.actividad?.leccion?.titulo ?? "Sin título"
      const prev   = leccionMap.get(leccionId) ?? { titulo, puntajes: [] as number[], leccionId, totalAct: 0 }
      prev.totalAct++
      if (i.puntaje_total != null) prev.puntajes.push(Number(i.puntaje_total))
      leccionMap.set(leccionId, prev)
    })

    setPerformanceData(
      Array.from(leccionMap.entries()).map(([leccionId, data]) => {
        const avg = data.puntajes.length > 0
          ? Math.round(data.puntajes.reduce((a, b) => a + b, 0) / data.puntajes.length)
          : 0
        return {
          lesson:             data.titulo.length > 14 ? data.titulo.substring(0, 14) + "…" : data.titulo,
          lessonFull:         data.titulo,
          correctas:          avg,
          incorrectas:        100 - avg,
          total_intentos:     leccionAttemptCount.get(leccionId) ?? 0,
          total_intentos_act: data.totalAct,
          promedio_puntaje:   avg,
        }
      })
    )

    // Stats generales — correctas desde actividades, tiempo y total desde lecciones
    const pts  = intentos?.flatMap((i: any) => i.puntaje_total != null ? [i.puntaje_total] : []) ?? []
    const avgCorrect = pts.length > 0 ? Math.round(pts.reduce((a: number, b: number) => a + b, 0) / pts.length) : 0

    const segLeccion = intentosLeccion.flatMap((il: any) => il.duracion_segundos != null ? [il.duracion_segundos] : [])
    const avgSecsLeccion = segLeccion.length > 0 ? segLeccion.reduce((a: number, b: number) => a + b, 0) / segLeccion.length : 0

    setOverallStats({
      averageCorrect: avgCorrect,
      totalAttempts:  intentosLeccion.length,
      averageTime:    formatSecs(avgSecsLeccion),
      activeStudents: alumnoIds.length,
    })

    // 6. Progreso DIARIO — el componente re-agrupa por semana o mes según config
    const dayMap = new Map<string, { pts: number[]; count: number; leccionCount: number }>()
    const leccionPrimeraFecha = new Map<string, string>()
    intentos?.forEach((i: any) => {
      const fecha     = new Date(i.fecha_creacion)
      const dateISO   = fechaTijuana(fecha)
      const leccionId = i.actividad?.id_leccion
      const prev      = dayMap.get(dateISO) ?? { pts: [] as number[], count: 0, leccionCount: 0 }
      prev.count++
      if (i.puntaje_total != null) prev.pts.push(i.puntaje_total)
      dayMap.set(dateISO, prev)
      if (leccionId) {
        const existing = leccionPrimeraFecha.get(leccionId)
        if (!existing || dateISO < existing) leccionPrimeraFecha.set(leccionId, dateISO)
      }
    })

    // Contar intentos de lección por día usando fecha_completado
    intentosLeccion.forEach((il: any) => {
      if (!il.fecha_completado) return
      const dateISO = fechaTijuana(new Date(il.fecha_completado))
      const prev    = dayMap.get(dateISO) ?? { pts: [] as number[], count: 0, leccionCount: 0 }
      prev.leccionCount++
      dayMap.set(dateISO, prev)
    })

    const sortedDays = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b))
    setProgressData(
      sortedDays.map(([dateISO, data]) => {
        const avg = data.pts.length > 0
          ? Math.round(data.pts.reduce((a, b) => a + b, 0) / data.pts.length)
          : 0
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
          intentosLeccion: data.leccionCount,
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

    // 8. Batch fetch perfil + gamificacion para TODOS los alumnos del grupo
    //    (usa allGrupoAlumnoIds — ignora filtros de curso/alumno/fecha)
    const [perfilesResult, gamiResult] = await Promise.all([
      supabase.from("perfil").select("id_perfil, nombre, color_perfil").in("id_perfil", allGrupoAlumnoIds),
      supabase.from("gamificacion").select("id_alumno, nivel, estrellas_totales, streaks_dias").in("id_alumno", allGrupoAlumnoIds),
    ])

    const perfilMap = new Map<string, { nombre: string; colorPerfil: string | null }>()
    perfilesResult.data?.forEach((p: any) => {
      perfilMap.set(p.id_perfil, { nombre: p.nombre ?? "Alumno", colorPerfil: p.color_perfil ?? null })
    })

    const gamiMap = new Map<string, { nivel: number; estrellas: number; racha: number }>()
    gamiResult.data?.forEach((g: any) => {
      gamiMap.set(g.id_alumno, { nivel: g.nivel ?? 1, estrellas: g.estrellas_totales ?? 0, racha: g.streaks_dias ?? 0 })
    })

    // grupoStudents — alumnos del grupo (o curso si hay filtro de curso) con perfil actual
    // Responde a: grupo ✓ | curso ✓ | alumno individual ✗ | fecha ✗
    const grupoStudentIds = cursoAlumnoIds ?? allGrupoAlumnoIds
    setGrupoStudents(
      grupoStudentIds.map((id) => {
        const perfil    = perfilMap.get(id) ?? { nombre: "Alumno", colorPerfil: null }
        const gami      = gamiMap.get(id) ?? { nivel: 1, estrellas: 0, racha: 0 }
        const nivelInfo = NIVELES[gami.nivel] ?? NIVELES[1]
        const partes    = perfil.nombre.split(" ")
        return {
          id,
          name:        partes.length > 1 ? `${partes[0]} ${partes[1].charAt(0)}.` : perfil.nombre,
          nivel:       gami.nivel,
          estrellas:   gami.estrellas,
          racha:       gami.racha,
          colorPerfil: perfil.colorPerfil,
          nivelNombre: nivelInfo.nombre,
          nivelIcon:   nivelInfo.icon,
        }
      })
    )

    // Lecciones únicas completadas por alumno
    const leccionesUnicasPorAlumno = new Map<string, Set<string>>()
    intentosLeccion.forEach((il: any) => {
      if (!il.id_alumno || !il.id_leccion) return
      if (!leccionesUnicasPorAlumno.has(il.id_alumno)) leccionesUnicasPorAlumno.set(il.id_alumno, new Set())
      leccionesUnicasPorAlumno.get(il.id_alumno)!.add(il.id_leccion)
    })

    const studentPerfData: StudentPerformance[] = alumnoIds.map((alumnoId) => {
      const perfil  = perfilMap.get(alumnoId) ?? { nombre: "Alumno", colorPerfil: null }
      const nombre  = perfil.nombre
      const partes  = nombre.split(" ")
      const nombreCorto = partes.length > 1 ? `${partes[0]} ${partes[1].charAt(0)}.` : nombre

      const ai   = intentos?.filter((i: any) => i.id_alumno === alumnoId) ?? []
      const aPts = ai.flatMap((i: any) => i.puntaje_total != null ? [i.puntaje_total] : [])
      const avgP    = aPts.length > 0 ? Math.round(aPts.reduce((a: number, b: number) => a + b, 0) / aPts.length) : 0
      const lecData = porAlumnoLeccion[alumnoId] ?? { count: 0, avgSecs: 0 }

      const leccionesCompletadas = leccionesUnicasPorAlumno.get(alumnoId)?.size ?? 0
      const progreso = totalLeccionesPublicadas > 0
        ? Math.min(100, Math.round((leccionesCompletadas / totalLeccionesPublicadas) * 100))
        : 0

      const gami     = gamiMap.get(alumnoId) ?? { nivel: 1, estrellas: 0, racha: 0 }
      const nivelInfo = NIVELES[gami.nivel] ?? NIVELES[1]

      return {
        id:                   alumnoId,
        name:                 nombreCorto,
        correctas:            avgP,
        intentos:             lecData.count,
        tiempo:               formatSecs(lecData.avgSecs),
        tiempoSeconds:        lecData.avgSecs,
        progreso,
        leccionesCompletadas,
        nivel:                gami.nivel,
        estrellas:            gami.estrellas,
        racha:                gami.racha,
        colorPerfil:          perfil.colorPerfil,
        nivelNombre:          nivelInfo.nombre,
        nivelIcon:            nivelInfo.icon,
      }
    })

    setStudentPerformance(studentPerfData)
    setLoading(false)
  }

  return { performanceData, progressData, activityTypeData, studentPerformance, grupoStudents, overallStats, loading }
}
