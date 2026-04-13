import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { fechaTijuana, diferenciaDias } from "@/lib/utils"

// POST /api/complete-lesson — calcula estrellas, guarda historial de intento y actualiza gamificación
export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.substring(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { lessonId, results } = await request.json()
  if (!lessonId || !Array.isArray(results)) {
    return NextResponse.json({ error: "lessonId y results son requeridos" }, { status: 400 })
  }

  const total = results.length
  if (total === 0) return NextResponse.json({ stars: 0 })

  // Calcular puntaje: respuestas correctas en primer intento
  const correctFirst = results.filter((r: any) => r.correct && r.attempts <= 1).length
  const puntajePct = (correctFirst / total) * 100
  const totalReintentos = results.reduce((acc: number, r: any) => acc + Math.max(0, r.attempts - 1), 0)

  // 1. Calcular estrellas via RPC
  const { data: starsData } = await supabaseAdmin.rpc("fn_calcular_estrellas", {
    p_puntaje_porcentaje: puntajePct,
    p_total_reintentos_actividad: totalReintentos,
  })
  const stars: number = starsData ?? 0

  // 2. Contar intentos previos de esta lección para numero_intento
  const { count: intentosPrevios } = await supabaseAdmin
    .from("intento_leccion")
    .select("*", { count: "exact", head: true })
    .eq("id_alumno", user.id)
    .eq("id_leccion", lessonId)

  const numeroIntento = (intentosPrevios ?? 0) + 1

  // 3. Insertar registro de historial en intento_leccion
  //    Intenta primero con todos los campos; si falla (columnas inexistentes),
  //    reintenta con solo los campos mínimos garantizados.
  let intentoLeccionId: string | null = null

  const { data: intentoFull, error: errorFull } = await supabaseAdmin
    .from("intento_leccion")
    .insert({
      id_alumno: user.id,
      id_leccion: lessonId,
      numero_intento: numeroIntento,
      estrellas: stars,
      promedio_puntaje: puntajePct,
      total_actividades: total,
      correctas_primer_intento: correctFirst,
      total_reintentos: totalReintentos,
    })
    .select("id_intento_leccion")
    .single()

  if (!errorFull && intentoFull?.id_intento_leccion) {
    intentoLeccionId = intentoFull.id_intento_leccion
  } else if (errorFull) {
    // Fallback: insertar solo los campos mínimos
    console.error("[complete-lesson] insert completo falló, intentando mínimo:", errorFull.message)
    const { data: intentoMin, error: errorMin } = await supabaseAdmin
      .from("intento_leccion")
      .insert({
        id_alumno: user.id,
        id_leccion: lessonId,
        numero_intento: numeroIntento,
        estrellas: stars,
      })
      .select("id_intento_leccion")
      .single()

    if (!errorMin && intentoMin?.id_intento_leccion) {
      intentoLeccionId = intentoMin.id_intento_leccion
    } else {
      console.error("[complete-lesson] insert mínimo también falló:", errorMin?.message)
    }
  }

  // 4. Vincular los intento_actividad de esta sesión con el intento_leccion
  if (intentoLeccionId) {
    const actIds = results.map((r: any) => r.id)
    await supabaseAdmin
      .from("intento_actividad")
      .update({ id_intento_leccion: intentoLeccionId })
      .in("id_actividad", actIds)
      .eq("id_alumno", user.id)
      .is("id_intento_leccion", null)
  }

  // 5. Upsert progresion_alumno — sobreescribe con el resultado de esta sesión
  await supabaseAdmin.from("progresion_alumno").upsert(
    {
      id_alumno: user.id,
      id_leccion: lessonId,
      pct_completado: 100,
      estrellas: stars,
      total_intentos: total,
      promedio_puntaje: puntajePct,
    },
    { onConflict: "id_alumno,id_leccion" }
  )

  // 6. Recalcular estrellas totales de todas las lecciones del alumno
  const { data: todasProgresiones } = await supabaseAdmin
    .from("progresion_alumno")
    .select("estrellas")
    .eq("id_alumno", user.id)
    .not("estrellas", "is", null)

  const totalEstrellas = (todasProgresiones ?? []).reduce(
    (acc: number, p: any) => acc + (p.estrellas ?? 0),
    0
  )

  // 7. Calcular nuevo nivel via RPC
  const { data: nuevoNivel } = await supabaseAdmin.rpc("fn_calcular_nivel", {
    p_estrellas: totalEstrellas,
  })

  // 8. Calcular racha diaria
  const { data: gamiActual } = await supabaseAdmin
    .from("gamificacion")
    .select("streaks_dias, ultimo_acceso")
    .eq("id_alumno", user.id)
    .single()

  const ahora = new Date()
  const hoyMx = fechaTijuana(ahora)
  let nuevaRacha: number

  if (!gamiActual?.ultimo_acceso) {
    nuevaRacha = 1
  } else {
    const ultimoDiaMx = fechaTijuana(gamiActual.ultimo_acceso)
    const diff = diferenciaDias(ultimoDiaMx, hoyMx)

    if (diff === 0) {
      nuevaRacha = gamiActual.streaks_dias ?? 1
    } else if (diff === 1) {
      nuevaRacha = (gamiActual.streaks_dias ?? 0) + 1
    } else {
      nuevaRacha = 1
    }
  }

  // 9. Actualizar gamificacion (estrellas, nivel, racha, ultimo_acceso)
  await supabaseAdmin
    .from("gamificacion")
    .update({
      estrellas_totales: totalEstrellas,
      nivel: nuevoNivel ?? 1,
      streaks_dias: nuevaRacha,
      ultimo_acceso: ahora.toISOString(),
    })
    .eq("id_alumno", user.id)

  return NextResponse.json({ stars, totalEstrellas, nivel: nuevoNivel ?? 1, streakDays: nuevaRacha })
}

// PUT /api/complete-lesson — reinicia progresión de lección (incrementa total_reintentos)
export async function PUT(request: NextRequest) {
  const token = request.headers.get("Authorization")?.substring(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { lessonId } = await request.json()
  if (!lessonId) return NextResponse.json({ error: "lessonId requerido" }, { status: 400 })

  // Obtener reintentos actuales
  const { data: prog } = await supabaseAdmin
    .from("progresion_alumno")
    .select("total_reintentos")
    .eq("id_alumno", user.id)
    .eq("id_leccion", lessonId)
    .maybeSingle()

  await supabaseAdmin.from("progresion_alumno").upsert(
    {
      id_alumno: user.id,
      id_leccion: lessonId,
      total_reintentos: (prog?.total_reintentos ?? 0) + 1,
      pct_completado: 0,
      estrellas: null,
    },
    { onConflict: "id_alumno,id_leccion" }
  )

  return NextResponse.json({ success: true })
}
