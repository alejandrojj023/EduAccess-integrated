import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// Hook: useStudentDashboard
// ============================================================
// Consume: alumno_curso, curso, leccion, progresion_alumno,
//          gamificacion
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
  currentLevel: number
  streakDays: number
}

interface UseStudentDashboardReturn {
  courses: Course[]
  gamification: Gamification
  loading: boolean
}

// Nivel basado en estrellas
function calculateLevel(stars: number): number {
  if (stars >= 100) return 5
  if (stars >= 60) return 4
  if (stars >= 30) return 3
  if (stars >= 10) return 2
  return 1
}

export function useStudentDashboard(): UseStudentDashboardReturn {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [gamification, setGamification] = useState<Gamification>({
    totalStars: 0,
    currentLevel: 1,
    streakDays: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)

      // Level 1 (parallel): gamificación + cursos inscritos
      const [gamiResult, inscripcionesResult] = await Promise.all([
        supabase
          .from("gamificacion")
          .select("puntos_totales, streaks_dias")
          .eq("id_alumno", user.id)
          .single(),
        supabase
          .from("alumno_curso")
          .select("id_curso, curso:id_curso(id_curso, titulo)")
          .eq("id_alumno", user.id),
      ])

      if (gamiResult.data) {
        setGamification({
          totalStars: gamiResult.data.puntos_totales,
          currentLevel: calculateLevel(gamiResult.data.puntos_totales),
          streakDays: gamiResult.data.streaks_dias,
        })
      }

      const cursosRaw = inscripcionesResult.data
        ?.map((i: any) => i.curso)
        .filter(Boolean) ?? []

      if (cursosRaw.length === 0) {
        setLoading(false)
        return
      }

      const cursoIds = cursosRaw.map((c: any) => c.id_curso)

      // Level 2: todas las lecciones de todos los cursos en una sola query
      const { data: todasLecciones } = await supabase
        .from("leccion")
        .select("id_leccion, id_curso, titulo, orden")
        .in("id_curso", cursoIds)
        .eq("publicado", true)
        .order("orden", { ascending: true })

      const allLeccionIds = todasLecciones?.map((l: any) => l.id_leccion) ?? []

      // Level 3: todas las progresiones en una sola query
      const { data: todasProgresiones } = allLeccionIds.length > 0
        ? await supabase
            .from("progresion_alumno")
            .select("id_leccion, pct_completado")
            .eq("id_alumno", user.id)
            .in("id_leccion", allLeccionIds)
        : { data: [] as any[] }

      // Agrupar en memoria (sin más queries)
      const leccByCorso = new Map<string, any[]>()
      for (const l of todasLecciones ?? []) {
        if (!leccByCorso.has(l.id_curso)) leccByCorso.set(l.id_curso, [])
        leccByCorso.get(l.id_curso)!.push(l)
      }

      const progByLecc = new Map<string, any>()
      for (const p of todasProgresiones ?? []) {
        progByLecc.set(p.id_leccion, p)
      }

      const coursesData: Course[] = cursosRaw.map((c: any) => {
        const lecciones = leccByCorso.get(c.id_curso) ?? []
        const totalLessons = lecciones.length
        const progresiones = lecciones
          .map((l: any) => progByLecc.get(l.id_leccion))
          .filter(Boolean)

        const completedLessons = progresiones.filter(
          (p: any) => p.pct_completado >= 100
        ).length

        const avgProgress =
          progresiones.length > 0 && totalLessons > 0
            ? Math.round(
                progresiones.reduce((acc: number, p: any) => acc + p.pct_completado, 0) /
                  totalLessons
              )
            : 0

        const completedIds = new Set(
          progresiones
            .filter((p: any) => p.pct_completado >= 100)
            .map((p: any) => p.id_leccion)
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

      setCourses(coursesData)
      setLoading(false)
    }

    fetchData()
  }, [user])

  return { courses, gamification, loading }
}
