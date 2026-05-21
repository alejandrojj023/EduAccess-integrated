import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { fechaTijuana, diferenciaDias, NIVELES } from "@/lib/utils"

// ============================================================
// Hook: useStudentDashboard
// ============================================================

interface Course {
  id: string
  name: string
  progress: number
  currentLesson: string
  totalLessons: number
  completedLessons: number
}

interface Gamification {
  totalStars: number
  estrellasTotales: number
  nivelActual: number
  nivelNombre: string
  nivelEmoji: string
  nivelIcon: string
  nivelMin: number
  nivelMax: number
  streakDays: number
  colorPerfil: string | null
}

interface UseStudentDashboardReturn {
  courses: Course[]
  gamification: Gamification
  loading: boolean
}


const DEFAULT_GAMI: Gamification = {
  totalStars: 0, estrellasTotales: 0,
  nivelActual: 1, nivelNombre: NIVELES[1].nombre, nivelEmoji: NIVELES[1].emoji, nivelIcon: NIVELES[1].icon,
  nivelMin: NIVELES[1].min, nivelMax: NIVELES[1].max, streakDays: 0, colorPerfil: null,
}

// Module-level cache — shared across re-mounts (survives fast navigation)
const cache: Record<string, { courses: Course[]; gamification: Gamification; ts: number }> = {}
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

export function useStudentDashboard(): UseStudentDashboardReturn {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [gamification, setGamification] = useState<Gamification>(DEFAULT_GAMI)
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  useEffect(() => {
    if (!user) return

    const key = user.id
    const cached = cache[key]
    const now = Date.now()

    // Serve from cache instantly if fresh
    if (cached && now - cached.ts < CACHE_TTL) {
      setCourses(cached.courses)
      setGamification(cached.gamification)
      setLoading(false)
      return
    }

    // If stale cache exists, show it while revalidating in background
    if (cached) {
      setCourses(cached.courses)
      setGamification(cached.gamification)
      setLoading(false)
      // Revalidate silently
    } else {
      setLoading(true)
    }

    const fetchData = async () => {
      // Level 1 (parallel): gamificación + cursos inscritos
      const [gamiResult, inscripcionesResult, perfilResult] = await Promise.all([
        supabase
          .from("gamificacion")
          .select("puntos_totales, estrellas_totales, nivel, streaks_dias, ultimo_acceso")
          .eq("id_alumno", user.id)
          .single(),
        supabase
          .from("alumno_curso")
          .select("id_curso, curso:id_curso(id_curso, titulo)")
          .eq("id_alumno", user.id),
        supabase
          .from("perfil")
          .select("color_perfil")
          .eq("id_perfil", user.id)
          .single(),
      ])

      if (!isMounted.current) return

      let newGami = DEFAULT_GAMI
      if (gamiResult.data) {
        const nivelActual: number = gamiResult.data.nivel ?? 1
        const nivelInfo = NIVELES[nivelActual] ?? NIVELES[1]

        let rachaVisible = gamiResult.data.streaks_dias ?? 0
        if (gamiResult.data.ultimo_acceso) {
          const diff = diferenciaDias(
            fechaTijuana(gamiResult.data.ultimo_acceso),
            fechaTijuana(new Date())
          )
          if (diff >= 2) rachaVisible = 0
        }

        const colorPerfil = perfilResult.data?.color_perfil ?? null
        if (colorPerfil && typeof window !== "undefined") {
          localStorage.setItem("ea_avatar_color", colorPerfil)
        }

        newGami = {
          totalStars: gamiResult.data.puntos_totales ?? 0,
          estrellasTotales: gamiResult.data.estrellas_totales ?? 0,
          nivelActual,
          nivelNombre: nivelInfo.nombre,
          nivelEmoji: nivelInfo.emoji,
          nivelIcon: nivelInfo.icon,
          nivelMin: nivelInfo.min,
          nivelMax: nivelInfo.max,
          streakDays: rachaVisible,
          colorPerfil,
        }
      }

      const cursosRaw = inscripcionesResult.data
        ?.map((i: any) => i.curso)
        .filter(Boolean) ?? []

      if (cursosRaw.length === 0) {
        const result = { courses: [], gamification: newGami }
        cache[key] = { ...result, ts: Date.now() }
        if (isMounted.current) {
          setGamification(newGami)
          setCourses([])
          setLoading(false)
        }
        return
      }

      const cursoIds = cursosRaw.map((c: any) => c.id_curso)

      // Level 2 & 3: lecciones + progresiones en paralelo
      const [leccionesResult, progresionesAllResult] = await Promise.all([
        supabase
          .from("leccion")
          .select("id_leccion, id_curso, titulo, orden")
          .in("id_curso", cursoIds)
          .eq("publicado", true)
          .order("orden", { ascending: true }),
        supabase
          .from("progresion_alumno")
          .select("id_leccion, pct_completado")
          .eq("id_alumno", user.id),
      ])

      if (!isMounted.current) return

      const todasLecciones = leccionesResult.data ?? []
      const todasProgresiones = progresionesAllResult.data ?? []

      // Group in memory
      const leccByCorso = new Map<string, any[]>()
      for (const l of todasLecciones) {
        if (!leccByCorso.has(l.id_curso)) leccByCorso.set(l.id_curso, [])
        leccByCorso.get(l.id_curso)!.push(l)
      }

      const progByLecc = new Map<string, any>()
      for (const p of todasProgresiones) {
        progByLecc.set(p.id_leccion, p)
      }

      const newCourses: Course[] = cursosRaw.map((c: any) => {
        const lecciones    = leccByCorso.get(c.id_curso) ?? []
        const totalLessons = lecciones.length
        const progresiones = lecciones
          .map((l: any) => progByLecc.get(l.id_leccion))
          .filter(Boolean)

        const completedLessons = progresiones.filter((p: any) => p.pct_completado >= 100).length

        const avgProgress = progresiones.length > 0 && totalLessons > 0
          ? Math.round(progresiones.reduce((acc: number, p: any) => acc + p.pct_completado, 0) / totalLessons)
          : 0

        const completedIds = new Set(
          progresiones.flatMap((p: any) => p.pct_completado >= 100 ? [p.id_leccion] : [])
        )
        const nextLesson = lecciones.find((l: any) => !completedIds.has(l.id_leccion))

        return {
          id: c.id_curso,
          name: c.titulo,
          progress: Math.min(avgProgress, 100),
          currentLesson: nextLesson?.titulo ?? "Completado",
          totalLessons,
          completedLessons,
        }
      })

      cache[key] = { courses: newCourses, gamification: newGami, ts: Date.now() }

      if (isMounted.current) {
        setCourses(newCourses)
        setGamification(newGami)
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  return { courses, gamification, loading }
}

/** Call this to invalidate the cache after a lesson is completed */
export function invalidateStudentDashboardCache(userId: string) {
  delete cache[userId]
}
