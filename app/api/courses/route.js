import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const gradeMap = {
  "1er Grado": "1",
  "2do Grado": "2",
  "3er Grado": "3",
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
    const { titulo, descripcion, grade } = body

    if (!titulo || !descripcion || !grade) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const gradoNum = gradeMap[grade]
    if (!gradoNum) {
      return NextResponse.json({ error: "Grado inválido" }, { status: 400 })
    }

    const { data: grupoExistente } = await supabaseAdmin
      .from("grupo")
      .select("id_grupo")
      .eq("grado", gradoNum)
      .eq("id_docente", user.id)
      .single()

    let idGrupo

    if (grupoExistente) {
      idGrupo = grupoExistente.id_grupo
    } else {
      const { data: nuevoGrupo, error: grupoError } = await supabaseAdmin
        .from("grupo")
        .insert({ grado: gradoNum, id_docente: user.id, nombre: grade })
        .select("id_grupo")
        .single()

      if (grupoError || !nuevoGrupo) {
        return NextResponse.json(
          { error: grupoError?.message ?? "Error al crear grupo" },
          { status: 500 }
        )
      }
      idGrupo = nuevoGrupo.id_grupo
    }

    const { data: curso, error: cursoError } = await supabaseAdmin
      .from("curso")
      .insert({
        titulo,
        descripcion,
        id_grupo: idGrupo,
        publicado: true,
      })
      .select("id_curso")
      .single()

    if (cursoError || !curso) {
      return NextResponse.json(
        { error: cursoError?.message ?? "Error al crear curso" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id_curso: curso.id_curso })
  } catch (error) {
    console.error("Error en /api/courses:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
