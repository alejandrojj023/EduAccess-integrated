"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft, ChevronRight, CheckCircle2,
  Mic, Image as ImageIcon, List, HelpCircle, PencilLine, Volume2,
} from "lucide-react"

interface Activity {
  id_actividad: string
  titulo: string
  tipo: string
  nivel_dificultad: number
  orden: number
  completada: boolean
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
}

const diffMeta = (n: number) =>
  n === 1
    ? { label: "Fácil",  cls: "text-green-700  bg-green-50  border border-green-200"  }
    : n === 2
    ? { label: "Medio",  cls: "text-yellow-700 bg-yellow-50 border border-yellow-200" }
    : { label: "Difícil",cls: "text-red-700    bg-red-50    border border-red-200"    }

export function StudentLesson({ lessonId, lessonName, onSelectActivity, onBack }: StudentLessonProps) {
  const { user } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !lessonId) return
    load()
  }, [user, lessonId])

  async function load() {
    setLoading(true)

    const { data: acts } = await supabase
      .from("actividad")
      .select("id_actividad, titulo, tipo, nivel_dificultad, orden")
      .eq("id_leccion", lessonId!)
      .eq("publicado", true)
      .order("orden", { ascending: true })

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

      <main className="max-w-3xl mx-auto px-4 py-6">
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
