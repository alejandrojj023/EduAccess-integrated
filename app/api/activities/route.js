import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const activityTypeMap = {
  image: "identificacion",
  sound: "reconocimiento_sonidos",
  sequence: "secuenciacion",
  multiple: "seleccion_guiada",
  short: "respuesta_corta",
  voice: "respuesta_oral",
  fill: "completar_oracion",
}

const difficultyMap = {
  facil: 1, medio: 2, dificil: 3,
  easy: 1, medium: 2, hard: 3,
}

const activityTitleMap = {
  image: "Identificacion de imagenes",
  sound: "Reconocimiento de sonidos",
  sequence: "Ordenar secuencias",
  multiple: "Opcion multiple",
  short: "Respuesta corta escrita",
  voice: "Respuesta por voz",
  fill: "Completar oracion",
}

export async function POST(request) {
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

    const body = await request.json()
    const { lessonId, type, instrucciones, nivel_dificultad, imagen_url, audio_url, pregunta, steps } = body

    if (!lessonId || !type) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const { count } = await supabaseAdmin
      .from("actividad")
      .select("id_actividad", { count: "exact", head: true })
      .eq("id_leccion", lessonId)

    const orden = (count ?? 0) + 1

    const { data: actividad, error: actError } = await supabaseAdmin
      .from("actividad")
      .insert({
        id_leccion: lessonId,
        tipo: activityTypeMap[type] ?? "seleccion_guiada",
        titulo: activityTitleMap[type] ?? type,
        instrucciones: instrucciones || null,
        nivel_dificultad: nivel_dificultad ? (difficultyMap[nivel_dificultad] ?? 1) : null,
        imagen_url: imagen_url ?? null,
        audio_url: audio_url ?? null,
        orden,
        publicado: true,
      })
      .select("id_actividad")
      .single()

    if (actError || !actividad) {
      return NextResponse.json(
        { error: actError?.message ?? "Error al crear actividad" },
        { status: 500 }
      )
    }

    // For sequence activities: insert one pregunta per step
    if (type === "sequence" && steps?.length > 0 && actividad) {
      const preguntaRows = steps.map((step) => ({
        id_actividad: actividad.id_actividad,
        enunciado: step.enunciado || `Paso ${step.orden}`,
        orden: step.orden,
        imagen_url: step.imagen_url ?? null,
        tipo_respuesta_esperada: "opcion",
        puntaje_maximo: 1,
      }))
      const { error: pqError } = await supabaseAdmin.from("pregunta").insert(preguntaRows)
      if (pqError) {
        return NextResponse.json({ error: pqError.message }, { status: 500 })
      }
    }

    // For sound/voice/fill activities: insert a pregunta row
    if ((type === "sound" || type === "voice" || type === "fill") && pregunta && actividad) {
      const defaultEnunciado = type === "voice" ? "Escucha y responde" : type === "fill" ? "Completa la oración" : "Escucha y arma la oración"
      const enunciado = pregunta.enunciado || instrucciones || defaultEnunciado
      const { error: pqError } = await supabaseAdmin.from("pregunta").insert({
        id_actividad: actividad.id_actividad,
        enunciado,
        respuesta_esperada: pregunta.respuesta_esperada,
        palabras_distractoras: pregunta.palabras_distractoras ?? null,
        oraciones_contexto: pregunta.oraciones_contexto ?? null,
        tipo_respuesta_esperada: pregunta.tipo_respuesta_esperada ?? (type === "voice" ? "voz" : "texto"),
        orden: 1,
        puntaje_maximo: 100,
      })
      if (pqError) {
        return NextResponse.json({ error: pqError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, id_actividad: actividad.id_actividad })
  } catch (error) {
    console.error("Error en POST /api/activities:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
