import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// Hook: useStudentProgress
// ============================================================
// Consume: alumno_curso, curso, leccion, progresion_alumno,
//          gamificacion, intento_actividad
// ============================================================

interface LessonProgress {
  id: string
  name: string
  completed: boolean
  score: number
  attempts: number
}

interface ProgressStats {
  completedLessons: number
  totalLessons: number
  overallProgress: number
  averageScore: number
  totalAttempts: number
  currentStreak: number
  totalStars: number
}

interface UseStudentProgressReturn {
  lessons: LessonProgress[]
  stats: ProgressStats
  loading: boolean
}

export function useStudentProgress(): UseStudentProgressReturn {
  const { user } = useAuth()
  const [lessons, setLessons] = useState<LessonProgress[]>([])
  const [stats, setStats] = useState<ProgressStats>({
    completedLessons: 0,
    totalLessons: 0,
    overallProgress: 0,
    averageScore: 0,
    totalAttempts: 0,
    currentStreak: 0,
    totalStars: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchProgress = async () => {
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
          .select("id_curso")
          .eq("id_alumno", user.id),
      ])

      const gami = gamiResult.data
      const cursoIds = inscripcionesResult.data?.map((i: any) => i.id_curso) ?? []

      // Level 2: lecciones publicadas de esos cursos
      const { data: leccionesRaw } = cursoIds.length > 0
        ? await supabase
            .from("leccion")
            .select("id_leccion, titulo, orden")
            .in("id_curso", cursoIds)
            .eq("publicado", true)
            .order("orden", { ascending: true })
        : { data: [] as any[] }

      const leccionIds = leccionesRaw?.map((l: any) => l.id_leccion) ?? []

      // Level 3: progresión del alumno
      const { data: progresiones } = leccionIds.length > 0
        ? await supabase
            .from("progresion_alumno")
            .select("id_leccion, pct_completado, promedio_puntaje, total_intentos")
            .eq("id_alumno", user.id)
            .in("id_leccion", leccionIds)
        : { data: [] as any[] }

      const progMap = new Map(
        progresiones?.map((p: any) => [p.id_leccion, p]) ?? []
      )

      const lessonsData: LessonProgress[] = (leccionesRaw ?? []).map((l: any) => {
        const prog = progMap.get(l.id_leccion)
        return {
          id: l.id_leccion,
          name: l.titulo,
          completed: prog ? prog.pct_completado >= 100 : false,
          score: prog ? Math.round(prog.promedio_puntaje ?? 0) : 0,
          attempts: prog ? prog.total_intentos ?? 0 : 0,
        }
      })

      setLessons(lessonsData)

      const completedCount = lessonsData.filter((l) => l.completed).length
      const totalCount = lessonsData.length
      const avgScore =
        completedCount > 0
          ? Math.round(
              lessonsData
                .filter((l) => l.completed)
                .reduce((acc, l) => acc + l.score, 0) / completedCount
            )
          : 0
      const totalAtt = lessonsData.reduce((acc, l) => acc + l.attempts, 0)

      setStats({
        completedLessons: completedCount,
        totalLessons: totalCount,
        overallProgress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        averageScore: avgScore,
        totalAttempts: totalAtt,
        currentStreak: gami?.streaks_dias ?? 0,
        totalStars: gami?.puntos_totales ?? 0,
      })

      setLoading(false)
    }

    fetchProgress()
  }, [user])

  return { lessons, stats, loading }
}
