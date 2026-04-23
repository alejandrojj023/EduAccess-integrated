"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { Eye, EyeOff, Volume2, User, Mail, Lock, GraduationCap, Users } from "lucide-react"

interface RegisterScreenProps {
  onSwitchToLogin: () => void
  onRegisterSuccess: () => void
}

export function RegisterScreen({ onSwitchToLogin, onRegisterSuccess }: RegisterScreenProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"teacher" | "student" | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()
  const { speak } = useAccessibility()

  const speakLocal = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "es-ES"
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) { speak("Por favor selecciona tu rol: Docente o Estudiante"); return }
    setIsLoading(true)
    const success = await register(name, email, password, role)
    if (success) { speak("Registro exitoso. Bienvenido a EduAccess."); onRegisterSuccess() }
    setIsLoading(false)
  }

  const handleReadInstructions = () => {
    speakLocal("Crear cuenta en EduAccess. Escribe tu nombre, correo y contraseña. Selecciona tu rol: Docente o Estudiante.")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">

        {/* Logo + title */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#008e92] shadow-sm">
            <img src="/2.svg" alt="EduAccess logo" className="w-full h-full object-cover" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Crear cuenta</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Únete a EduAccess</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">

          {/* Voice */}
          <button
            type="button"
            onClick={handleReadInstructions}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]"
          >
            <Volume2 className="w-4 h-4" aria-hidden="true" />
            Escuchar instrucciones
          </button>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-semibold text-foreground block">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre" className="pl-9 border-border" required />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="register-email" className="text-sm font-semibold text-foreground block">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com" className="pl-9 border-border" required />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="register-password" className="text-sm font-semibold text-foreground block">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id="register-password" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                  className="pl-9 pr-9 border-border" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <span className="text-sm font-semibold text-foreground block">Selecciona tu rol</span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "teacher" as const, label: "Docente",    Icon: GraduationCap },
                  { value: "student" as const, label: "Estudiante", Icon: Users },
                ].map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    aria-pressed={role === value}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all active:scale-[0.98] ${
                      role === value
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${role === value ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                    <span className={`text-sm font-semibold ${role === value ? "text-primary" : "text-foreground"}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !role}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Registrando..." : "Crear cuenta"}
            </button>
          </form>

          {/* Switch */}
          <div className="border-t border-border pt-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">¿Ya tienes cuenta?</p>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
