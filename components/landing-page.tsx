"use client"

import {
  BookOpen, GraduationCap, Users,
  Volume2, Eye, Type, Sparkles, ChevronRight, Star,
  ImageIcon, ArrowUpDown, CheckSquare, Mic, PenLine, Search,
  Gamepad2, BarChart3, Heart, Accessibility,
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
  { Icon: ImageIcon,    color: "bg-chart-1",   ring: "ring-chart-1/20",   name: "Identificación de imágenes",   desc: "Observa la imagen y selecciona la respuesta correcta" },
  { Icon: Volume2,      color: "bg-chart-2",   ring: "ring-chart-2/20",   name: "Reconocimiento de sonidos",    desc: "Escucha y arma la oración con las palabras correctas" },
  { Icon: ArrowUpDown,  color: "bg-chart-3",   ring: "ring-chart-3/20",   name: "Ordenar secuencias",           desc: "Arrastra las imágenes para ordenar la historia" },
  { Icon: CheckSquare,  color: "bg-chart-4",   ring: "ring-chart-4/20",   name: "Opción múltiple",              desc: "Selecciona la respuesta correcta entre varias opciones" },
  { Icon: Mic,          color: "bg-primary",   ring: "ring-primary/20",   name: "Respuesta por voz",            desc: "Escucha la pregunta y responde hablando" },
  { Icon: PenLine,      color: "bg-teal-500",  ring: "ring-teal-500/20",  name: "Completar oración",            desc: "Observa el patrón y completa con la palabra correcta" },
  { Icon: Search,       color: "bg-pink-500",  ring: "ring-pink-500/20",  name: "Sopa de letras",               desc: "Encuentra las palabras ocultas en la cuadrícula" },
]

const BENEFITS = [
  { Icon: BookOpen,      title: "Aprende a tu ritmo",           desc: "Lecciones claras para 1.º a 3.º de primaria, sin prisas." },
  { Icon: Volume2,       title: "Te lo leemos en voz alta",     desc: "Instrucciones y textos que puedes escuchar cuando quieras." },
  { Icon: Gamepad2,      title: "Juegos que enseñan",           desc: "Varias actividades para leer, escuchar, ordenar y más." },
  { Icon: BarChart3,     title: "Todo claro para docentes",     desc: "Ve el avance y organiza cursos sin complicaciones." },
  { Icon: Heart,         title: "Estrellas que animan",         desc: "Premiamos el esfuerzo: practicar también cuenta." },
  { Icon: Accessibility, title: "Tu pantalla, a tu manera",   desc: "Alto contraste, texto más grande y ayudas visibles." },
]

const FAQS = [
  {
    q: "¿Qué es EduAccess?",
    a: "Es una página para aprender en primaria con juegos, voz y letras grandes. Está hecha para que todos puedan usarla.",
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
}

export function LandingPage({ onStudentLogin, onTeacherLogin }: LandingPageProps) {
  const speakStudent = useSpeakOnHover(
    "Soy estudiante. Entra para ver tus lecciones, jugar actividades y ganar estrellas.",
  )
  const speakTeacher = useSpeakOnHover(
    "Soy docente. Entra para crear cursos, lecciones y ver el avance de tus alumnos.",
  )

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-chart-2/12 via-background to-chart-3/10"
      />
      <div aria-hidden="true" className="pointer-events-none fixed -top-20 right-[-10%] -z-10 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none fixed top-1/3 left-[-5%] -z-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-[#008e92] shadow-md ring-2 ring-chart-2/35">
              <img src="/2.svg" alt="" className="h-full w-full object-cover" width={40} height={40} />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">EduAccess</span>
          </div>
        </div>
      </header>

      <main id="contenido-principal" className="relative">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
            {/* Columna valor */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/30 px-3 py-1 text-sm font-semibold text-accent-foreground">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Para primaria
                </span>
                <span className="text-sm font-medium text-primary">Accesible y divertida</span>
              </div>
              <h1 className="font-serif mt-4 text-[2rem] font-semibold leading-[1.15] tracking-tight text-foreground text-balance sm:text-5xl lg:text-[2.85rem]">
                Aprender también puede ser{" "}
                <span className="text-primary">¡genial!</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Juegos de lectura y actividades para 1.º a 3.º grado: voz, colores claros y letras grandes cuando las necesitas. Los docentes tienen todo a la mano para acompañar el avance.
              </p>

              <div
                className="mt-6 flex flex-wrap gap-2.5"
                aria-label="Herramientas de accesibilidad"
              >
                {[
                  { Icon: Volume2, label: "Te leemos en voz", className: "bg-chart-1/15 border-chart-1/25 text-foreground" },
                  { Icon: Eye, label: "Alto contraste", className: "bg-chart-4/12 border-chart-4/25 text-foreground" },
                  { Icon: Type, label: "Texto más grande", className: "bg-chart-3/15 border-chart-3/25 text-foreground" },
                  { Icon: Sparkles, label: "Pantalla amigable", className: "bg-chart-2/20 border-chart-2/30 text-foreground" },
                ].map(({ Icon, label, className }) => (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm ${className}`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </div>

              <div
                className="relative mt-10 hidden overflow-hidden rounded-3xl border-2 border-primary/15 bg-gradient-to-br from-primary/10 via-card to-accent/15 p-8 shadow-sm lg:block"
                aria-hidden="true"
              >
                <Star className="absolute right-4 top-4 h-6 w-6 fill-chart-2 text-chart-2/90" />
                <Star className="absolute bottom-4 left-1 h-5 w-5 fill-accent text-accent/80" />
                <BookOpen className="absolute -right-4 -top-4 h-36 w-36 text-primary/10" />
                <div className="relative z-10 max-w-md">
                  <p className="font-serif text-xl font-semibold leading-snug text-foreground drop-shadow-sm">
                    Aquí el esfuerzo cuenta: ganas estrellas, subes de nivel y aprendes a tu ritmo.
                  </p>
                  <p className="mt-3 text-sm font-medium text-accent-foreground drop-shadow-sm">
                    Sin prisas, con apoyo cuando lo pides
                  </p>
                </div>
              </div>
            </div>

            {/* Columna acceso */}
            <div className="lg:sticky lg:top-24">
              <div className="rounded-3xl border-2 border-primary/15 bg-card/95 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:p-8">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">¡Entra y juega a aprender!</h2>
                  <span className="hidden sm:inline-flex" aria-hidden="true">
                    <Star className="h-5 w-5 fill-chart-2 text-chart-2" />
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Toca tu rol (estudiante o docente).</p>

                <div className="mt-6 flex flex-col gap-3" role="group" aria-label="Elige cómo entrar">
                  <button
                    type="button"
                    onClick={onStudentLogin}
                    {...speakStudent}
                    className="group flex w-full min-h-[3.5rem] items-center justify-between gap-4 rounded-2xl border-2 border-chart-3/40 bg-chart-3/10 px-4 py-4 text-left transition-all hover:border-chart-3/60 hover:bg-chart-3/15 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-colors"
                    aria-label="Soy estudiante: entrar a mis lecciones"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chart-3 text-white shadow-sm">
                        <GraduationCap className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold leading-snug text-foreground">Soy estudiante</div>
                        <div className="text-sm text-muted-foreground">Mis lecciones, retos y estrellas</div>
                      </div>
                    </div>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-chart-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={onTeacherLogin}
                    {...speakTeacher}
                    className="group flex w-full min-h-[3.5rem] items-center justify-between gap-4 rounded-2xl border-2 border-chart-4/40 bg-chart-4/10 px-4 py-4 text-left transition-all hover:border-chart-4/55 hover:bg-chart-4/15 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-colors"
                    aria-label="Soy docente: entrar a gestionar cursos"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chart-4 text-white shadow-sm">
                        <Users className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold leading-snug text-foreground">Soy docente</div>
                        <div className="text-sm text-muted-foreground">Cursos, lecciones y tu clase</div>
                      </div>
                    </div>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-chart-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <a
                    href="/test"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    <Accessibility className="w-4 h-4" />
                    Tomar test de accesibilidad
                  </a>
                </div>
                
                <div className="mt-6 flex justify-center">
                  <img 
                    src="/classroom.webp" 
                    alt="Aula con estudiantes y docentes" 
                    className="h-auto max-h-40 w-full rounded-2xl object-cover shadow-lg ring-2 ring-primary/10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <section
          className="border-t border-border/60 bg-gradient-to-b from-muted/50 to-muted/25 py-14 sm:py-20"
          aria-labelledby="actividades-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <header className="mb-10 sm:mb-12">
              <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
                <Star className="h-6 w-6 fill-chart-2 text-chart-2" />
                <Star className="h-4 w-4 fill-primary/80 text-primary" />
              </div>
              <h2
                id="actividades-heading"
                className="font-serif mt-3 text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl"
              >
                ¿Qué retos puedes encontrar aquí?
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Siete ejercicios distintos: cada uno con su color para encontrarlo fácil y pasos claros.
              </p>
            </header>

            <ul
              className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3 [&>li:last-child]:lg:col-span-full [&>li:last-child]:lg:flex [&>li:last-child]:lg:justify-center [&>li:last-child>article]:lg:max-w-md"
              role="list"
            >
              {ACTIVITY_TYPES.map(({ Icon, color, ring, name, desc }) => (
                <li key={name} className="min-w-0">
                  <article className="flex h-full min-h-[180px] flex-col rounded-2xl border-2 border-border/70 bg-card p-5 shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-shadow">
                    <div
                      className={`mb-3 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${color} shadow-md ring-4 ${ring}`}
                    >
                      <Icon className="h-7 w-7 text-white drop-shadow-sm" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold leading-snug text-foreground">{name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-14 sm:py-20" aria-labelledby="beneficios-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <header className="mb-10 max-w-2xl sm:mb-12">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-sm font-bold text-primary">
                <Heart className="h-3.5 w-3.5 fill-primary/30" aria-hidden="true" />
                ¿Por qué nos gusta?
              </p>
              <h2
                id="beneficios-heading"
                className="font-serif mt-3 text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl"
              >
                Cosas buenas para ti y para tu clase
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed sm:text-lg">
                Menos trabas para aprender y más claridad para quien guía.
              </p>
            </header>

            <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map(({ Icon, title, desc }) => (
                <li
                  key={title}
                  className="rounded-2xl border-2 border-border/60 bg-card p-5 shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-shadow"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 ring-2 ring-primary/15">
                    <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold leading-snug text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="border-t border-border/60 bg-muted/35 py-14 sm:py-20"
          aria-labelledby="faq-heading"
        >
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <header className="mb-8 text-center sm:mb-10">
              <h2 id="faq-heading" className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Dudas frecuentes
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Respuestas sencillas para niños, familias y maestros.
              </p>
            </header>

            <Accordion type="multiple" className="w-full rounded-2xl border-2 border-border/70 bg-card px-3 shadow-md sm:px-4">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-border/80 last:border-b-0">
                  <AccordionTrigger className="py-4 text-left text-[15px] font-medium text-foreground hover:no-underline hover:text-primary [&[data-state=open]]:text-primary">
                    <SpeakableText as="span" speakText={faq.q}>
                      {faq.q}
                    </SpeakableText>
                  </AccordionTrigger>
                  <AccordionContent>
                    <SpeakableText as="p" speakText={faq.a} className="pb-4 text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </SpeakableText>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-muted/30 py-10">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-sm font-bold text-foreground">
            <span className="mr-1.5 inline-block align-middle" aria-hidden="true">
              <Star className="inline h-4 w-4 fill-chart-2 text-chart-2" />
            </span>
            © {new Date().getFullYear()} EduAccess
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Aprender con apoyo: en la app puedes activar voz, contraste y texto más grande cuando quieras.
          </p>
        </div>
      </footer>
    </div>
  )
}
