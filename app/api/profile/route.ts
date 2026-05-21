import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// PATCH /api/profile — actualiza color_perfil en perfil (aplica a alumnos y docentes)
export async function PATCH(request: NextRequest) {
  const token = request.headers.get("Authorization")?.substring(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { color_perfil } = await request.json()
  if (!color_perfil) return NextResponse.json({ error: "color_perfil requerido" }, { status: 400 })

  const { error } = await supabaseAdmin
    .from("perfil")
    .update({ color_perfil })
    .eq("id_perfil", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
