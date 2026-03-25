"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft, ChevronRight, CheckCircle2,
  Mic, Image as ImageIcon, List, HelpCircle, PencilLine, Volume2,
  BookOpen, Youtube, Search, Paperclip, ExternalLink, FileText,
} from "lucide-react"

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
  onBack: () => void
}

const TIPO_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  identificacion:        { label: "Identificación",   Icon: ImageIcon,  color: "bg-blue-100   text-blue-700"   },
  reconocimiento_sonidos:{ label: "Sonidos",          Icon: Volume2,    color: "bg-purple-100 text-purple-700" },
  secuenciacion:         { label: "Secuenciación",    Icon: List,       color: "bg-orange-100 text-orange-700" },
  seleccion_guiada:      { label: "Opción múltiple",  Icon: HelpCircle, color: "bg-teal-100   text-teal-700"   },
  respuesta_corta:       { label: "Respuesta corta",  Icon: PencilLine, color: "bg-yellow-100 text-yellow-700" },
  respuesta_oral:        { label: "Oral / Voz",       Icon: Mic,        color: "bg-green-100  text-green-700"  },
  sopa_letras:           { label: "Sopa de letras",   Icon: Search,     color: "bg-pink-100   text-pink-700"   },
}

const diffMeta = (n: number) =>
  n === 1
    ? { label: "Fácil",  cls: "text-green-700  bg-green-50  border border-green-200"  }
    : n === 2
    ? { label: "Medio",  cls: "text-yellow-700 bg-yellow-50 border border-yellow-200" }
    : { label: "Difícil",cls: "text-red-700    bg-red-50    border border-red-200"    }

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
      const embedIndex = pathParts.findIndex((part) => part === "embed" || part === "shorts")
      if (embedIndex > -1 && pathParts[embedIndex + 1]?.length === 11) {
        return `https://www.youtube.com/embed/${pathParts[embedIndex + 1]}`
      }
    }

    return null
  } catch {
    return null
  }
}

export function StudentLesson({ lessonId, lessonName, onSelectActivity, onBack }: StudentLessonProps) {
  const { user } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [material, setMaterial] = useState<LessonMaterial>({
    material_lectura: null,
    material_audiovisual: null,
    material_pdf_url: null,
    material_pdf_titulo: null,
  })
  const [loading, setLoading] = useState(true)
  const [readingExpanded, setReadingExpanded] = useState(true)

  useEffect(() => {
    if (!user || !lessonId) return
    load()
  }, [user, lessonId])

  async function load() {
    setLoading(true)

    const [leccionRes, { data: acts }] = await Promise.all([
      supabase
        .from("leccion")
        .select("material_lectura, material_audiovisual, material_pdf_url, material_pdf_titulo")
        .eq("id_leccion", lessonId!)
        .single(),
      supabase
        .from("actividad")
        .select("id_actividad, titulo, tipo, nivel_dificultad, orden")
        .eq("id_leccion", lessonId!)
        .eq("publicado", true)
        .order("orden", { ascending: true }),
    ])

    // Only set material if fetch succeeded (columns may not exist yet before SQL migration)
    if (!leccionRes.error && leccionRes.data) {
      const d = leccionRes.data as any
      setMaterial({
        material_lectura: d.material_lectura ?? null,
        material_audiovisual: d.material_audiovisual ?? null,
        material_pdf_url: d.material_pdf_url ?? null,
        material_pdf_titulo: d.material_pdf_titulo ?? null,
      })
    }

    if (!acts) { setLoading(false); return }

    // Check which activities have been completed
    const actIds = acts.map(a => a.id_actividad)
    const { data: intentos } = await supabase
      .from("intento_actividad")
      .select("id_actividad")
      .eq("id_alumno", user!.id)
      .in("id_actividad", actIds)
      .not("puntaje_total", "is", null)

    const completedSet = new Set(intentos?.map(i => i.id_actividad) ?? [])

    setActivities(acts.map(a => ({ ...a, completada: completedSet.has(a.id_actividad) })))
    setLoading(false)
  }

  const completadas = activities.filter(a => a.completada).length
  const embedUrl = material.material_audiovisual ? getYouTubeEmbedUrl(material.material_audiovisual) : null

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={onBack}
            aria-label="Volver a las lecciones"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold line-clamp-1">{lessonName}</h1>
            <p className="text-sm opacity-90">
              {completadas} de {activities.length} actividades completadas
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Material Audiovisual */}
        {!loading && material.material_audiovisual && (
          <section aria-label="Video de la lección">
            <Card className="border-2 shadow-lg overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                    <Youtube className="w-5 h-5 text-red-600" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-lg">Material Audiovisual</p>
                    <p className="text-sm text-muted-foreground">Video de apoyo para esta lección</p>
                  </div>
                </div>

                {embedUrl ? (
                  <div className="relative w-full overflow-hidden rounded-xl border" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      src={embedUrl}
                      title="Video de la lección"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      No se pudo incrustar el video automáticamente. Puedes abrirlo en una pestaña nueva.
                    </p>
                    <a
                      href={material.material_audiovisual}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      Abrir video
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Material PDF */}
        {!loading && material.material_pdf_url && (
          <section aria-label="Material adjunto en PDF">
            <Card className="border-2 shadow-lg overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Paperclip className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-lg">
                      {material.material_pdf_titulo || "Material Adjunto"}
                    </p>
                    <p className="text-sm text-muted-foreground">Documento de apoyo para esta lección</p>
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden bg-muted/30">
                  <iframe
                    src={material.material_pdf_url}
                    title={material.material_pdf_titulo || "Material PDF"}
                    className="w-full h-[520px]"
                  />
                </div>

                <a
                  href={material.material_pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  Abrir o descargar PDF
                </a>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Material de Lectura */}
        {!loading && material.material_lectura && (
          <section aria-label="Material de lectura">
            <Card className="border-2 border-primary/20 shadow-lg bg-primary/5">
              <CardContent className="p-5">
                <button
                  className="w-full flex items-center justify-between gap-3 text-left"
                  onClick={() => setReadingExpanded((v) => !v)}
                  aria-expanded={readingExpanded}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">Material de Lectura</p>
                      <p className="text-sm text-muted-foreground">Lee antes de comenzar las actividades</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xl">{readingExpanded ? "▲" : "▼"}</span>
                </button>
                {readingExpanded && (
                  <div className="mt-4 pt-4 border-t border-primary/20">
                    <p className="text-lg text-foreground leading-relaxed whitespace-pre-wrap">
                      {material.material_lectura}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {loading ? (
          <p className="text-muted-foreground py-8">Cargando actividades…</p>
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Esta lección aún no tiene actividades disponibles.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-4 list-none p-0">
            {activities.map(act => {
              const meta = TIPO_META[act.tipo] ?? TIPO_META.seleccion_guiada
              const diff = diffMeta(act.nivel_dificultad)
              const { Icon } = meta

              return (
                <li key={act.id_actividad}>
                  <article>
                    <Card
                      className={`border-2 cursor-pointer transition-all hover:border-primary/50 ${
                        act.completada ? "border-green-200 bg-green-50/30" : ""
                      }`}
                      onClick={() => onSelectActivity(act.id_actividad)}
                    >
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                          {act.completada
                            ? <CheckCircle2 className="w-6 h-6 text-green-600" />
                            : <Icon className="w-6 h-6" aria-hidden="true" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{act.titulo}</p>
                            {act.completada && (
                              <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                ✓ Completada
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{meta.label}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff.cls}`}>
                              {diff.label}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
                      </CardContent>
                    </Card>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
