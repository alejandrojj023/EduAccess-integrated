"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { Eye, EyeOff, BookOpen, Volume2, Mail, Lock } from "lucide-react"

interface LoginScreenProps {
  onSwitchToRegister: () => void
  onLoginSuccess: () => void
}

export function LoginScreen({ onSwitchToRegister, onLoginSuccess }: LoginScreenProps) {
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
    speakLocal("Bienvenido a EduAccess. Ingresa tu correo electrónico y contraseña para iniciar sesión. Si no tienes cuenta, presiona el botón Registrarse.")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-2 border-primary/20">
        <CardHeader className="text-center space-y-4 pb-2">
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
            type="button"
            variant="outline"
            size="lg"
            className="w-full h-14 text-lg border-2"
            onClick={handleReadInstructions}
          >
            <Volume2 className="w-6 h-6 mr-3" aria-hidden="true" />
            Escuchar instrucciones
          </Button>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-lg font-semibold text-foreground block">
                Correo electronico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="h-14 text-lg pl-14 border-2"
                  required
                  aria-describedby="email-hint"
                />
              </div>
              <p id="email-hint" className="sr-only">Ingresa tu direccion de correo electronico</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-lg font-semibold text-foreground block">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  className="h-14 text-lg pl-14 pr-14 border-2"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="w-6 h-6" />
                  ) : (
                    <Eye className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div 
                role="alert" 
                className="p-4 bg-destructive/10 border-2 border-destructive rounded-lg text-destructive text-lg font-medium"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-16 text-xl font-bold"
              disabled={isLoading}
            >
              {isLoading ? "Ingresando..." : "Iniciar sesion"}
            </Button>
          </form>

          <div className="text-center pt-4 border-t-2 border-border">
            <p className="text-lg text-muted-foreground mb-3">
              ¿No tienes cuenta?
            </p>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-14 text-lg border-2"
              onClick={onSwitchToRegister}
            >
              Registrarse
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
