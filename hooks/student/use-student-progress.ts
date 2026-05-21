import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { NIVELES } from "@/lib/utils"

export interface LessonAttempt {
  id: string
  numero: number
  estrellas: number | null
  puntaje: number
  fecha: string
  totalActividades: number
  correctasPrimerIntento: number
  totalReintentos: number
}

interface LessonProgress {
  id: string
  name: string
  completed: boolean
  score: number
  attempts: number
  estrellas: number | null
  totalReintentos: number
  historial: LessonAttempt[]
}

interface ProgressStats {
  completedLessons: number
  totalLessons: number
  overallProgress: number
  averageScore: number
  totalAttempts: number
  currentStreak: number
  totalStars: number
  nivelNombre: string
  nivelEmoji: string
  colorPerfil: string | null
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
    nivelNombre: NIVELES[1].nombre,
    nivelEmoji: NIVELES[1].emoji,
    colorPerfil: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchProgress = async () => {
      setLoading(true)

      // Level 1 (parallel): gamificación + cursos inscritos
      const [gamiResult, inscripcionesResult, perfilResult] = await Promise.all([
        supabase
          .from("gamificacion")
          .select("estrellas_totales, streaks_dias, nivel")
          .eq("id_alumno", user.id)
          .single(),
        supabase
          .from("alumno_curso")
          .select("id_curso")
          .eq("id_alumno", user.id),
        supabase
          .from("perfil")
          .select("color_perfil")
          .eq("id_perfil", user.id)
          .single(),
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

      // Level 3 (parallel): progresión + historial de intentos
      const [progresionesResult, historialResult] = leccionIds.length > 0
        ? await Promise.all([
            supabase
              .from("progresion_alumno")
              .select("id_leccion, pct_completado, promedio_puntaje, total_intentos, estrellas, total_reintentos")
              .eq("id_alumno", user.id)
              .in("id_leccion", leccionIds),
            supabase
              .from("intento_leccion")
              .select("id_intento_leccion, id_leccion, numero_intento, estrellas, promedio_puntaje, total_actividades, correctas_primer_intento, total_reintentos, fecha_completado")
              .eq("id_alumno", user.id)
              .in("id_leccion", leccionIds)
              .order("numero_intento", { ascending: true }),
          ])
        : [{ data: [] as any[] }, { data: [] as any[] }]

      const progresiones = progresionesResult.data
      const historialRaw = historialResult.data

      // Agrupar historial por leccion
      const historialMap = new Map<string, LessonAttempt[]>()
      for (const h of (historialRaw ?? [])) {
        const list = historialMap.get(h.id_leccion) ?? []
        list.push({
          id: h.id_intento_leccion,
          numero: h.numero_intento,
          estrellas: h.estrellas ?? null,
          puntaje: Math.round(h.promedio_puntaje ?? 0),
          fecha: h.fecha_completado,
          totalActividades: h.total_actividades ?? 0,
          correctasPrimerIntento: h.correctas_primer_intento ?? 0,
          totalReintentos: h.total_reintentos ?? 0,
        })
        historialMap.set(h.id_leccion, list)
      }

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
          estrellas: prog ? (prog.estrellas ?? null) : null,
          totalReintentos: prog ? (prog.total_reintentos ?? 0) : 0,
          historial: historialMap.get(l.id_leccion) ?? [],
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
      const totalAtt = historialRaw?.length ?? 0

      setStats({
        completedLessons: completedCount,
        totalLessons: totalCount,
        overallProgress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        averageScore: avgScore,
        totalAttempts: totalAtt,
        currentStreak: gami?.streaks_dias ?? 0,
        totalStars: gami?.estrellas_totales ?? 0,
        nivelNombre: (NIVELES[gami?.nivel ?? 1] ?? NIVELES[1]).nombre,
        nivelEmoji:  (NIVELES[gami?.nivel ?? 1] ?? NIVELES[1]).emoji,
        colorPerfil: perfilResult.data?.color_perfil ?? null,
      })

      setLoading(false)
    }

    fetchProgress()
  }, [user])

  return { lessons, stats, loading }
}
