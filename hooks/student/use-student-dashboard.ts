import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// Hook: useStudentDashboard
// ============================================================
// Reemplaza demoCourses + gamificación mock en student-dashboard
// Consume: curso, leccion, alumno_grupo, grupo, progresion_alumno,
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

      // 1. Gamificación
      const { data: gami } = await supabase
        .from("gamificacion")
        .select("puntos_totales, streaks_dias")
        .eq("id_alumno", user.id)
        .single()

      if (gami) {
        setGamification({
          totalStars: gami.puntos_totales,
          currentLevel: calculateLevel(gami.puntos_totales),
          streakDays: gami.streaks_dias,
        })
      }

      // 2. Grupos del alumno
      const { data: inscripciones } = await supabase
        .from("alumno_grupo")
        .select("id_grupo")
        .eq("id_alumno", user.id)

      const grupoIds = inscripciones?.map((i) => i.id_grupo) ?? []
      if (grupoIds.length === 0) {
        setLoading(false)
        return
      }

      // 3. Cursos publicados de esos grupos
      const { data: cursosRaw } = await supabase
        .from("curso")
        .select("id_curso, titulo")
        .in("id_grupo", grupoIds)
        .eq("publicado", true)

      if (!cursosRaw) {
        setLoading(false)
        return
      }

      // 4. Para cada curso, calcular progreso
      const coursesData: Course[] = await Promise.all(
        cursosRaw.map(async (c: any) => {
          // Lecciones publicadas del curso
          const { data: lecciones } = await supabase
            .from("leccion")
            .select("id_leccion, titulo, orden")
            .eq("id_curso", c.id_curso)
            .eq("publicado", true)
            .order("orden", { ascending: true })

          const totalLessons = lecciones?.length ?? 0
          const leccionIds = lecciones?.map((l: any) => l.id_leccion) ?? []

          // Progresión del alumno en esas lecciones
          const { data: progresiones } = await supabase
            .from("progresion_alumno")
            .select("id_leccion, pct_completado")
            .eq("id_alumno", user.id)
            .in("id_leccion", leccionIds)

          const completedLessons = progresiones?.filter(
            (p: any) => p.pct_completado >= 100
          ).length ?? 0

          const avgProgress =
            progresiones && progresiones.length > 0
              ? Math.round(
                  progresiones.reduce((acc: number, p: any) => acc + p.pct_completado, 0) /
                    totalLessons
                )
              : 0

          // Siguiente lección (primera no completada al 100%)
          const completedIds = new Set(
            progresiones
              ?.filter((p: any) => p.pct_completado >= 100)
              .map((p: any) => p.id_leccion) ?? []
          )
          const nextLesson = lecciones?.find(
            (l: any) => !completedIds.has(l.id_leccion)
          )

          return {
            id: c.id_curso,
            name: c.titulo,
            progress: Math.min(avgProgress, 100),
            currentLesson: nextLesson?.titulo ?? "Completado",
            totalLessons,
            completedLessons,
          }
        })
      )

      setCourses(coursesData)
      setLoading(false)
    }

    fetchData()
  }, [user])

  return { courses, gamification, loading }
}
