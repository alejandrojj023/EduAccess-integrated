import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { supabase } from "@/lib/supabase"

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 401 }
      )
    }

    const { data: perfil } = await supabaseAdmin
      .from("perfil")
      .select("rol")
      .eq("id_perfil", user.id)
      .single()

    if (!perfil || perfil.rol !== "alumno") {
      return NextResponse.json(
        { error: "Solo los alumnos pueden realizar el test" },
        { status: 403 }
      )
    }

    const { data: testExistente } = await supabaseAdmin
      .from("test_inicial")
      .select("id_test_inicial")
      .eq("id_alumno", user.id)
      .limit(1)

    if (testExistente && testExistente.length > 0) {
      return NextResponse.json(
        { error: "El test ya fue completado" },
        { status: 409 }
      )
    }

    const body = await request.json()

    if (!body.respuestas || !Array.isArray(body.respuestas)) {
      return NextResponse.json(
        { error: "Formato de respuestas inválido" },
        { status: 400 }
      )
    }

    const puntajeTotal = body.respuestas.reduce(
      (acc, r) => acc + (r.puntaje || 0),
      0
    )
    const puntajeMaximo = body.respuestas.length

    const porcentaje = (puntajeTotal / puntajeMaximo) * 100
    let resultado
    let tipoIndicador = null

    if (porcentaje <= 40) {
      resultado = "requiere_sistema"
      tipoIndicador = "ambas"
    } else if (porcentaje <= 70) {
      resultado = "revision_manual"
    } else {
      resultado = "no_requiere"
    }

    const { data: testGuardado, error: insertError } = await supabaseAdmin
      .from("test_inicial")
      .insert({
        id_alumno: user.id,
        puntaje: puntajeTotal,
        tipo_indicador: tipoIndicador,
        resultado,
        detalle_respuestas: body.respuestas,
      })
      .select("id_test_inicial, puntaje, resultado")
      .single()

    if (insertError) {
      console.error("Error al guardar test:", insertError.message)
      return NextResponse.json(
        { error: "Error al guardar el test" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      resultado: testGuardado.resultado,
      puntaje: testGuardado.puntaje,
    })
  } catch (error) {
    console.error("Error en /api/test-inicial:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
