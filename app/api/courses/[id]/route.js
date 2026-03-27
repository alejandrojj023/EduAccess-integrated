import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { id: courseId } = await params
    const body = await request.json()
    const { titulo, descripcion, materia, materia_personalizada } = body

    if (!titulo) {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 })
    }

    if (materia === "otra" && !materia_personalizada?.trim()) {
      return NextResponse.json({ error: "Escribe el nombre de la materia" }, { status: 400 })
    }

    const updateData = { titulo }
    if (descripcion !== undefined) updateData.descripcion = descripcion || null
    if (materia !== undefined) {
      updateData.materia = materia
      updateData.materia_personalizada = materia === "otra" ? materia_personalizada.trim() : null
    }

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
