import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// ============================================================
// POST /api/register
// ============================================================
// Crea usuario en Supabase Auth + perfil en la tabla perfil.
// Usa service_role porque después de signUp con confirmación
// de correo habilitada, la sesión no se activa inmediatamente
// y auth.uid() sería null, lo que bloquea el INSERT por RLS.
//
// Body esperado:
// {
//   name: string,
//   email: string,
//   password: string,
//   role: "docente" | "alumno"
// }
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

    // Validaciones
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    if (!["docente", "alumno"].includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido" },
        { status: 400 }
      )
    }

    // 1. Crear usuario en Supabase Auth (con service_role)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar automáticamente
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // 2. Crear perfil (con service_role, bypasa RLS)
    //    Los triggers crean automáticamente:
    //      → configuracion_accesibilidad (todos)
    //      → gamificacion (solo alumnos)
    const { error: perfilError } = await supabaseAdmin
      .from("perfil")
      .insert({
        id_perfil: userId,
        correo: email,
        nombre: name,
        rol: role,
      })

    if (perfilError) {
      // Si falla el perfil, eliminar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: `Error al crear perfil: ${perfilError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId,
    })

  } catch (error) {
    console.error("Error en /api/register:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
