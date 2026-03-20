import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// POST /api/attempts — guarda un intento_actividad del alumno
export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.substring(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { activityId, puntaje } = await request.json()
  if (!activityId) return NextResponse.json({ error: "activityId requerido" }, { status: 400 })

  // Obtener id_grupo desde actividad → leccion → curso → grupo
  const { data: act } = await supabaseAdmin
    .from("actividad")
    .select("id_leccion")
    .eq("id_actividad", activityId)
    .single()

  if (!act) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 })

  const { data: leccion } = await supabaseAdmin
    .from("leccion")
    .select("id_curso")
    .eq("id_leccion", act.id_leccion)
    .single()

  if (!leccion) return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 })

  const { data: curso } = await supabaseAdmin
    .from("curso")
    .select("id_grupo")
    .eq("id_curso", leccion.id_curso)
    .single()

  if (!curso) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 })

  const now = new Date().toISOString()

  const { error } = await supabaseAdmin.from("intento_actividad").insert({
    id_alumno:    user.id,
    id_actividad: activityId,
    id_grupo:     curso.id_grupo,
    puntaje_total: puntaje ?? 0,
    fecha_inicio:  now,
    fecha_fin:     now,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
