import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.substring(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: invs, error } = await supabaseAdmin
    .from("invitacion_curso")
    .select("id_invitacion, estado, fecha_creacion, id_docente, curso:id_curso ( titulo, codigo_curso, materia )")
    .eq("id_alumno", user.id)
    .eq("estado", "pendiente")
    .order("fecha_creacion", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const raw = (invs as any[]) ?? []

  const docenteIds = [...new Set(raw.map((i: any) => i.id_docente).filter(Boolean))]
  const docenteMap = new Map<string, any>()

  if (docenteIds.length > 0) {
    const { data: perfiles } = await supabaseAdmin
      .from("perfil")
      .select("id_perfil, nombre, color_perfil")
      .in("id_perfil", docenteIds)
    perfiles?.forEach((p: any) => docenteMap.set(p.id_perfil, p))
  }

  const data = raw.map((i: any) => ({
    id_invitacion: i.id_invitacion,
    estado: i.estado,
    fecha_creacion: i.fecha_creacion,
    curso: i.curso ?? null,
    docente: {
      nombre: docenteMap.get(i.id_docente)?.nombre ?? null,
      color_perfil: docenteMap.get(i.id_docente)?.color_perfil ?? null,
    },
  }))

  return NextResponse.json({ data })
}
