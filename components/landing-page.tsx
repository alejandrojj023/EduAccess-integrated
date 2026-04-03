"use client"

import {
  BookOpen, GraduationCap, Users,
  Volume2, Eye, Type, Sparkles, ChevronRight,
} from "lucide-react"

interface LandingPageProps {
  onStudentLogin: () => void
  onTeacherLogin: () => void
}

export function LandingPage({ onStudentLogin, onTeacherLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">

      {/* ── Decorative background blobs ──────────────────── */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/5 blur-2xl" />
      </div>

      {/* ── Top bar ───────────────────────────────────────── */}
      <header className="relative z-10 flex justify-start items-center px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">EduAccess</span>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-16">

        {/* Hero logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-xl scale-110" aria-hidden="true" />
            <div className="relative w-24 h-24 bg-primary rounded-[1.75rem] flex items-center justify-center shadow-2xl">
              <BookOpen className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl font-black text-foreground tracking-tight text-center">
            EduAccess
          </h1>
          <p className="text-muted-foreground text-lg mt-3 text-center max-w-sm leading-relaxed">
            Plataforma educativa diseñada para <span className="text-primary font-semibold">todos</span>,
            con herramientas de accesibilidad integradas
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-5 justify-center" aria-label="Características de accesibilidad">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              Lectura por Voz
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              Alto Contraste
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              <Type className="w-3.5 h-3.5" aria-hidden="true" />
              Texto Ajustable
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Interfaz Adaptable
            </span>
          </div>
        </div>

        {/* Role selection cards */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl" role="group" aria-label="Selecciona tu rol para ingresar">

          {/* Student */}
          <button
            onClick={onStudentLogin}
            className="group flex-1 relative overflow-hidden rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-xl transition-all duration-300 active:scale-[0.98] cursor-pointer text-left"
            aria-label="Ingresar como estudiante"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            <div className="relative p-7 flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-sm">
                <GraduationCap
                  className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">Soy Estudiante</p>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  Accede a tus cursos, actividades y sigue tu progreso
                </p>
              </div>
              <div className="flex items-center gap-1 text-primary text-sm font-semibold mt-auto">
                Ingresar
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 duration-200" aria-hidden="true" />
              </div>
            </div>
          </button>

          {/* Teacher */}
          <button
            onClick={onTeacherLogin}
            className="group flex-1 relative overflow-hidden rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-xl transition-all duration-300 active:scale-[0.98] cursor-pointer text-left"
            aria-label="Ingresar como docente"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            <div className="relative p-7 flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-sm">
                <Users
                  className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">Soy Docente</p>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  Crea cursos, gestiona lecciones y ve el avance de tus alumnos
                </p>
              </div>
              <div className="flex items-center gap-1 text-primary text-sm font-semibold mt-auto">
                Ingresar
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 duration-200" aria-hidden="true" />
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}
