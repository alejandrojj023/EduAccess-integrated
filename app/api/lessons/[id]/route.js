import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const activityTypeMap = {
  image: "identificacion",
  sound: "reconocimiento_sonidos",
  sequence: "secuenciacion",
  multiple: "seleccion_guiada",
  short: "respuesta_corta",
  voice: "respuesta_oral",
  wordsearch: "sopa_letras",
};

const difficultyMap = {
  facil: 1,
  medio: 2,
  dificil: 3,
  easy: 1,
  medium: 2,
  hard: 3,
};

export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { id: lessonId } = await params;
    const body = await request.json();
    const {
      titulo,
      contenido,
      activities,
      material_lectura,
      material_audiovisual,
      material_pdf_url,
      material_pdf_titulo,
    } = body;

    if (!titulo) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 },
      );
    }

    const updateFields = {
      titulo,
      contenido: contenido || null,
      material_lectura: material_lectura || null,
      material_audiovisual: material_audiovisual || null,
      material_pdf_url: material_pdf_url || null,
      material_pdf_titulo: material_pdf_titulo || null,
    };
    const { error: updateError } = await supabaseAdmin
      .from("leccion")
      .update(updateFields)
      .eq("id_leccion", lessonId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseAdmin.from("actividad").delete().eq("id_leccion", lessonId);

    if (Array.isArray(activities) && activities.length > 0) {
      const actividadesData = activities.map((act, index) => ({
        id_leccion: lessonId,
        tipo: activityTypeMap[act.type] ?? "seleccion_guiada",
        titulo: act.title,
        instrucciones: act.instrucciones || null,
        nivel_dificultad: act.nivel_dificultad
          ? (difficultyMap[act.nivel_dificultad] ?? 1)
          : null,
        imagen_url: act.imagen_url ?? null,
        audio_url: act.audio_url ?? null,
        orden: index + 1,
        publicado: true,
      }));

      const { error: actError } = await supabaseAdmin
        .from("actividad")
        .insert(actividadesData);

      if (actError) {
        return NextResponse.json({ error: actError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en PUT /api/lessons/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
