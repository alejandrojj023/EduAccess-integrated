"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { Eye, EyeOff, BookOpen, Volume2, User, Mail, Lock, GraduationCap, Users } from "lucide-react"

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

  const handleReadInstructions = () => {
    speakLocal("Crear cuenta en EduAccess. Escribe tu nombre completo, correo electrónico y contraseña. Selecciona tu rol: Docente o Estudiante. Luego presiona Crear cuenta.")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-2 border-primary/20">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-20 h-20 bg-primary rounded-2xl flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-primary-foreground" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Crear Cuenta</h1>
            <p className="text-lg text-muted-foreground mt-2">Unete a EduAccess</p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-5 pt-4">
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
              <label htmlFor="name" className="text-lg font-semibold text-foreground block">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="h-14 text-lg pl-14 border-2"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="register-email" className="text-lg font-semibold text-foreground block">
                Correo electronico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="h-14 text-lg pl-14 border-2"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="register-password" className="text-lg font-semibold text-foreground block">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crea una contraseña"
                  className="h-14 text-lg pl-14 pr-14 border-2"
                  required
                  minLength={6}
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

            <div className="space-y-3">
              <span className="text-lg font-semibold text-foreground block">
                Selecciona tu rol
              </span>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`p-6 rounded-xl border-3 flex flex-col items-center gap-3 transition-all ${
                    role === "teacher"
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }`}
                  aria-pressed={role === "teacher"}
                >
                  <GraduationCap className={`w-10 h-10 ${role === "teacher" ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                  <span className={`text-lg font-semibold ${role === "teacher" ? "text-primary" : "text-foreground"}`}>
                    Docente
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`p-6 rounded-xl border-3 flex flex-col items-center gap-3 transition-all ${
                    role === "student"
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }`}
                  aria-pressed={role === "student"}
                >
                  <Users className={`w-10 h-10 ${role === "student" ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                  <span className={`text-lg font-semibold ${role === "student" ? "text-primary" : "text-foreground"}`}>
                    Estudiante
                  </span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-16 text-xl font-bold"
              disabled={isLoading || !role}
            >
              {isLoading ? "Registrando..." : "Crear cuenta"}
            </Button>
          </form>

          <div className="text-center pt-4 border-t-2 border-border">
            <p className="text-lg text-muted-foreground mb-3">
              ¿Ya tienes cuenta?
            </p>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-14 text-lg border-2"
              onClick={onSwitchToLogin}
            >
              Iniciar sesion
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
