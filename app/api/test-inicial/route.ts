import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { supabase } from "@/lib/supabase"

// ============================================================
// POST /api/test-inicial
// ============================================================
// Guarda el resultado del test orientativo.
// Usa service_role porque el alumno NO tiene política de INSERT
// en test_inicial (para evitar manipulación desde el cliente).
//
// Body esperado:
// {
//   respuestas: [
//     { pregunta: string, respuesta: string, puntaje: number }
//   ]
// }
// ============================================================

interface RespuestaTest {
  pregunta: string
  respuesta: string
  puntaje: number
}

interface TestBody {
  respuestas: RespuestaTest[]
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar que el usuario está autenticado
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // 2. Obtener el usuario desde el JWT
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 401 }
      )
    }

    // 3. Verificar que es alumno
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

    // 4. Verificar que no haya completado el test antes
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

    // 5. Parsear el body
    const body: TestBody = await request.json()

    if (!body.respuestas || !Array.isArray(body.respuestas)) {
      return NextResponse.json(
        { error: "Formato de respuestas inválido" },
        { status: 400 }
      )
    }

    // 6. Calcular puntaje total
    const puntajeTotal = body.respuestas.reduce(
      (acc, r) => acc + (r.puntaje || 0),
      0
    )
    const puntajeMaximo = body.respuestas.length

    // 7. Determinar resultado
    const porcentaje = (puntajeTotal / puntajeMaximo) * 100
    let resultado: string
    let tipoIndicador: string | null = null

    if (porcentaje <= 40) {
      resultado = "requiere_sistema"
      tipoIndicador = "ambas"
    } else if (porcentaje <= 70) {
      resultado = "revision_manual"
    } else {
      resultado = "no_requiere"
    }

    // 8. Guardar con service_role (bypasa RLS)
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

    // 9. Responder al frontend
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
