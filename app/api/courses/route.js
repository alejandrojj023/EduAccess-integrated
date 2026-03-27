import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

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
    const { titulo, descripcion, id_grupo, materia, materia_personalizada } = body

    if (!titulo || !descripcion || !id_grupo) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    if (materia === "otra" && !materia_personalizada?.trim()) {
      return NextResponse.json({ error: "Escribe el nombre de la materia" }, { status: 400 })
    }

    const cursoData = {
      titulo,
      descripcion,
      id_grupo,
      publicado: true,
      materia: materia ?? "español",
    }
    if (materia === "otra") cursoData.materia_personalizada = materia_personalizada.trim()

    const { data: curso, error: cursoError } = await supabaseAdmin
      .from("curso")
      .insert(cursoData)
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
