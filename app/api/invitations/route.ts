import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// ── GET: docente → sus invitaciones enviadas
//        alumno  → sus invitaciones pendientes
export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.substring(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from("perfil")
    .select("rol")
    .eq("id_perfil", user.id)
    .single()
  if (!perfil) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })

  if (perfil.rol === "docente") {
    const { data, error } = await supabaseAdmin
      .from("invitacion")
      .select("id_invitacion, estado, fecha_creacion, alumno:id_alumno(nombre, correo), grupo:id_grupo(nombre)")
      .eq("id_docente", user.id)
      .order("fecha_creacion", { ascending: false })
      .limit(30)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } else {
    const { data, error } = await supabaseAdmin
      .from("invitacion")
      .select("id_invitacion, estado, fecha_creacion, grupo:id_grupo(nombre, grado), docente:id_docente(nombre)")
      .eq("id_alumno", user.id)
      .eq("estado", "pendiente")
      .order("fecha_creacion", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }
}

// ── POST: docente envía una invitación a un alumno por correo
export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.substring(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { email, id_grupo } = body as { email: string; id_grupo: string }

  if (!email || !id_grupo)
    return NextResponse.json({ error: "Faltan datos: email e id_grupo son requeridos" }, { status: 400 })

  // Verificar que el docente es dueño del grupo
  const { data: grupo } = await supabaseAdmin
    .from("grupo")
    .select("id_grupo, id_docente")
    .eq("id_grupo", id_grupo)
    .single()

  if (!grupo || grupo.id_docente !== user.id)
    return NextResponse.json({ error: "No tienes permiso sobre este grupo" }, { status: 403 })

  // Buscar alumno por correo
  const { data: alumno } = await supabaseAdmin
    .from("perfil")
    .select("id_perfil, rol")
    .eq("correo", email)
    .single()

  if (!alumno)
    return NextResponse.json({ error: "No se encontró ningún usuario con ese correo" }, { status: 404 })
  if (alumno.rol !== "alumno")
    return NextResponse.json({ error: "El usuario con ese correo no tiene rol de alumno" }, { status: 400 })

  // Verificar si ya está en el grupo
  const { data: yaInscrito } = await supabaseAdmin
    .from("alumno_grupo")
    .select("id_alumno_grupo")
    .eq("id_grupo", id_grupo)
    .eq("id_alumno", alumno.id_perfil)
    .maybeSingle()

  if (yaInscrito)
    return NextResponse.json({ error: "El alumno ya pertenece a este grupo" }, { status: 400 })

  // Verificar si ya tiene una invitación pendiente
  const { data: invExistente } = await supabaseAdmin
    .from("invitacion")
    .select("estado")
    .eq("id_grupo", id_grupo)
    .eq("id_alumno", alumno.id_perfil)
    .maybeSingle()

  if (invExistente?.estado === "pendiente")
    return NextResponse.json({ error: "Ya existe una invitación pendiente para este alumno en este grupo" }, { status: 400 })

  // Insertar invitación
  const { error } = await supabaseAdmin.from("invitacion").insert({
    id_grupo,
    id_docente: user.id,
    id_alumno:  alumno.id_perfil,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
