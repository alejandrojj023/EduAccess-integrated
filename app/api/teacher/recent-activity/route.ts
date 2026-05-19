import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/teacher/recent-activity
// Devuelve los últimos 10 intentos de actividad de los alumnos del docente.
// Usa supabaseAdmin para saltar RLS.
export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.substring(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from("perfil")
    .select("rol")
    .eq("id_perfil", user.id)
    .single()

  if (perfil?.rol !== "docente") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  // 1. Grupos del docente
  const { data: grupos } = await supabaseAdmin
    .from("grupo")
    .select("id_grupo")
    .eq("id_docente", user.id)

  const grupoIds = grupos?.map((g: any) => g.id_grupo) ?? []
  if (grupoIds.length === 0) return NextResponse.json({ activity: [] })

  // 2. Cursos y alumnos en paralelo
  const [cursosResult, alumnosResult] = await Promise.all([
    supabaseAdmin.from("curso").select("id_curso").in("id_grupo", grupoIds),
    supabaseAdmin.from("alumno_grupo").select("id_alumno").in("id_grupo", grupoIds),
  ])

  const alumnoIds = [...new Set(alumnosResult.data?.map((a: any) => a.id_alumno) ?? [])]

  if ((cursosResult.data ?? []).length === 0) return NextResponse.json({ activity: [] })

  // 3. Últimos 10 intentos de actividad filtrados por grupo
  const { data: intentos, error } = await supabaseAdmin
    .from("intento_actividad")
    .select("id_alumno, id_actividad, puntaje_total, fecha_fin, fecha_creacion")
    .in("id_grupo", grupoIds)
    .order("fecha_fin", { ascending: false })
    .limit(10)

  if (error) {
    console.error("[recent-activity] error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const activityIds = [...new Set((intentos ?? []).map((i: any) => i.id_actividad).filter(Boolean))]

  // 4. Actividades y perfiles en paralelo
  const [actividadesResult, perfilesResult] = await Promise.all([
    activityIds.length > 0
      ? supabaseAdmin.from("actividad").select("id_actividad, titulo").in("id_actividad", activityIds)
      : Promise.resolve({ data: [] }),
    alumnoIds.length > 0
      ? supabaseAdmin.from("perfil").select("id_perfil, nombre").in("id_perfil", alumnoIds)
      : Promise.resolve({ data: [] }),
  ])

  const actividadTitulos = new Map((actividadesResult.data ?? []).map((a: any) => [a.id_actividad, a.titulo]))
  const perfilNombres = new Map((perfilesResult.data ?? []).map((p: any) => [p.id_perfil, p.nombre]))

  const ahora = new Date()
  const activity = (intentos ?? []).map((i: any) => {
    const nombre = perfilNombres.get(i.id_alumno) ?? "Alumno"
    const actTitulo = actividadTitulos.get(i.id_actividad) ?? "una actividad"
    const score: number | null = i.puntaje_total != null ? Math.round(i.puntaje_total) : null

    const ts = i.fecha_fin ?? i.fecha_creacion
    const diffMin = ts ? Math.round((ahora.getTime() - new Date(ts).getTime()) / 60000) : 0

    let time: string
    if (diffMin < 1) time = "Justo ahora"
    else if (diffMin < 60) time = `Hace ${diffMin} min`
    else if (diffMin < 1440) {
      const h = Math.round(diffMin / 60)
      time = `Hace ${h} hora${h > 1 ? "s" : ""}`
    } else {
      const d = Math.round(diffMin / 1440)
      time = `Hace ${d} día${d > 1 ? "s" : ""}`
    }

    return {
      id: `${i.id_alumno}-${i.id_actividad}-${i.fecha_fin ?? i.fecha_creacion}`,
      student: nombre,
      activity: `Completó "${actTitulo}"`,
      time,
      score,
    }
  })

  return NextResponse.json({ activity })
}
