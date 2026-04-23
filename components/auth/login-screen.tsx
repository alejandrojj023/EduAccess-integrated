"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { Eye, EyeOff, Volume2, Mail, Lock, ArrowLeft } from "lucide-react"

interface LoginScreenProps {
  onSwitchToRegister: () => void
  onLoginSuccess: () => void
  onBack?: () => void
}

export function LoginScreen({ onSwitchToRegister, onLoginSuccess, onBack }: LoginScreenProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
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
    setError("")
    setIsLoading(true)
    const success = await login(email, password)
    if (success) {
      speak("Inicio de sesion exitoso. Bienvenido.")
      onLoginSuccess()
    } else {
      setError("Correo o contraseña incorrectos")
      speak("Error. Correo o contraseña incorrectos.")
    }
    setIsLoading(false)
  }

  const handleReadInstructions = () => {
    speakLocal("Bienvenido a EduAccess. Ingresa tu correo electrónico y contraseña para iniciar sesión.")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">

        {/* Back */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        )}

        {/* Logo + title */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#008e92] shadow-sm">
            <img src="/2.svg" alt="EduAccess logo" className="w-full h-full object-cover" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">EduAccess</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Bienvenido de nuevo</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">

          {/* Voice button */}
          <button
            type="button"
            onClick={handleReadInstructions}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]"
          >
            <Volume2 className="w-4 h-4" aria-hidden="true" />
            Escuchar instrucciones
          </button>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-foreground block">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="pl-9 border-border"
                  required
                  aria-describedby="email-hint"
                />
              </div>
              <p id="email-hint" className="sr-only">Ingresa tu dirección de correo electrónico</p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-foreground block">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  className="pl-9 pr-9 border-border"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>

          {/* Divider */}
          <div className="border-t border-border pt-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">¿No tienes cuenta?</p>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              Registrarse
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
