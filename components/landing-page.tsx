"use client"

import { useState } from "react"
import {
  BookOpen, GraduationCap, Users,
  Volume2, Eye, Type, Sparkles, ChevronRight,
  ImageIcon, ArrowUpDown, CheckSquare, Mic, PenLine, Search,
  Gamepad2, BarChart3, Heart, Star, Settings, Accessibility,
} from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { SpeakableText, useSpeakOnHover } from "@/components/ui/accessible-tooltip"

/* ─────────────────────────────────── DATA ─────────────────────────────────── */

const ACTIVITY_TYPES = [
  { Icon: ImageIcon,    color: "bg-chart-1",   name: "Identificación de imágenes",   desc: "Observa la imagen y selecciona la respuesta correcta" },
  { Icon: Volume2,      color: "bg-chart-2",   name: "Reconocimiento de sonidos",    desc: "Escucha y arma la oración con las palabras correctas" },
  { Icon: ArrowUpDown,  color: "bg-chart-3",   name: "Ordenar secuencias",           desc: "Arrastra las imágenes para ordenar la historia" },
  { Icon: CheckSquare,  color: "bg-chart-4",   name: "Opción múltiple",              desc: "Selecciona la respuesta correcta entre varias opciones" },
  { Icon: Mic,          color: "bg-primary",   name: "Respuesta por voz",            desc: "Escucha la pregunta y responde hablando" },
  { Icon: PenLine,      color: "bg-teal-500",  name: "Completar oración",            desc: "Observa el patrón y completa con la palabra correcta" },
  { Icon: Search,       color: "bg-pink-500",  name: "Sopa de letras",               desc: "Encuentra las palabras ocultas en la cuadrícula" },
]

const BENEFITS = [
  { Icon: BookOpen,      title: "Diseño Universal para el Aprendizaje", desc: "Currículo sin barreras que se adapta a cada estudiante" },
  { Icon: Volume2,       title: "Lectura por voz integrada",            desc: "Todo el contenido puede ser escuchado con un clic" },
  { Icon: Gamepad2,      title: "Actividades interactivas",             desc: "7 tipos de actividades que hacen el aprendizaje divertido" },
  { Icon: BarChart3,     title: "Seguimiento de alumnos",               desc: "Ver cuando un alumno completa una lección y métricas generales." },
  { Icon: Heart,         title: "Evaluación sin frustración",           desc: "Sistema de estrellas que premia el esfuerzo, no castiga el error" },
  { Icon: Accessibility, title: "Accesibilidad total",                  desc: "Alto contraste, texto ajustable e interfaz simplificada" },
  { Icon: Star,          title: "Gamificación motivadora",              desc: "5 niveles, estrellas y rachas que mantienen la motivación" },
  { Icon: Settings,      title: "Personalización por alumno",           desc: "Cada estudiante configura su experiencia según sus necesidades" },
]

const FAQS = [
  {
    q: "¿Qué es EduAccess?",
    a: "EduAccess es una plataforma educativa web diseñada para niños de primero a tercero de primaria. Integra herramientas de accesibilidad como lectura por voz, alto contraste y texto ajustable para que todos los estudiantes puedan aprender sin barreras.",
  },
  {
    q: "¿Para qué edades está diseñado?",
    a: "Está diseñado para niños de 6 a 9 años (primero, segundo y tercer grado de primaria), con especial atención a estudiantes con baja visión y Trastorno del Procesamiento Auditivo Central (TPAC).",
  },
  {
    q: "¿Qué es el Diseño Universal para el Aprendizaje (DUA)?",
    a: "Es un enfoque pedagógico que busca que el currículo no genere barreras. EduAccess aplica el DUA ofreciendo múltiples formas de representación (texto, voz, imágenes), múltiples formas de acción (clic, arrastrar, hablar) y múltiples formas de motivación (estrellas, niveles, retroalimentación positiva).",
  },
  {
    q: "¿Cómo se adapta a niños con baja visión o TPAC?",
    a: "Para baja visión: alto contraste, texto ajustable y fuentes grandes. Para TPAC: lectura por voz integrada, instrucciones auditivas, palabras clave con definiciones instantáneas y actividades que no dependen exclusivamente del canal auditivo.",
  },
  {
    q: "¿Cómo funciona el sistema de estrellas y niveles?",
    a: "Cada lección completada otorga de 0 a 5 estrellas según el rendimiento. Las estrellas se acumulan y desbloquean 5 niveles: Explorador, Aprendiz, Aventurero, Experto y Maestro. El sistema premia el esfuerzo y la persistencia, no castiga el error.",
  },
]

/* ─────────────────────────────── COMPONENT ────────────────────────────────── */

interface LandingPageProps {
  onStudentLogin: () => void
  onTeacherLogin: () => void
}

export function LandingPage({ onStudentLogin, onTeacherLogin }: LandingPageProps) {
  const [isPaused, setIsPaused] = useState(false)
  const speakStudent = useSpeakOnHover("Soy Estudiante. Accede a tus cursos, actividades y sigue tu progreso.")
  const speakTeacher = useSpeakOnHover("Soy Docente. Crea cursos, gestiona lecciones y ve el avance de tus alumnos.")

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden flex flex-col">

      {/* ── Decorative background blobs ──────────────────── */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/5 blur-2xl" />
      </div>

      {/* ── Top bar ───────────────────────────────────────── */}
      <header className="relative z-10 flex justify-start items-center px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-sm bg-[#008e92]">
            <img src="/2.svg" alt="EduAccess logo" className="w-full h-full object-cover" aria-hidden="true" />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">EduAccess</span>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pb-16 pt-4">

        {/* Hero logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-xl scale-110" aria-hidden="true" />
            <div className="relative w-24 h-24 rounded-[1.75rem] overflow-hidden flex items-center justify-center shadow-2xl bg-[#008e92]">
              <img src="/2.svg" alt="EduAccess logo" className="w-full h-full object-cover" aria-hidden="true" />
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

        {/* Role cards */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl" role="group" aria-label="Selecciona tu rol para ingresar">
          <button
            onClick={onStudentLogin}
            {...speakStudent}
            className="group flex-1 relative overflow-hidden rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-xl transition-all duration-300 active:scale-[0.98] cursor-pointer text-left"
            aria-label="Ingresar como estudiante"
          >
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-7 flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-sm">
                <GraduationCap className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">Soy Estudiante</p>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">Accede a tus cursos, actividades y sigue tu progreso</p>
              </div>
              <div className="flex items-center gap-1 text-primary text-sm font-semibold mt-auto">
                Ingresar
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 duration-200" aria-hidden="true" />
              </div>
            </div>
          </button>

          <button
            onClick={onTeacherLogin}
            {...speakTeacher}
            className="group flex-1 relative overflow-hidden rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-xl transition-all duration-300 active:scale-[0.98] cursor-pointer text-left"
            aria-label="Ingresar como docente"
          >
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-7 flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-sm">
                <Users className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">Soy Docente</p>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">Crea cursos, gestiona lecciones y ve el avance de tus alumnos</p>
              </div>
              <div className="flex items-center gap-1 text-primary text-sm font-semibold mt-auto">
                Ingresar
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 duration-200" aria-hidden="true" />
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN 1 — Tipos de Actividades (Carrusel)
      ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 bg-background py-16 sm:py-20" aria-label="Tipos de actividades">
        <style>{`
          @keyframes marquee {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
        `}</style>

        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground">Tipos de Actividades</h2>
            <p className="text-muted-foreground mt-2">Actividades interactivas diseñadas para el aprendizaje accesible</p>
          </div>
        </div>

        {/* Marquee — full width, overflow hidden */}
        <div
          className="overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <div
            className="flex gap-6"
            style={{
              width: "max-content",
              animation: "marquee 35s linear infinite",
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            {/* Render twice for seamless loop */}
            {[...ACTIVITY_TYPES, ...ACTIVITY_TYPES].map(({ Icon, color, name, desc }, i) => (
              <div
                key={i}
                className="w-[280px] bg-card border border-border rounded-2xl p-6 shadow-sm flex-shrink-0"
              >
                <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="w-7 h-7 text-white" aria-hidden="true" />
                </div>
                <p className="font-semibold text-lg text-foreground leading-snug">{name}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN 2 — Beneficios (Grid)
      ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 bg-muted/30 py-16 sm:py-20" aria-label="Beneficios de EduAccess">
        <div className="max-w-6xl mx-auto px-4">
          {/* Heading */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Beneficios</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              EduAccess es una plataforma diseñada para que todos los niños aprendan sin barreras
            </p>
          </div>

          {/* Grid */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0">
            {BENEFITS.map(({ Icon, title, desc }) => (
              <li
                key={title}
                className="flex flex-col gap-3 pl-4 border-l-[3px] border-primary"
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <Icon className="w-10 h-10 text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-base text-foreground leading-snug">{title}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN 3 — Preguntas Frecuentes (Acordeón)
      ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 bg-background py-16 sm:py-20" aria-label="Preguntas frecuentes">
        <div className="max-w-3xl mx-auto px-4">
          {/* Heading */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground">Preguntas Frecuentes</h2>
            <p className="text-muted-foreground mt-2">Todo lo que necesitas saber sobre EduAccess</p>
          </div>

          <Accordion type="multiple" className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border">
                <AccordionTrigger className="font-medium text-base text-left text-foreground hover:no-underline hover:text-primary">
                  <SpeakableText as="span" speakText={faq.q}>{faq.q}</SpeakableText>
                </AccordionTrigger>
                <AccordionContent>
                  <SpeakableText as="p" speakText={faq.a} className="text-foreground/80 text-sm leading-relaxed">
                    {faq.a}
                  </SpeakableText>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="relative z-10 bg-background border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} EduAccess · Plataforma Educativa Accesible
      </footer>
    </div>
  )
}
