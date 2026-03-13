"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"

// ============================================================
// TIPOS
// ============================================================
// Se mantienen los mismos tipos que el prototipo para que
// los componentes existentes no se rompan.
// ============================================================

type UserRole = "teacher" | "student"

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  needsTest: boolean | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================================
// MAPEO DE ROLES
// ============================================================
// Frontend usa "teacher"/"student" (inglés, por los componentes).
// Base de datos usa "docente"/"alumno" (español, por el esquema).
// ============================================================

const rolToFrontend: Record<string, UserRole> = {
  docente: "teacher",
  alumno: "student",
}

const rolToDb: Record<UserRole, string> = {
  teacher: "docente",
  student: "alumno",
}

// ============================================================
// HELPER: Cargar perfil + estado del test en paralelo
// ============================================================
async function loadUserAndTest(
  userId: string
): Promise<{ user: User | null; needsTest: boolean | null }> {
  const [perfilResult, testResult] = await Promise.all([
    supabase
      .from("perfil")
      .select("id_perfil, nombre, correo, rol")
      .eq("id_perfil", userId)
      .single(),
    supabase
      .from("test_inicial")
      .select("id_test_inicial")
      .eq("id_alumno", userId)
      .limit(1),
  ])

  if (perfilResult.error || !perfilResult.data) {
    return { user: null, needsTest: null }
  }

  const role: UserRole = rolToFrontend[perfilResult.data.rol] ?? "student"
  const user: User = {
    id: perfilResult.data.id_perfil,
    name: perfilResult.data.nombre,
    email: perfilResult.data.correo,
    role,
  }

  const needsTest =
    role === "student" ? ((testResult.data?.length ?? 0) === 0) : null

  return { user, needsTest }
}

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsTest, setNeedsTest] = useState<boolean | null>(null)

  // ----------------------------------------------------------
  // Escuchar cambios de sesión (login, logout, refresh token)
  // ----------------------------------------------------------
  useEffect(() => {
    // 1. Obtener sesión actual al cargar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { user, needsTest } = await loadUserAndTest(session.user.id)
        setUser(user)
        setNeedsTest(needsTest)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // 2. Suscribirse a cambios de auth (solo SIGNED_OUT)
    // login() y register() manejan el estado tras un inicio de sesión
    // para evitar doble llamada a loadUserAndTest
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          setUser(null)
          setNeedsTest(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ----------------------------------------------------------
  // LOGIN
  // ----------------------------------------------------------
  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) return false

    const { user, needsTest } = await loadUserAndTest(data.user.id)
    if (!user) return false

    setUser(user)
    setNeedsTest(needsTest)

    return true
  }

  // ----------------------------------------------------------
  // REGISTRO
  // ----------------------------------------------------------
  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ): Promise<boolean> => {
    // 1. Crear usuario + perfil vía API Route (usa service_role)
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role: rolToDb[role],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error en registro:", errorData.error)
      return false
    }

    // 2. Iniciar sesión automáticamente después del registro
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError || !loginData.user) return false

    // 3. Construir perfil con los datos que ya tenemos (sin DB call extra)
    setUser({
      id: loginData.user.id,
      name,
      email,
      role,
    })
    setNeedsTest(role === "student" ? true : null)

    return true
  }

  // ----------------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------------
  const logout = () => {
    supabase.auth.signOut()
    setUser(null)
    setNeedsTest(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        needsTest,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
