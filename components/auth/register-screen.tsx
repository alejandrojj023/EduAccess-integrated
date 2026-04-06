"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { Eye, EyeOff, Volume2, User, Mail, Lock, GraduationCap, Users, ArrowLeft, Check } from "lucide-react"

interface RegisterScreenProps {
  onSwitchToLogin: () => void
  onRegisterSuccess: () => void
}

export function RegisterScreen({ onSwitchToLogin, onRegisterSuccess }: RegisterScreenProps) {
  const [name, setName]                 = useState("")
  const [email, setEmail]               = useState("")
  const [password, setPassword]         = useState("")
  const [role, setRole]                 = useState<"teacher" | "student" | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const { register } = useAuth()
  const { speak }    = useAccessibility()

  const speakLocal = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = "es-ES"; u.rate = 0.9
      window.speechSynthesis.speak(u)
    }
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!role) {
      speak("Por favor selecciona tu rol: Docente o Estudiante")
      return
    }
    setIsLoading(true)
    const success = await register(name, email, password, role)
    if (success) {
      speak("Registro exitoso. Bienvenido a EduAccess.")
      onRegisterSuccess()
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4 overflow-hidden">

      {/* Blobs decorativos */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Volver */}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
          aria-label="Volver al inicio de sesión"
        >
          <ArrowLeft className="w-4 h-4" />
          Ya tengo cuenta
        </button>

        {/* Card */}
        <div className="bg-card border-2 border-border rounded-3xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="relative inline-block mb-5">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg scale-110" aria-hidden="true" />
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#008e92] flex items-center justify-center shadow-lg">
                <img src="/2.svg" alt="EduAccess" className="w-full h-full object-cover" aria-hidden="true" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Crear cuenta</h1>
            <p className="text-muted-foreground text-sm mt-1">Únete a EduAccess gratis</p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8 space-y-5">

            {/* Escuchar instrucciones */}
            <button
              type="button"
              onClick={() => speakLocal("Crear cuenta en EduAccess. Escribe tu nombre completo, correo electrónico y contraseña. Selecciona tu rol: Docente o Estudiante. Luego presiona Crear cuenta.")}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              Escuchar instrucciones
            </button>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Nombre */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-semibold text-foreground block">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="h-12 pl-10 border-2 rounded-xl bg-background focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="register-email" className="text-sm font-semibold text-foreground block">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="h-12 pl-10 border-2 rounded-xl bg-background focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <label htmlFor="register-password" className="text-sm font-semibold text-foreground block">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-12 pl-10 pr-11 border-2 rounded-xl bg-background focus:ring-2 focus:ring-primary/30"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Rol */}
              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground block">
                  ¿Cuál es tu rol?
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: "teacher" as const, label: "Docente",    Icon: GraduationCap },
                    { id: "student" as const, label: "Estudiante", Icon: Users },
                  ] as const).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRole(id)}
                      className={`relative p-4 rounded-2xl border-2 flex flex-col items-center gap-2.5 transition-all ${
                        role === id
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      }`}
                      aria-pressed={role === id}
                    >
                      {role === id && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" aria-hidden="true" />
                        </span>
                      )}
                      <Icon className={`w-8 h-8 ${role === id ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                      <span className={`text-sm font-bold ${role === id ? "text-primary" : "text-foreground"}`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 rounded-xl font-bold text-base shadow-md mt-1"
                disabled={isLoading || !role}
              >
                {isLoading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>

            {/* Divider + login */}
            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">¿Ya tienes cuenta?</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full h-11 rounded-xl border-2 border-border text-sm font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}