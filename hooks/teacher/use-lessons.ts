import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

// ============================================================
// Hook: useLessons
// ============================================================
// Reemplaza demoLessons en lesson-management.tsx
// Consume: leccion, actividad
// ============================================================

interface Lesson {
  id: string
  title: string
  instructions: string
  activitiesCount: number
  status: "draft" | "published"
}

interface UseLessonsReturn {
  lessons: Lesson[]
  loading: boolean
  deleteLesson: (lessonId: string) => Promise<boolean>
  refresh: () => void
}

export function useLessons(courseId: string | null): UseLessonsReturn {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!courseId) {
      setLessons([])
      setLoading(false)
      return
    }

    const fetchLessons = async () => {
      setLoading(true)

      // Single query with nested count (eliminates N+1)
      const { data: leccionesRaw, error } = await supabase
        .from("leccion")
        .select("id_leccion, titulo, contenido, orden, publicado, actividad(count)")
        .eq("id_curso", courseId)
        .order("orden", { ascending: true })

      if (error || !leccionesRaw) {
        setLoading(false)
        return
      }

      const lessonsData: Lesson[] = leccionesRaw.map((l: any) => ({
        id: l.id_leccion,
        title: l.titulo,
        instructions: l.contenido ?? "",
        activitiesCount: (l.actividad as any)?.[0]?.count ?? 0,
        status: l.publicado ? "published" as const : "draft" as const,
      }))

      setLessons(lessonsData)
      setLoading(false)
    }

    fetchLessons()
  }, [courseId, refreshKey])

  const deleteLesson = async (lessonId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("leccion")
      .delete()
      .eq("id_leccion", lessonId)

    if (error) {
      console.error("Error al eliminar lección:", error.message)
      return false
    }

    setLessons((prev) => prev.filter((l) => l.id !== lessonId))
    return true
  }

  return { lessons, loading, deleteLesson, refresh }
}
