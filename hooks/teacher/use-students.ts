import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

interface Student {
  id: string
  name: string
  email: string
  progress: number
  completedLessons: number
  totalLessons: number
  lastActive: string
  needsSupport: boolean
  colorPerfil: string | null
}

interface UseStudentsReturn {
  students: Student[]
  loading: boolean
}

const SUPPORT_THRESHOLD = 50

export function useStudents(): UseStudentsReturn {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchStudents = async () => {
      setLoading(true)

      // 1. Grupos del docente
      const { data: grupos } = await supabase
        .from("grupo")
        .select("id_grupo")
        .eq("id_docente", user.id)

      const grupoIds = grupos?.map((g) => g.id_grupo) ?? []
      if (grupoIds.length === 0) {
        setLoading(false)
        return
      }

      // 2. Alumnos de esos grupos con su perfil
      const { data: inscripciones } = await supabase
        .from("alumno_grupo")
        .select(`
          id_alumno,
          perfil:id_alumno (
            id_perfil,
            nombre,
            correo,
            color_perfil
          )
        `)
        .in("id_grupo", grupoIds)

      if (!inscripciones) {
        setLoading(false)
        return
      }

      const alumnosMap = new Map<string, any>()
      inscripciones.forEach((i: any) => {
        if (i.perfil && !alumnosMap.has(i.id_alumno)) {
          alumnosMap.set(i.id_alumno, i.perfil)
        }
      })

      const alumnoIds = Array.from(alumnosMap.keys())

      // 3. Batch: cursos inscritos de todos los alumnos
      const { data: todasInscripciones } = alumnoIds.length > 0
        ? await supabase
            .from("alumno_curso")
            .select("id_alumno, id_curso")
            .in("id_alumno", alumnoIds)
        : { data: [] as any[] }

      const cursosPorAlumno = new Map<string, Set<string>>()
      for (const ins of todasInscripciones ?? []) {
        const set = cursosPorAlumno.get(ins.id_alumno) ?? new Set<string>()
        set.add(ins.id_curso)
        cursosPorAlumno.set(ins.id_alumno, set)
      }

      // 4. Batch: lecciones publicadas de todos esos cursos
      const todosCursoIds = [...new Set((todasInscripciones ?? []).map((i: any) => i.id_curso))]
      const { data: todasLecciones } = todosCursoIds.length > 0
        ? await supabase
            .from("leccion")
            .select("id_leccion, id_curso")
            .in("id_curso", todosCursoIds)
            .eq("publicado", true)
        : { data: [] as any[] }

      const leccionesPorCurso = new Map<string, number>()
      for (const lec of todasLecciones ?? []) {
        leccionesPorCurso.set(lec.id_curso, (leccionesPorCurso.get(lec.id_curso) ?? 0) + 1)
      }

      // 5. Por cada alumno: progresión + último intento
      const studentsData: Student[] = await Promise.all(
        Array.from(alumnosMap.entries()).map(async ([alumnoId, perfil]) => {
          const [progresionesResult, ultimoIntentoResult] = await Promise.all([
            supabase
              .from("progresion_alumno")
              .select("pct_completado")
              .eq("id_alumno", alumnoId),
            supabase
              .from("intento_actividad")
              .select("fecha_creacion")
              .eq("id_alumno", alumnoId)
              .order("fecha_creacion", { ascending: false })
              .limit(1),
          ])

          const progresiones = progresionesResult.data ?? []
          const avgProgress =
            progresiones.length > 0
              ? Math.round(
                  progresiones.reduce((acc: number, p: any) => acc + p.pct_completado, 0) /
                    progresiones.length
                )
              : 0

          const completedLessons = progresiones.filter((p: any) => p.pct_completado >= 100).length

          const cursoIds = cursosPorAlumno.get(alumnoId) ?? new Set<string>()
          const totalLessons = [...cursoIds].reduce(
            (acc, cId) => acc + (leccionesPorCurso.get(cId) ?? 0),
            0
          )

          let lastActive = "Sin actividad"
          const ultimoIntento = ultimoIntentoResult.data
          if (ultimoIntento && ultimoIntento.length > 0) {
            const fecha = new Date(ultimoIntento[0].fecha_creacion)
            const ahora = new Date()
            const diffMin = Math.round((ahora.getTime() - fecha.getTime()) / 60000)

            if (diffMin < 1) lastActive = "Justo ahora"
            else if (diffMin < 60) lastActive = `Hace ${diffMin} minuto${diffMin > 1 ? "s" : ""}`
            else if (diffMin < 1440)
              lastActive = `Hace ${Math.round(diffMin / 60)} hora${Math.round(diffMin / 60) > 1 ? "s" : ""}`
            else
              lastActive = `Hace ${Math.round(diffMin / 1440)} día${Math.round(diffMin / 1440) > 1 ? "s" : ""}`
          }

          return {
            id: alumnoId,
            name: perfil.nombre,
            email: perfil.correo,
            progress: avgProgress,
            completedLessons,
            totalLessons,
            lastActive,
            needsSupport: avgProgress < SUPPORT_THRESHOLD,
            colorPerfil: perfil.color_perfil ?? null,
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
