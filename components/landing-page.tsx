"use client"

import React from "react"
import {
  BookOpen, GraduationCap, Users,
  Volume2, Eye, Type, Star,
  ImageIcon, ArrowUpDown, CheckSquare, Mic, PenLine, Search,
  Gamepad2, BarChart3, Accessibility, Trophy, Flame, Sparkles, ChevronRight,
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
  { Icon: ImageIcon,   name: "Identificación",   desc: "Observa la imagen y elige la respuesta correcta" },
  { Icon: Volume2,     name: "Sonidos",           desc: "Escucha y arma la oración correcta" },
  { Icon: ArrowUpDown, name: "Secuencias",        desc: "Arrastra y ordena la historia" },
  { Icon: CheckSquare, name: "Opción múltiple",   desc: "Elige la respuesta entre varias opciones" },
  { Icon: Mic,         name: "Respuesta oral",    desc: "Habla tu respuesta en voz alta" },
  { Icon: PenLine,     name: "Completar oración", desc: "Completa con la palabra correcta" },
  { Icon: Type,        name: "Respuesta corta",   desc: "Escribe tu respuesta con tus propias palabras" },
  { Icon: Search,      name: "Sopa de letras",    desc: "Encuentra las palabras ocultas" },
]

const FEATURES = [
  {
    title: "Lecciones que parecen juegos",
    desc: "Actividades con imágenes, sonidos y arrastrar objetos hacen que aprender sea entretenido. Cada reto completado acerca al alumno a su siguiente estrella.",
    icons: [ImageIcon, Volume2, ArrowUpDown, CheckSquare],
    flip: false,
  },
  {
    title: "Accesible para cada alumno",
    desc: "Texto más grande, alto contraste y lectura en voz alta: actívalos cuando los necesites. EduAccess se adapta a cada forma de aprender.",
    icons: [Volume2, Eye, Type, Accessibility],
    flip: true,
  },
  {
    title: "Todo a la mano para tu clase",
    desc: "Crea cursos, organiza lecciones y sigue el avance de cada alumno desde un panel claro. Sin complicaciones, sin papeles.",
    icons: [BarChart3, Users, BookOpen, Trophy],
    flip: false,
  },
]

const FAQS = [
  {
    q: "¿Qué es EduAccess?",
    a: "Es una plataforma para aprender en primaria con juegos, voz y letras grandes. Está hecha para que todos puedan usarla.",
  },
  {
    q: "¿Para qué edades es?",
    a: "Para niñas y niños de unos 6 a 9 años (1.º, 2.º y 3.º de primaria). También ayuda si ves u oyes mejor con apoyos extra.",
  },
  {
    q: "¿Puedo usar voz y letras grandes?",
    a: "Sí. Puedes activar lectura en voz alta, alto contraste y tamaño de texto más grande desde los ajustes de accesibilidad.",
  },
  {
    q: "¿Qué son las estrellas?",
    a: "Cada lección puede darte estrellas según cómo vaya. Sirven para ver tu avance y motivarte; equivocarse forma parte de aprender.",
  },
  {
    q: "¿Qué significa que siga el DUA?",
    a: "Significa que hay más de una forma de ver, escuchar y responder, para que nadie se quede fuera por cómo aprende mejor.",
  },
]

/* ─────────────────────────────── COMPONENT ────────────────────────────────── */

interface LandingPageProps {
  onStudentLogin: () => void
  onTeacherLogin: () => void
  onScreeningTest?: () => void
}

export function LandingPage({ onStudentLogin, onTeacherLogin, onScreeningTest }: LandingPageProps) {
  const speakStudent = useSpeakOnHover(
    "Soy estudiante. Entra para ver tus lecciones, jugar actividades y ganar estrellas.",
  )
  const speakTeacher = useSpeakOnHover(
    "Soy docente. Entra para crear cursos, lecciones y ver el avance de tus alumnos.",
  )

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-neutral-800">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[#008e92]">
              <img src="/2.svg" alt="" className="h-full w-full object-cover" width={36} height={36} />
            </div>
            <span className="text-lg font-bold tracking-tight text-neutral-900">EduAccess</span>
          </div>
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTeacherLogin}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={onStudentLogin}
              className="rounded-xl bg-[#008e92] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#007c80] active:scale-[0.98]"
            >
              Comenzar gratis
            </button>
          </nav>
        </div>
      </header>

      <main id="contenido-principal">

        {/* ── HERO ── */}
        <section className="py-20 sm:py-32">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid items-center gap-16 lg:grid-cols-2">

              {/* Left */}
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#008e92]/20 bg-[#008e92]/6 px-3 py-1 text-xs font-semibold tracking-wide text-[#007578]">
                  <Sparkles className="h-3 w-3" />
                  Para 1.º a 3.º de primaria
                </div>

                <h1 className="text-[2.75rem] font-bold leading-[1.15] tracking-tight text-neutral-900 sm:text-5xl lg:text-[3.25rem]">
                  Aprender de forma{" "}
                  <span className="text-[#008e92]">accesible</span>
                  {" "}y divertida
                </h1>

                <p className="mt-6 text-lg leading-relaxed text-neutral-500">
                  Actividades con voz, imágenes y letras grandes para que ningún alumno se quede atrás. Los docentes tienen todo a la mano.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onStudentLogin}
                    {...speakStudent}
                    aria-label="Soy estudiante"
                    className="group flex items-center gap-2 rounded-xl bg-[#008e92] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#007c80] hover:shadow-md active:scale-[0.98]"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Soy estudiante
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onTeacherLogin}
                    {...speakTeacher}
                    aria-label="Soy docente"
                    className="group flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm active:scale-[0.98]"
                  >
                    <Users className="h-4 w-4" />
                    Soy docente
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href="/test"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#008e92]/30 bg-[#008e92]/6 px-4 py-2.5 text-sm font-semibold text-[#007578] transition-all hover:border-[#008e92]/50 hover:bg-[#008e92]/10"
                  >
                    <Accessibility className="h-4 w-4" />
                    Test de accesibilidad
                  </a>
                  {onScreeningTest && (
                    <button
                      type="button"
                      onClick={onScreeningTest}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition-all hover:border-amber-400 hover:bg-amber-100 active:scale-[0.98]"
                    >
                      <Eye className="h-4 w-4" />
                      Test de tamizaje
                    </button>
                  )}
                </div>
              </div>

              {/* Right — refined card */}
              <div className="flex justify-center lg:justify-end">
                <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  {/* Card header */}
                  <div className="border-b border-neutral-100 bg-neutral-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Tu progreso hoy</p>
                  </div>
                  {/* Progress row */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#008e92]/10">
                        <BookOpen className="h-5 w-5 text-[#008e92]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-1.5 flex justify-between text-sm">
                          <span className="font-semibold text-neutral-800">Lección 3</span>
                          <span className="font-semibold text-[#008e92]">60%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full w-[60%] rounded-full bg-[#008e92]" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Divider */}
                  <div className="mx-5 border-t border-neutral-100" />
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-px bg-neutral-100 border-y border-neutral-100">
                    {[
                      { Icon: Flame, value: "5",  label: "racha",     color: "text-orange-400" },
                      { Icon: Star,  value: "12", label: "estrellas", color: "text-amber-400"  },
                      { Icon: Trophy,value: "3",  label: "logros",    color: "text-[#008e92]"  },
                    ].map(({ Icon, value, label, color }) => (
                      <div key={label} className="flex flex-col items-center gap-0.5 bg-white py-4">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <span className={`text-lg font-bold ${color}`}>{value}</span>
                        <span className="text-[11px] text-neutral-400">{label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Activity chips */}
                  <div className="flex flex-wrap gap-2 px-5 py-4">
                    {[ImageIcon, Volume2, CheckSquare, Mic, Search].map((Icon, i) => (
                      <div
                        key={i}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 transition-colors hover:border-[#008e92]/30 hover:bg-[#008e92]/5"
                      >
                        <Icon className="h-4 w-4 text-neutral-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="border-y border-neutral-100 bg-neutral-50 py-10" aria-label="Estadísticas">
          <div className="mx-auto max-w-4xl px-6">
            <ul className="flex flex-wrap justify-center gap-10 sm:gap-20" role="list">
              {[
                { value: "7",    label: "tipos de actividad" },
                { value: "3",    label: "grados de primaria"  },
                { value: "100%", label: "accesible con voz"   },
                { value: "∞",    label: "estrellas por ganar" },
              ].map(({ value, label }) => (
                <li key={label} className="flex flex-col items-center gap-1">
                  <span className="text-3xl font-bold text-[#008e92]">{value}</span>
                  <span className="text-sm text-neutral-400">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── FEATURE SECTIONS ── */}
        {FEATURES.map(({ title, desc, icons, flip }, idx) => (
          <section
            key={title}
            className={`py-20 sm:py-28 ${idx % 2 === 1 ? "bg-neutral-50" : "bg-white"} border-b border-neutral-100`}
          >
            <div className="mx-auto max-w-5xl px-6">
              <div className={`flex flex-col items-center gap-14 lg:flex-row lg:items-center lg:gap-20 ${flip ? "lg:flex-row-reverse" : ""}`}>

                {/* Icon grid */}
                <div className="grid w-full max-w-[220px] shrink-0 grid-cols-2 gap-3" aria-hidden="true">
                  {icons.map((Icon, i) => (
                    <div
                      key={i}
                      className="flex h-24 items-center justify-center rounded-2xl border border-neutral-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      <Icon className="h-9 w-9 text-[#008e92]" />
                    </div>
                  ))}
                </div>

                {/* Text */}
                <div className="max-w-lg">
                  <h2 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
                    {title}
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-neutral-500">{desc}</p>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* ── ACTIVITY GRID ── */}
        <section className="bg-white py-20 sm:py-28" aria-labelledby="actividades-heading">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-14 text-center">
              <h2 id="actividades-heading" className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                ¿Qué actividades hay?
              </h2>
              <p className="mt-3 mx-auto max-w-lg text-lg text-neutral-500">
                Ocho tipos de ejercicio, cada uno con su mecánica propia.
              </p>
            </div>

            <ul
              className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4"
              role="list"
            >
              {ACTIVITY_TYPES.map(({ Icon, name, desc }) => (
                <li key={name} className="min-w-0">
                  <article className="flex h-full flex-col rounded-xl border border-neutral-150 bg-neutral-50 p-5 transition-all duration-200 hover:bg-white hover:shadow-md hover:border-neutral-200 motion-reduce:transition-none">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#008e92]/10">
                      <Icon className="h-5 w-5 text-[#008e92]" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-800">{name}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-400">{desc}</p>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className="border-y border-neutral-100 bg-neutral-50 py-20 sm:py-28" aria-label="Comienza ahora">
          <div className="mx-auto max-w-xl px-6 text-center">
            <div className="mb-5 flex justify-center gap-1" aria-hidden="true">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Empieza gratis hoy mismo
            </h2>
            <p className="mt-4 text-lg text-neutral-500">
              Sin costo, sin instalaciones. Listo para usar ahora mismo.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onStudentLogin}
                className="flex items-center gap-2 rounded-xl bg-[#008e92] px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-[#007c80] hover:shadow-md active:scale-[0.98]"
              >
                <GraduationCap className="h-4 w-4" />
                Empezar como estudiante
              </button>
              <button
                type="button"
                onClick={onTeacherLogin}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-7 py-3 text-sm font-semibold text-neutral-700 transition-all hover:border-neutral-300 hover:shadow-sm active:scale-[0.98]"
              >
                <Users className="h-4 w-4" />
                Soy docente
              </button>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-white py-20 sm:py-28" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-2xl px-6">
            <div className="mb-12 text-center">
              <h2 id="faq-heading" className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                Preguntas frecuentes
              </h2>
              <p className="mt-2 text-neutral-400">Respuestas para niños, familias y maestros.</p>
            </div>

            <Accordion type="multiple" className="w-full divide-y divide-neutral-100">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border-none py-1"
                >
                  <AccordionTrigger className="py-4 text-left text-[15px] font-semibold text-neutral-800 hover:no-underline hover:text-[#008e92] [&[data-state=open]]:text-[#008e92]">
                    <SpeakableText as="span" speakText={faq.q}>{faq.q}</SpeakableText>
                  </AccordionTrigger>
                  <AccordionContent>
                    <SpeakableText as="p" speakText={faq.a} className="pb-4 text-sm leading-relaxed text-neutral-500">
                      {faq.a}
                    </SpeakableText>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-100 bg-neutral-50 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="mb-3 flex justify-center items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-[#008e92]">
              <img src="/2.svg" alt="" className="h-full w-full object-cover" width={32} height={32} />
            </div>
            <span className="text-sm font-bold tracking-tight text-neutral-700">EduAccess</span>
          </div>
          <p className="text-sm text-neutral-400">
            © {new Date().getFullYear()} EduAccess — Aprender con apoyo, a tu manera.
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-neutral-300">
            Activa voz, contraste y texto grande desde los ajustes de accesibilidad.
          </p>
        </div>
      </footer>
    </div>
  )
}
