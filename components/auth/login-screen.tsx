"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { Eye, EyeOff, Volume2, Mail, Lock, ArrowLeft, AlertCircle } from "lucide-react"

interface LoginScreenProps {
  onSwitchToRegister: () => void
  onLoginSuccess: () => void
  onBack?: () => void
}

export function LoginScreen({ onSwitchToRegister, onLoginSuccess, onBack }: LoginScreenProps) {
  const [email, setEmail]               = useState("")
  const [password, setPassword]         = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState("")
  const [isLoading, setIsLoading]       = useState(false)
  const { login }  = useAuth()
  const { speak }  = useAccessibility()

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
    setError("")
    setIsLoading(true)
    const success = await login(email, password)
    if (success) {
      speak("Inicio de sesión exitoso. Bienvenido.")
      onLoginSuccess()
    } else {
      setError("Correo o contraseña incorrectos")
      speak("Error. Correo o contraseña incorrectos.")
    }
    setIsLoading(false)
  }

  return (
<<<<<<< Updated upstream
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-2 border-primary/20">
        <CardHeader className="text-center space-y-4 pb-2">
          {onBack && (
            <div className="flex justify-start -mb-2">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm"
                aria-label="Volver al inicio"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
            </div>
          )}
          <div className="mx-auto w-20 h-20 bg-primary rounded-2xl flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-primary-foreground" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">EduAccess</h1>
            <p className="text-lg text-muted-foreground mt-2">Plataforma Educativa</p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          <Button
=======
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4 overflow-hidden">

      {/* Blobs decorativos */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Volver */}
        {onBack && (
          <button
>>>>>>> Stashed changes
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </button>
        )}

        {/* Card */}
        <div className="bg-card border-2 border-border rounded-3xl shadow-2xl overflow-hidden">

          {/* Header con gradiente */}
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="relative inline-block mb-5">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg scale-110" aria-hidden="true" />
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#008e92] flex items-center justify-center shadow-lg">
                <img src="/2.svg" alt="EduAccess" className="w-full h-full object-cover" aria-hidden="true" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Bienvenido de vuelta</h1>
            <p className="text-muted-foreground text-sm mt-1">Inicia sesión en tu cuenta de EduAccess</p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8 space-y-5">

            {/* Escuchar instrucciones */}
            <button
              type="button"
              onClick={() => speakLocal("Bienvenido a EduAccess. Ingresa tu correo electrónico y contraseña para iniciar sesión.")}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
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
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="email"
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
                <label htmlFor="password" className="text-sm font-semibold text-foreground block">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    className="h-12 pl-10 pr-11 border-2 rounded-xl bg-background focus:ring-2 focus:ring-primary/30"
                    required
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

              {/* Error */}
              {error && (
                <div role="alert" className="flex items-center gap-2.5 p-3 bg-destructive/10 border-2 border-destructive/30 rounded-xl text-destructive text-sm font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 rounded-xl font-bold text-base shadow-md mt-2"
                disabled={isLoading}
              >
                {isLoading ? "Ingresando..." : "Iniciar sesión"}
              </Button>
            </form>

            {/* Divider + registro */}
            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">¿No tienes cuenta?</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={onSwitchToRegister}
              className="w-full h-11 rounded-xl border-2 border-border text-sm font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              Crear una cuenta nueva
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}