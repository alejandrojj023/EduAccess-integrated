import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// Hook: useTeacherDashboard
// ============================================================
// Reemplaza los datos mock del teacher-dashboard.tsx
// Consume: perfil, grupo, alumno_grupo, curso, intento_actividad
// ============================================================

interface DashboardStats {
  estudiantes: number
  cursos: number
  progresoGeneral: string
}

interface RecentActivity {
  student: string
  activity: string
  time: string
}

interface UseTeacherDashboardReturn {
  stats: DashboardStats
  recentActivity: RecentActivity[]
  loading: boolean
  refetch: () => void
}

export function useTeacherDashboard(): UseTeacherDashboardReturn {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    estudiantes: 0,
    cursos: 0,
    progresoGeneral: "0%",
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refetch = () => setTick(t => t + 1)

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  // Suscripción en tiempo real: actualiza al instante cuando un alumno completa una actividad
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "intento_actividad" }, () => {
        setTick((t) => t + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
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

      // 2 + 3. Alumnos y cursos en paralelo
      const [alumnosResult, cursosResult] = await Promise.all([
        supabase.from("alumno_grupo").select("id_alumno").in("id_grupo", grupoIds),
        supabase.from("curso").select("id_curso", { count: "exact", head: true }).in("id_grupo", grupoIds),
      ])

      const alumnosUnicos = new Set(alumnosResult.data?.map((a) => a.id_alumno) ?? [])
      const totalCursos = cursosResult.count ?? 0

      // 4 + 5. Progresiones e intentos recientes en paralelo
      const alumnosArray = Array.from(alumnosUnicos)
      const [progresionesResult, intentosResult] = await Promise.all([
        alumnosArray.length > 0
          ? supabase.from("progresion_alumno").select("pct_completado").in("id_alumno", alumnosArray)
          : Promise.resolve({ data: [] as { pct_completado: number }[] }),
        supabase
          .from("intento_actividad")
          .select(`fecha_creacion, perfil:id_alumno ( nombre ), actividad:id_actividad ( titulo, tipo )`)
          .in("id_grupo", grupoIds)
          .order("fecha_creacion", { ascending: false })
          .limit(5),
      ])

      const progresiones = progresionesResult.data ?? []
      const promedio =
        progresiones.length > 0
          ? Math.round(
              progresiones.reduce((acc, p) => acc + p.pct_completado, 0) / progresiones.length
            )
          : 0

      setStats({
        estudiantes: alumnosUnicos.size,
        cursos: totalCursos,
        progresoGeneral: `${promedio}%`,
      })

      const intentos = intentosResult.data

      const actividadReciente: RecentActivity[] = (intentos ?? []).map((i: any) => {
        const nombre = i.perfil?.nombre ?? "Alumno"
        const tipoActividad = i.actividad?.titulo ?? i.actividad?.tipo ?? "actividad"
        const fecha = new Date(i.fecha_creacion)
        const ahora = new Date()
        const diffMin = Math.round((ahora.getTime() - fecha.getTime()) / 60000)

        let time: string
        if (diffMin < 1) time = "Justo ahora"
        else if (diffMin < 60) time = `Hace ${diffMin} min`
        else if (diffMin < 1440) time = `Hace ${Math.round(diffMin / 60)} hora${Math.round(diffMin / 60) > 1 ? "s" : ""}`
        else time = `Hace ${Math.round(diffMin / 1440)} dia${Math.round(diffMin / 1440) > 1 ? "s" : ""}`

        return {
          student: nombre,
          activity: `Completo ${tipoActividad}`,
          time,
        }
      })

      setRecentActivity(actividadReciente)
      setLoading(false)
    }

    fetchData()
  }, [user, tick])

  return { stats, recentActivity, loading, refetch }
}
