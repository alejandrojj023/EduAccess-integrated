import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const activityTypeMap = {
  image: "identificacion",
  sound: "reconocimiento_sonidos",
  sequence: "secuenciacion",
  multiple: "seleccion_guiada",
  short: "respuesta_corta",
  voice: "respuesta_oral",
  wordsearch: "sopa_letras",
}

const difficultyMap = {
  facil: 1, medio: 2, dificil: 3,
  easy: 1, medium: 2, hard: 3,
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
    const {
      courseId,
      titulo,
      contenido,
      activities,
      material_lectura,
      material_audiovisual,
      material_pdf_url,
      material_pdf_titulo,
    } = body

    if (!courseId || !titulo) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const { count: leccionCount } = await supabaseAdmin
      .from("leccion")
      .select("id_leccion", { count: "exact", head: true })
      .eq("id_curso", courseId)

    const nextOrden = (leccionCount ?? 0) + 1

    const lessonData = {
      id_curso: courseId,
      titulo,
      contenido: contenido || null,
      material_lectura: material_lectura || null,
      material_audiovisual: material_audiovisual || null,
      material_pdf_url: material_pdf_url || null,
      material_pdf_titulo: material_pdf_titulo || null,
      orden: nextOrden,
      publicado: true,
    }

    const { data: leccion, error: leccionError } = await supabaseAdmin
      .from("leccion")
      .insert(lessonData)
      .select("id_leccion")
      .single()

    if (leccionError || !leccion) {
      return NextResponse.json(
        { error: leccionError?.message ?? "Error al crear lección" },
        { status: 500 }
      )
    }

    if (Array.isArray(activities) && activities.length > 0) {
      const actividadesData = activities.map((act, index) => ({
        id_leccion: leccion.id_leccion,
        tipo: activityTypeMap[act.type] ?? "seleccion_guiada",
        titulo: act.title,
        instrucciones: act.instrucciones || null,
        nivel_dificultad: act.nivel_dificultad ? (difficultyMap[act.nivel_dificultad] ?? 1) : null,
        orden: index + 1,
        publicado: true,
      }))

      const { error: actError } = await supabaseAdmin
        .from("actividad")
        .insert(actividadesData)

      if (actError) {
        await supabaseAdmin.from("leccion").delete().eq("id_leccion", leccion.id_leccion)
        return NextResponse.json({ error: actError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, id_leccion: leccion.id_leccion })
  } catch (error) {
    console.error("Error en /api/lessons:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
