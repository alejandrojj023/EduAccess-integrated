import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const difficultyMap = {
  facil: 1, medio: 2, dificil: 3,
  easy: 1, medium: 2, hard: 3,
}

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

    const { id: activityId } = await params
    const body = await request.json()
    const { titulo, instrucciones, nivel_dificultad, imagen_url, audio_url, pregunta, type, steps } = body

    const updateData = {}
    if (titulo !== undefined) updateData.titulo = titulo
    if (instrucciones !== undefined) updateData.instrucciones = instrucciones || null
    if (nivel_dificultad !== undefined) {
      if (typeof nivel_dificultad === "string") {
        updateData.nivel_dificultad = difficultyMap[nivel_dificultad] ?? 1
      } else {
        updateData.nivel_dificultad = nivel_dificultad
      }
    }
    if (imagen_url !== undefined) updateData.imagen_url = imagen_url ?? null
    if (audio_url !== undefined) updateData.audio_url = audio_url ?? null

    const { error: updateError } = await supabaseAdmin
      .from("actividad")
      .update(updateData)
      .eq("id_actividad", activityId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // For sequence activities: delete all preguntas and re-insert
    if (type === "sequence" && steps?.length > 0) {
      const { error: delError } = await supabaseAdmin
        .from("pregunta").delete().eq("id_actividad", activityId)
      if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

      const preguntaRows = steps.map((step) => ({
        id_actividad: activityId,
        enunciado: step.enunciado || `Paso ${step.orden}`,
        orden: step.orden,
        imagen_url: step.imagen_url ?? null,
        tipo_respuesta_esperada: "opcion",
        puntaje_maximo: 1,
      }))
      const { error: insError } = await supabaseAdmin.from("pregunta").insert(preguntaRows)
      if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
    }

    // For sound/voice/fill activities: upsert the pregunta row
    if (pregunta && type !== "sequence") {
      const enunciado = pregunta.enunciado || instrucciones || "Escucha y responde"
      const pqData = {
        id_actividad: activityId,
        enunciado,
        respuesta_esperada: pregunta.respuesta_esperada,
        palabras_distractoras: pregunta.palabras_distractoras ?? null,
        oraciones_contexto: pregunta.oraciones_contexto ?? null,
        tipo_respuesta_esperada: pregunta.tipo_respuesta_esperada ?? "texto",
        orden: 1,
        puntaje_maximo: 100,
      }
      if (pregunta.id) {
        // Update existing pregunta
        const { error: pqError } = await supabaseAdmin
          .from("pregunta")
          .update({
            enunciado: pqData.enunciado,
            respuesta_esperada: pqData.respuesta_esperada,
            palabras_distractoras: pqData.palabras_distractoras,
            oraciones_contexto: pregunta.oraciones_contexto ?? null,
            tipo_respuesta_esperada: pqData.tipo_respuesta_esperada,
          })
          .eq("id_pregunta", pregunta.id)
        if (pqError) {
          return NextResponse.json({ error: pqError.message }, { status: 500 })
        }
      } else {
        // Insert new pregunta (activity had none yet)
        const { error: pqError } = await supabaseAdmin.from("pregunta").insert(pqData)
        if (pqError) {
          return NextResponse.json({ error: pqError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en PUT /api/activities/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
