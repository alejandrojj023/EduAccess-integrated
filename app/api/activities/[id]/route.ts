import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const difficultyMap: Record<string, number> = {
  facil: 1, medio: 2, dificil: 3,
  easy:  1, medium: 2, hard:   3,
}

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

    const activityId = params.id
    const body = await request.json()
    const { titulo, instrucciones, nivel_dificultad } = body

    const updateData: Record<string, any> = {}
    if (titulo !== undefined) updateData.titulo = titulo
    if (instrucciones !== undefined) updateData.instrucciones = instrucciones || null
    if (nivel_dificultad !== undefined) {
      updateData.nivel_dificultad = typeof nivel_dificultad === "string"
        ? (difficultyMap[nivel_dificultad] ?? 1)
        : nivel_dificultad
    }

    const { error: updateError } = await supabaseAdmin
      .from("actividad")
      .update(updateData)
      .eq("id_actividad", activityId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en PUT /api/activities/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
