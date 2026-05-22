import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const activityTypeMap = {
  image: "identificacion",
  sound: "reconocimiento_sonidos",
  sequence: "secuenciacion",
  multiple: "seleccion_guiada",
  short: "respuesta_corta",
  voice: "respuesta_oral",
  fill: "completar_oracion",
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

export async function POST(request) {
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

    const body = await request.json();
    const {
      courseId,
      titulo,
      contenido,
      activities,
      material_lectura,
      material_audiovisual,
      material_pdf_url,
      material_pdf_titulo,
      material_imagen_url,
    } = body;

    if (!courseId || !titulo) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 },
      );
    }

    const { count: leccionCount } = await supabaseAdmin
      .from("leccion")
      .select("id_leccion", { count: "exact", head: true })
      .eq("id_curso", courseId);

    const nextOrden = (leccionCount ?? 0) + 1;

    const lessonData = {
      id_curso: courseId,
      titulo,
      contenido: contenido || null,
      material_lectura: material_lectura || null,
      material_audiovisual: material_audiovisual || null,
      material_pdf_url: material_pdf_url || null,
      material_pdf_titulo: material_pdf_titulo || null,
      material_imagen_url: material_imagen_url || null,
      orden: nextOrden,
      publicado: true,
    };
    const { data: leccion, error: leccionError } = await supabaseAdmin
      .from("leccion")
      .insert(lessonData)
      .select("id_leccion")
      .single();

    if (leccionError || !leccion) {
      return NextResponse.json(
        { error: leccionError?.message ?? "Error al crear lección" },
        { status: 500 },
      );
    }

    if (Array.isArray(activities) && activities.length > 0) {
      const actividadesData = activities.map((act, index) => ({
        id_leccion: leccion.id_leccion,
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

      const { data: insertedActivities, error: actError } = await supabaseAdmin
        .from("actividad")
        .insert(actividadesData)
        .select("id_actividad, orden");

      if (actError) {
        await supabaseAdmin
          .from("leccion")
          .delete()
          .eq("id_leccion", leccion.id_leccion);
        return NextResponse.json({ error: actError.message }, { status: 500 });
      }

      // Insert pregunta rows for sound/voice/fill/sequence types
      if (insertedActivities) {
        for (let i = 0; i < activities.length; i++) {
          const act = activities[i];
          const insertedAct = insertedActivities.find(
            (a) => a.orden === i + 1,
          );
          if (!insertedAct) continue;

          if (act.pregunta) {
            const defaultEnunciado =
              act.type === "voice"
                ? "Escucha y responde"
                : act.type === "fill"
                  ? "Completa la oración"
                  : "Escucha y arma la oración";
            const enunciado =
              act.pregunta.enunciado ||
              act.instrucciones ||
              defaultEnunciado;
            const { error: pqError } = await supabaseAdmin
              .from("pregunta")
              .insert({
                id_actividad: insertedAct.id_actividad,
                enunciado,
                respuesta_esperada:
                  act.pregunta.respuesta_esperada || "",
                palabras_distractoras:
                  act.pregunta.palabras_distractoras || null,
                oraciones_contexto:
                  act.pregunta.oraciones_contexto || null,
                tipo_respuesta_esperada:
                  act.pregunta.tipo_respuesta_esperada ||
                  (act.type === "voice" ? "voz" : "texto"),
                orden: 1,
                puntaje_maximo: 100,
              });
            if (pqError) {
              console.error("Error inserting pregunta:", pqError);
            }
          }

          if (act.steps && Array.isArray(act.steps)) {
            const stepsData = act.steps.map((step, idx) => ({
              id_actividad: insertedAct.id_actividad,
              enunciado: step.description || `Paso ${idx + 1}`,
              imagen_url: step.imagen_url || null,
              orden: idx + 1,
              tipo_respuesta_esperada: "opcion",
              puntaje_maximo: 1,
            }));
            const { error: stepsError } = await supabaseAdmin
              .from("pregunta")
              .insert(stepsData);
            if (stepsError) {
              console.error("Error inserting sequence steps:", stepsError);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, id_leccion: leccion.id_leccion });
  } catch (error) {
    console.error("Error en /api/lessons:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
