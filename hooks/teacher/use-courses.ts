import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// Hook: useCourses
// ============================================================
// Reemplaza demoCourses en course-list.tsx
// Consume: curso, grupo, alumno_grupo, leccion
// ============================================================

interface Course {
  id: string
  name: string
  description: string
  grade: string
  students: number
  lessons: number
}

interface UseCoursesReturn {
  courses: Course[]
  loading: boolean
  deleteCourse: (courseId: string) => Promise<boolean>
  refresh: () => void
}

const gradeLabels: Record<string, string> = {
  "1": "1er Grado",
  "2": "2do Grado",
  "3": "3er Grado",
}

export function useCourses(): UseCoursesReturn {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!user) return

    const fetchCourses = async () => {
      setLoading(true)

      // Obtener cursos con datos del grupo (grado)
      const { data: cursosRaw, error } = await supabase
        .from("curso")
        .select(`
          id_curso,
          titulo,
          descripcion,
          grupo:id_grupo (
            id_grupo,
            grado
          )
        `)
        .order("fecha_creacion", { ascending: false })

      if (error || !cursosRaw) {
        setLoading(false)
        return
      }

      // Para cada curso, contar estudiantes y lecciones
      const coursesData: Course[] = await Promise.all(
        cursosRaw.map(async (c: any) => {
          const grupoId = c.grupo?.id_grupo

          // Contar lecciones
          const { count: lessonCount } = await supabase
            .from("leccion")
            .select("id_leccion", { count: "exact", head: true })
            .eq("id_curso", c.id_curso)

          // Contar estudiantes del grupo
          const { count: studentCount } = await supabase
            .from("alumno_grupo")
            .select("id_alumno", { count: "exact", head: true })
            .eq("id_grupo", grupoId)

          return {
            id: c.id_curso,
            name: c.titulo,
            description: c.descripcion ?? "",
            grade: gradeLabels[c.grupo?.grado] ?? c.grupo?.grado ?? "",
            students: studentCount ?? 0,
            lessons: lessonCount ?? 0,
          }
        })
      )

      setCourses(coursesData)
      setLoading(false)
    }

    fetchCourses()
  }, [user, refreshKey])

  const deleteCourse = async (courseId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("curso")
      .delete()
      .eq("id_curso", courseId)

    if (error) {
      console.error("Error al eliminar curso:", error.message)
      return false
    }

    setCourses((prev) => prev.filter((c) => c.id !== courseId))
    return true
  }

  return { courses, loading, deleteCourse, refresh }
}
