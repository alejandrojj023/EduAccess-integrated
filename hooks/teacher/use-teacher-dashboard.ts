import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// Hook: useTeacherDashboard
// ============================================================
// Stats: supabase cliente (grupo, alumno_grupo, curso, progresion_alumno)
// Actividad reciente: API /api/teacher/recent-activity con supabaseAdmin
//   → necesario para saltar RLS de intento_leccion (solo el alumno puede leer sus filas)
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
  const isFirstLoad = useRef(true)

  const refetch = () => setTick(t => t + 1)

  // Auto-refresh cada 60 s en segundo plano
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Realtime: cuando un alumno completa lección o actividad → refetch con debounce
  useEffect(() => {
    if (!user) return
    let timeout: ReturnType<typeof setTimeout>
    const trigger = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => setTick(t => t + 1), 1500)
    }
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "intento_leccion" }, trigger)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "intento_actividad" }, trigger)
      .subscribe()
    return () => { clearTimeout(timeout); supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      if (isFirstLoad.current) setLoading(true)

      // --- STATS (cliente, respeta RLS del docente) ---

      // 1. Grupos del docente
      const { data: grupos } = await supabase
        .from("grupo")
        .select("id_grupo")
        .eq("id_docente", user.id)

      const grupoIds = grupos?.map(g => g.id_grupo) ?? []

      if (grupoIds.length === 0) {
        setRecentActivity([])
        isFirstLoad.current = false
        setLoading(false)
        return
      }

      // 2. Alumnos y cursos en paralelo
      const [alumnosResult, cursosResult] = await Promise.all([
        supabase.from("alumno_grupo").select("id_alumno").in("id_grupo", grupoIds),
        supabase.from("curso").select("id_curso").in("id_grupo", grupoIds),
      ])

      const alumnosUnicos = new Set(alumnosResult.data?.map(a => a.id_alumno) ?? [])
      const totalCursos = cursosResult.data?.length ?? 0

      // 3. Progresión general
      const alumnosArray = Array.from(alumnosUnicos)
      const { data: progresiones } = alumnosArray.length > 0
        ? await supabase.from("progresion_alumno").select("pct_completado").in("id_alumno", alumnosArray)
        : { data: [] as { pct_completado: number }[] }

      const promedio = progresiones && progresiones.length > 0
        ? Math.round(progresiones.reduce((acc, p) => acc + p.pct_completado, 0) / progresiones.length)
        : 0

      setStats({
        estudiantes: alumnosUnicos.size,
        cursos: totalCursos,
        progresoGeneral: `${promedio}%`,
      })

      // --- ACTIVIDAD RECIENTE (API route con supabaseAdmin, bypasea RLS) ---
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) throw new Error("Sin sesión")

        const res = await fetch("/api/teacher/recent-activity", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })

        if (res.ok) {
          const json = await res.json()
          setRecentActivity(json.activity ?? [])
        }
      } catch (err) {
        console.error("[useTeacherDashboard] actividad reciente:", err)
      }

      isFirstLoad.current = false
      setLoading(false)
    }

    fetchData()
  }, [user, tick])

  return { stats, recentActivity, loading, refetch }
}
