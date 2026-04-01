"use client"

import { BookOpen, GraduationCap, Users } from "lucide-react"

interface LandingPageProps {
  onStudentLogin: () => void
  onTeacherLogin: () => void
}

export function LandingPage({ onStudentLogin, onTeacherLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Logo y nombre */}
      <div className="flex flex-col items-center mb-12">
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mb-4 shadow-lg">
          <BookOpen className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">EduAccess</h1>
        <p className="text-muted-foreground text-lg mt-2 text-center max-w-xs">
          Plataforma educativa accesible para todos
        </p>
      </div>

      {/* Botones de acceso */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        {/* Estudiante */}
        <button
          onClick={onStudentLogin}
          className="flex-1 flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 active:scale-[0.97] px-8 py-12 cursor-pointer group"
          aria-label="Ingresar como estudiante"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">Soy Estudiante</p>
            <p className="text-muted-foreground mt-1">Accede a tus cursos y actividades</p>
          </div>
        </button>

        {/* Docente */}
        <button
          onClick={onTeacherLogin}
          className="flex-1 flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 active:scale-[0.97] px-8 py-12 cursor-pointer group"
          aria-label="Ingresar como docente"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <Users className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">Soy Docente</p>
            <p className="text-muted-foreground mt-1">Gestiona tus cursos y alumnos</p>
          </div>
        </button>
      </div>
    </div>
  )
}
