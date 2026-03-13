import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// Hook: useStudents
// ============================================================
// Reemplaza demoStudents en students-list.tsx
// Consume: perfil, alumno_grupo, grupo, progresion_alumno,
//          intento_actividad, actividad
// ============================================================

interface Student {
  id: string
  name: string
  email: string
  progress: number
  completedActivities: number
  totalActivities: number
  lastActive: string
  needsSupport: boolean
}

interface UseStudentsReturn {
  students: Student[]
  loading: boolean
}

// Umbral para "necesita apoyo" (progreso < 50%)
const SUPPORT_THRESHOLD = 50

export function useStudents(): UseStudentsReturn {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchStudents = async () => {
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

      // 2. Obtener alumnos de esos grupos con su perfil
      const { data: inscripciones } = await supabase
        .from("alumno_grupo")
        .select(`
          id_alumno,
          perfil:id_alumno (
            id_perfil,
            nombre,
            correo
          )
        `)
        .in("id_grupo", grupoIds)

      if (!inscripciones) {
        setLoading(false)
        return
      }

      // Deduplicar alumnos (puede estar en varios grupos)
      const alumnosMap = new Map<string, any>()
      inscripciones.forEach((i: any) => {
        if (i.perfil && !alumnosMap.has(i.id_alumno)) {
          alumnosMap.set(i.id_alumno, i.perfil)
        }
      })

      // 3. Total de actividades publicadas en los cursos del docente
      const { count: totalActividades } = await supabase
        .from("actividad")
        .select("id_actividad, leccion:id_leccion ( curso:id_curso ( id_grupo ) )", {
          count: "exact",
          head: true,
        })
        .eq("publicado", true)

      const total = totalActividades ?? 0

      // 4. Para cada alumno, obtener progresión y último intento
      const studentsData: Student[] = await Promise.all(
        Array.from(alumnosMap.entries()).map(async ([alumnoId, perfil]) => {
          // Progresión promedio
          const { data: progresiones } = await supabase
            .from("progresion_alumno")
            .select("pct_completado")
            .eq("id_alumno", alumnoId)

          const avgProgress =
            progresiones && progresiones.length > 0
              ? Math.round(
                  progresiones.reduce((acc, p) => acc + p.pct_completado, 0) /
                    progresiones.length
                )
              : 0

          // Actividades completadas (intentos con puntaje)
          const { count: completadas } = await supabase
            .from("intento_actividad")
            .select("id_actividad", { count: "exact", head: true })
            .eq("id_alumno", alumnoId)
            .not("puntaje_total", "is", null)

          // Último intento
          const { data: ultimoIntento } = await supabase
            .from("intento_actividad")
            .select("fecha_creacion")
            .eq("id_alumno", alumnoId)
            .order("fecha_creacion", { ascending: false })
            .limit(1)

          let lastActive = "Sin actividad"
          if (ultimoIntento && ultimoIntento.length > 0) {
            const fecha = new Date(ultimoIntento[0].fecha_creacion)
            const ahora = new Date()
            const diffMin = Math.round((ahora.getTime() - fecha.getTime()) / 60000)

            if (diffMin < 1) lastActive = "Justo ahora"
            else if (diffMin < 60) lastActive = `Hace ${diffMin} minutos`
            else if (diffMin < 1440)
              lastActive = `Hace ${Math.round(diffMin / 60)} hora${Math.round(diffMin / 60) > 1 ? "s" : ""}`
            else
              lastActive = `Hace ${Math.round(diffMin / 1440)} dia${Math.round(diffMin / 1440) > 1 ? "s" : ""}`
          }

          return {
            id: alumnoId,
            name: perfil.nombre,
            email: perfil.correo,
            progress: avgProgress,
            completedActivities: completadas ?? 0,
            totalActivities: total,
            lastActive,
            needsSupport: avgProgress < SUPPORT_THRESHOLD,
          }
        })
      )

      setStudents(studentsData)
      setLoading(false)
    }

    fetchStudents()
  }, [user])

  return { students, loading }
}
