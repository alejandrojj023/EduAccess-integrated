import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// Hook: useCourses
// ============================================================
// Consume: curso, grupo, alumno_curso, leccion
// ============================================================

interface Course {
  id: string
  name: string
  description: string
  grade: string
  grupoNombre: string
  materia: string       // valor DB: 'español' | 'matematicas' | 'otra'
  materiaLabel: string  // etiqueta para mostrar
  codigoCurso: string
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

      // Single query: curso + grupo + nested counts (eliminates N+1)
      const { data: cursosRaw, error } = await supabase
        .from("curso")
        .select(`
          id_curso,
          titulo,
          descripcion,
          materia,
          materia_personalizada,
          codigo_curso,
          grupo:id_grupo (
            id_grupo,
            grado,
            nombre
          ),
          leccion(count),
          alumno_curso(count)
        `)
        .order("fecha_creacion", { ascending: false })

      if (error || !cursosRaw) {
        setLoading(false)
        return
      }

      const coursesData: Course[] = cursosRaw.map((c: any) => {
        const mat = c.materia ?? "español"
        const materiaLabel =
          mat === "otra"
            ? (c.materia_personalizada ?? "Otra")
            : mat === "matematicas"
            ? "Matemáticas"
            : "Español"

        return {
          id: c.id_curso,
          name: c.titulo,
          description: c.descripcion ?? "",
          grade: gradeLabels[c.grupo?.grado] ?? c.grupo?.grado ?? "",
          grupoNombre: c.grupo?.nombre ?? "",
          materia: mat,
          materiaLabel,
          codigoCurso: c.codigo_curso ?? "",
          students: (c.alumno_curso as any)?.[0]?.count ?? 0,
          lessons: (c.leccion as any)?.[0]?.count ?? 0,
        }
      })

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
