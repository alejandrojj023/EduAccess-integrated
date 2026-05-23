import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/lesson-attempts?alumnoId=xxx&leccionIds=id1,id2
// Devuelve el historial de intento_leccion del alumno para las lecciones indicadas,
// junto con las actividades vinculadas a cada intento (para los segmentos de las barras).
// Usa supabaseAdmin para saltarse RLS — solo accesible por docentes autenticados.
export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.substring(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  // Verificar que el solicitante es docente
  const { data: perfil } = await supabaseAdmin
    .from("perfil")
    .select("rol")
    .eq("id_perfil", user.id)
    .single()

  if (perfil?.rol !== "docente") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const url = new URL(request.url)
  const alumnoId = url.searchParams.get("alumnoId")
  const leccionIdsStr = url.searchParams.get("leccionIds")

  if (!alumnoId || !leccionIdsStr) {
    return NextResponse.json({ error: "alumnoId y leccionIds son requeridos" }, { status: 400 })
  }

  const leccionIds = leccionIdsStr.split(",").filter(Boolean)
  if (leccionIds.length === 0) {
    return NextResponse.json({ intentosLeccion: [], intentosAct: [], actividades: [] })
  }

  // 1. Historial de intentos de lección (select * para no romper si faltan columnas opcionales)
  const { data: intentosLeccion, error: errorIL } = await supabaseAdmin
    .from("intento_leccion")
    .select("*")
    .eq("id_alumno", alumnoId)
    .in("id_leccion", leccionIds)
    .order("numero_intento", { ascending: true })

  if (errorIL) console.error("[lesson-attempts] intento_leccion error:", errorIL.message)

  // 2. Actividades vinculadas a esos intentos (para segmentos de barra)
  const intentoLeccionIds = (intentosLeccion ?? []).map((il: any) => il.id_intento_leccion).filter(Boolean)
  const { data: intentosAct, error: errorIA } = intentoLeccionIds.length > 0
    ? await supabaseAdmin
        .from("intento_actividad")
        .select("*")
        .in("id_intento_leccion", intentoLeccionIds)
    : { data: [], error: null }

  if (errorIA) console.error("[lesson-attempts] intento_actividad error:", errorIA.message)

  // 3. Títulos, tipo e instrucciones de actividades
  const actividadIds = [...new Set((intentosAct ?? []).map((i: any) => i.id_actividad))]
  const { data: actividades } = actividadIds.length > 0
    ? await supabaseAdmin
        .from("actividad")
        .select("id_actividad, titulo, tipo, instrucciones")
        .in("id_actividad", actividadIds)
    : { data: [] }

  // 4. Respuesta esperada desde tabla pregunta (para tipos que no usan JSON)
  const tiposConPregunta = ["reconocimiento_sonidos", "respuesta_oral", "completar_oracion"]
  const actConPregunta = (actividades ?? [])
    .filter((a: any) => tiposConPregunta.includes(a.tipo))
    .map((a: any) => a.id_actividad)

  const { data: preguntas } = actConPregunta.length > 0
    ? await supabaseAdmin
        .from("pregunta")
        .select("id_actividad, respuesta_esperada")
        .in("id_actividad", actConPregunta)
    : { data: [] }

  const preguntaByActividad: Record<string, string> = {}
  for (const p of preguntas ?? []) {
    if (p.id_actividad && p.respuesta_esperada) preguntaByActividad[p.id_actividad] = p.respuesta_esperada
  }

  // 5. Calcular respuesta correcta por actividad
  const respuestaCorrecta: Record<string, string> = {}
  for (const act of actividades ?? []) {
    try {
      if (act.tipo === "seleccion_guiada" || act.tipo === "identificacion") {
        const cfg = JSON.parse(act.instrucciones ?? "{}")
        const correcta = (cfg.opciones ?? []).find((o: any) => o.correcta)?.texto
        if (correcta) respuestaCorrecta[act.id_actividad] = correcta
      } else if (act.tipo === "respuesta_corta") {
        const cfg = JSON.parse(act.instrucciones ?? "{}")
        if (cfg.respuesta_correcta) respuestaCorrecta[act.id_actividad] = cfg.respuesta_correcta
      } else if (act.tipo === "sopa_letras") {
        const cfg = JSON.parse(act.instrucciones ?? "{}")
        if (cfg.palabras_sopa?.length) respuestaCorrecta[act.id_actividad] = cfg.palabras_sopa.join(", ")
      } else if (tiposConPregunta.includes(act.tipo)) {
        const resp = preguntaByActividad[act.id_actividad]
        if (resp) respuestaCorrecta[act.id_actividad] = resp
      }
    } catch { /* instrucciones malformadas — se omite */ }
  }

  // 6. Respuestas literales del alumno por intento_actividad
  const intentoActIds = (intentosAct ?? []).map((i: any) => i.id_intento).filter(Boolean)
  const { data: respuestas } = intentoActIds.length > 0
    ? await supabaseAdmin
        .from("respuesta")
        .select("id_intento, texto_respuesta, tiempo_respuesta_segundos")
        .in("id_intento", intentoActIds)
    : { data: [] }

  return NextResponse.json({
    intentosLeccion:   intentosLeccion ?? [],
    intentosAct:       intentosAct ?? [],
    actividades:       actividades ?? [],
    respuestas:        respuestas ?? [],
    respuestaCorrecta,
  })
}
