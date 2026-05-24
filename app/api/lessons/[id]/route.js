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
      material_imagen_url,
    } = body;

    if (!titulo) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 },
      );
    }

    // 1. Update lesson record
    const { error: updateError } = await supabaseAdmin
      .from("leccion")
      .update({
        titulo,
        contenido: contenido || null,
        material_lectura: material_lectura || null,
        material_audiovisual: material_audiovisual || null,
        material_pdf_url: material_pdf_url || null,
        material_pdf_titulo: material_pdf_titulo || null,
        material_imagen_url: material_imagen_url || null,
      })
      .eq("id_leccion", lessonId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Get current activity IDs in DB
    const { data: existingActs } = await supabaseAdmin
      .from("actividad")
      .select("id_actividad")
      .eq("id_leccion", lessonId);

    const existingIdSet = new Set((existingActs ?? []).map((a) => a.id_actividad));
    const incomingActivities = Array.isArray(activities) ? activities : [];

    // Incoming IDs that actually exist in DB (real UUIDs, not Date.now() temp IDs)
    const incomingExistingIds = new Set(
      incomingActivities
        .filter((a) => a.id && existingIdSet.has(a.id))
        .map((a) => a.id),
    );

    // 3. Delete activities removed by the teacher (preserves intento_actividad of kept ones)
    const idsToDelete = [...existingIdSet].filter(
      (id) => !incomingExistingIds.has(id),
    );
    if (idsToDelete.length > 0) {
      await supabaseAdmin
        .from("pregunta")
        .delete()
        .in("id_actividad", idsToDelete);
      await supabaseAdmin
        .from("actividad")
        .delete()
        .in("id_actividad", idsToDelete);
    }

    // 4. Process each activity in order
    for (let i = 0; i < incomingActivities.length; i++) {
      const act = incomingActivities[i];
      const orden = i + 1;
      const actData = {
        tipo: activityTypeMap[act.type] ?? "seleccion_guiada",
        titulo: act.title,
        instrucciones: act.instrucciones || null,
        nivel_dificultad: act.nivel_dificultad
          ? (difficultyMap[act.nivel_dificultad] ?? 1)
          : null,
        imagen_url: act.imagen_url ?? null,
        audio_url: act.audio_url ?? null,
        orden,
        publicado: true,
      };

      let actId;

      if (act.id && existingIdSet.has(act.id)) {
        // UPDATE existing activity — preserves id_actividad and linked intento_actividad
        await supabaseAdmin
          .from("actividad")
          .update(actData)
          .eq("id_actividad", act.id);
        actId = act.id;
        // Refresh preguntas for this activity
        await supabaseAdmin
          .from("pregunta")
          .delete()
          .eq("id_actividad", actId);
      } else {
        // INSERT new activity
        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("actividad")
          .insert({ ...actData, id_leccion: lessonId })
          .select("id_actividad")
          .single();
        if (insErr || !inserted) {
          console.error("Error inserting activity:", insErr);
          continue;
        }
        actId = inserted.id_actividad;
      }

      // Insert pregunta for sound / voice / fill types
      if (act.pregunta && actId) {
        const defaultEnunciado =
          act.type === "voice"
            ? "Escucha y responde"
            : act.type === "fill"
              ? "Completa la oración"
              : "Escucha y arma la oración";
        const enunciado =
          act.pregunta.enunciado || act.instrucciones || defaultEnunciado;
        const { error: pqError } = await supabaseAdmin
          .from("pregunta")
          .insert({
            id_actividad: actId,
            enunciado,
            respuesta_esperada: act.pregunta.respuesta_esperada || "",
            palabras_distractoras: act.pregunta.palabras_distractoras || null,
            oraciones_contexto: act.pregunta.oraciones_contexto || null,
            tipo_respuesta_esperada:
              act.pregunta.tipo_respuesta_esperada ||
              (act.type === "voice" ? "voz" : "texto"),
            orden: 1,
            puntaje_maximo: 100,
          });
        if (pqError) console.error("Error inserting pregunta:", pqError);
      }

      // Insert pregunta rows for sequence steps
      if (act.steps && Array.isArray(act.steps) && actId) {
        const stepsData = act.steps.map((step, idx) => ({
          id_actividad: actId,
          enunciado: step.description || `Paso ${idx + 1}`,
          imagen_url: step.imagen_url || null,
          orden: idx + 1,
          tipo_respuesta_esperada: "opcion",
          puntaje_maximo: 1,
        }));
        const { error: stepsError } = await supabaseAdmin
          .from("pregunta")
          .insert(stepsData);
        if (stepsError) console.error("Error inserting sequence steps:", stepsError);
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
