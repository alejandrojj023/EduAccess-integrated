"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft, ChevronRight, CheckCircle2,
  Mic, Image as ImageIcon, ListOrdered, HelpCircle, PencilLine, Volume2,
  BookOpen, Youtube, Search, Paperclip, ExternalLink, FileText, RotateCcw, PlayCircle, AlignLeft,
  ChevronDown, ChevronUp,
} from "lucide-react"
import { TextoConGlosario, type GlosarioEntry } from "@/components/ui/texto-con-glosario"

interface Activity {
  id_actividad: string
  titulo: string
  tipo: string
  nivel_dificultad: number
  orden: number
  completada: boolean
}

interface LessonMaterial {
  material_lectura: string | null
  material_audiovisual: string | null
  material_pdf_url: string | null
  material_pdf_titulo: string | null
}

interface StudentLessonProps {
  lessonId: string | null
  lessonName: string | null
  onSelectActivity: (id: string) => void
  onStartLesson?: () => void
  onBack: () => void
}

const TIPO_META: Record<string, { label: string; Icon: React.ElementType; gradient: string; iconColor: string }> = {
  identificacion:         { label: "Identificación",    Icon: ImageIcon,   gradient: "from-blue-400 to-blue-600",    iconColor: "text-white" },
  reconocimiento_sonidos: { label: "Sonidos",           Icon: Volume2,     gradient: "from-violet-400 to-violet-600", iconColor: "text-white" },
  secuenciacion:          { label: "Secuenciación",     Icon: ListOrdered, gradient: "from-amber-400 to-orange-500",  iconColor: "text-white" },
  seleccion_guiada:       { label: "Opción múltiple",   Icon: HelpCircle,  gradient: "from-primary to-primary/80",   iconColor: "text-primary-foreground" },
  respuesta_corta:        { label: "Respuesta corta",   Icon: PencilLine,  gradient: "from-emerald-400 to-teal-500", iconColor: "text-white" },
  respuesta_oral:         { label: "Oral / Voz",        Icon: Mic,         gradient: "from-rose-400 to-rose-600",    iconColor: "text-white" },
  completar_oracion:      { label: "Completar oración", Icon: AlignLeft,   gradient: "from-cyan-400 to-cyan-600",    iconColor: "text-white" },
  sopa_letras:            { label: "Sopa de letras",    Icon: Search,      gradient: "from-indigo-400 to-indigo-600", iconColor: "text-white" },
}

const diffMeta = (n: number) =>
  n === 1
    ? { label: "Fácil",   cls: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" }
    : n === 2
      ? { label: "Medio",   cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" }
      : { label: "Difícil", cls: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" }

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim()
      if (id.length === 11) return `https://www.youtube.com/embed/${id}`
    }
    if (parsed.hostname.includes("youtube.com")) {
      const watchId = parsed.searchParams.get("v")
      if (watchId && watchId.length === 11) return `https://www.youtube.com/embed/${watchId}`
      const pathParts = parsed.pathname.split("/")
      const embedIndex = pathParts.findIndex((p) => p === "embed" || p === "shorts")
      if (embedIndex > -1 && pathParts[embedIndex + 1]?.length === 11)
        return `https://www.youtube.com/embed/${pathParts[embedIndex + 1]}`
    }
    return null
  } catch { return null }
}

export function StudentLesson({ lessonId, lessonName, onSelectActivity, onStartLesson, onBack }: StudentLessonProps) {
  const { user } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [material, setMaterial] = useState<LessonMaterial>({
    material_lectura: null, material_audiovisual: null,
    material_pdf_url: null, material_pdf_titulo: null,
  })
  const [loading, setLoading] = useState(true)
  const [readingExpanded, setReadingExpanded] = useState(true)
  const [glosario, setGlosario] = useState<GlosarioEntry[]>([])

  useEffect(() => {
    if (!user || !lessonId) return
    load()
  }, [user, lessonId])

  async function load() {
    setLoading(true)
    const [leccionRes, { data: acts }, { data: glosarioData }] = await Promise.all([
      supabase.from("leccion").select("material_lectura, material_audiovisual, material_pdf_url, material_pdf_titulo").eq("id_leccion", lessonId!).single(),
      supabase.from("actividad").select("id_actividad, titulo, tipo, nivel_dificultad, orden").eq("id_leccion", lessonId!).eq("publicado", true).order("orden", { ascending: true }),
      supabase.from("glosario").select("palabra, definicion").eq("id_leccion", lessonId!),
    ])
    if (!leccionRes.error && leccionRes.data) {
      const d = leccionRes.data as any
      setMaterial({ material_lectura: d.material_lectura ?? null, material_audiovisual: d.material_audiovisual ?? null, material_pdf_url: d.material_pdf_url ?? null, material_pdf_titulo: d.material_pdf_titulo ?? null })
    }
    setGlosario(glosarioData ?? [])
    if (!acts) { setLoading(false); return }
    const actIds = acts.map(a => a.id_actividad)
    const { data: intentos } = await supabase.from("intento_actividad").select("id_actividad").eq("id_alumno", user!.id).in("id_actividad", actIds).not("puntaje_total", "is", null)
    const completedSet = new Set(intentos?.map(i => i.id_actividad) ?? [])
    setActivities(acts.map(a => ({ ...a, completada: completedSet.has(a.id_actividad) })))
    setLoading(false)
  }

  const completadas = activities.filter(a => a.completada).length
  const embedUrl = material.material_audiovisual ? getYouTubeEmbedUrl(material.material_audiovisual) : null
  const pct = activities.length > 0 ? Math.round((completadas / activities.length) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center gap-4">
          <button
            onClick={onBack}
            aria-label="Volver a las lecciones"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.97] shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black text-foreground truncate leading-tight">{lessonName}</h1>
            <p className="text-xs text-muted-foreground">{completadas} de {activities.length} actividades</p>
          </div>
          {activities.length > 0 && (
            <div className="shrink-0 flex items-center gap-2">
              <div className="hidden sm:block w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-black text-primary">{pct}%</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-4 space-y-3">

        {/* Video */}
        {!loading && material.material_audiovisual && (
          <section aria-label="Video de la lección">
            <div className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/40">
                <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                  <Youtube className="w-4 h-4 text-white" aria-hidden />
                </div>
                <div>
                  <p className="font-black text-foreground text-sm">Material Audiovisual</p>
                  <p className="text-xs text-foreground/70">Video de apoyo</p>
                </div>
              </div>
              <div className="p-3">
                {embedUrl ? (
                  <div className="relative w-full overflow-hidden rounded-2xl border border-border" style={{ height: "calc(100vh - 290px)" }}>
                    <iframe src={embedUrl} title="Video de la lección" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full" />
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-5 flex items-center gap-3">
                    <ExternalLink className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">No se pudo incrustar el video automáticamente.</p>
                      <a href={material.material_audiovisual} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary font-bold text-sm hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir video
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* PDF */}
        {!loading && material.material_pdf_url && (
          <section aria-label="Material adjunto en PDF">
            <div className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/40">
                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                  <Paperclip className="w-4 h-4 text-white" aria-hidden />
                </div>
                <div>
                  <p className="font-black text-foreground text-sm">{material.material_pdf_titulo || "Material Adjunto"}</p>
                  <p className="text-xs text-foreground/70">Documento de apoyo</p>
                </div>
              </div>
              <div className="p-5">
                <div className="rounded-2xl border overflow-hidden bg-muted/20">
                  <iframe src={material.material_pdf_url} title={material.material_pdf_titulo || "PDF"} className="w-full h-[480px]" />
                </div>
                <a href={material.material_pdf_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-primary font-bold text-sm hover:underline">
                  <FileText className="w-3.5 h-3.5" /> Abrir / descargar PDF
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Lectura */}
        {!loading && material.material_lectura && (
          <section aria-label="Material de lectura">
            <div className="overflow-hidden rounded-3xl border-2 border-primary/20 bg-primary/5 shadow-sm">
              <button
                className="w-full flex items-center justify-between gap-3 px-5 py-4 border-b border-primary/15 text-left hover:bg-primary/10 transition-colors"
                onClick={() => setReadingExpanded(v => !v)}
                aria-expanded={readingExpanded}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-primary-foreground" aria-hidden />
                  </div>
                  <div>
                    <p className="font-black text-foreground text-sm">Material de Lectura</p>
                    <p className="text-xs text-muted-foreground">Lee antes de comenzar las actividades</p>
                  </div>
                </div>
                {readingExpanded
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
              {readingExpanded && (
                <div className="px-5 py-5">
                  <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                    <TextoConGlosario texto={material.material_lectura} glosario={glosario} />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* CTA comenzar */}
        {!loading && activities.length > 0 && onStartLesson && (
          <div className="flex justify-center">
            <button
              onClick={onStartLesson}
              className="flex items-center gap-2.5 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97]"
            >
              {completadas === activities.length
                ? <><RotateCcw className="w-5 h-5" /> Repetir lección</>
                : completadas === 0
                  ? <><PlayCircle className="w-5 h-5" /> Comenzar lección</>
                  : <><PlayCircle className="w-5 h-5" /> Continuar lección</>}
            </button>
          </div>
        )}

        {/* Activities */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-3xl bg-muted animate-pulse" />)}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Esta lección aún no tiene actividades disponibles.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Actividades</h2>
            <ul className="space-y-3 list-none p-0">
              {activities.map((act, i) => {
                const meta = TIPO_META[act.tipo] ?? TIPO_META.seleccion_guiada
                const diff = diffMeta(act.nivel_dificultad)
                const { Icon } = meta
                return (
                  <li key={act.id_actividad}>
                    <article>
                      <div
                        className="w-full rounded-3xl border-2 border-border bg-card p-5 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className="relative shrink-0">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-sm`}>
                              <Icon className={`w-6 h-6 ${meta.iconColor}`} aria-hidden />
                            </div>
                            {act.completada && (
                              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow border-2 border-card">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground text-sm truncate">{act.titulo}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">{meta.label}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${diff.cls}`}>{diff.label}</span>
                              {act.completada && (
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">✓ Completada</span>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}
