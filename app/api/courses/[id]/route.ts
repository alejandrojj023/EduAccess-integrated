import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const courseId = params.id
    const body = await request.json()
    const { titulo, descripcion, materia } = body

    if (!titulo) {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 })
    }

    const updateData: Record<string, string | null> = { titulo }
    if (descripcion !== undefined) updateData.descripcion = descripcion || null
    if (materia !== undefined) updateData.materia = materia

    const { error: updateError } = await supabaseAdmin
      .from("curso")
      .update(updateData)
      .eq("id_curso", courseId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en PUT /api/courses/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
