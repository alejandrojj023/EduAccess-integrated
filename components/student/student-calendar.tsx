"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { supabase } from "@/lib/supabase"
import { fechaTijuana } from "@/lib/utils"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Volume2,
  Star,
  BookOpen,
} from "lucide-react"
import { VoiceAssistant } from "@/components/student/voice-assistant"

interface StudentCalendarProps {
  onBack: () => void
}

interface LessonEntry {
  fecha: string
  lessonTitle: string
  estrellas: number | null
}

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]
const WEEKDAYS_ES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]

function starColor(estrellas: number | null): string {
  if (estrellas === null) return "bg-muted-foreground/40"
  if (estrellas >= 4)    return "bg-success"
  if (estrellas >= 2.5)  return "bg-accent"
  return "bg-destructive"
}

export function StudentCalendar({ onBack }: StudentCalendarProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()

  const today    = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => fechaTijuana(today), [today])

  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [loading, setLoading] = useState(true)
  const [completions, setCompletions] = useState<LessonEntry[]>([])

  // ── Month cache: avoids re-fetching already loaded months ──
  const cache = useRef<Record<string, LessonEntry[]>>({})

  useEffect(() => {
    if (!user) return

    const key = `${year}-${month}`
    if (cache.current[key]) {
      setCompletions(cache.current[key])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const fetchMonth = async () => {
      // Margen hasta 8:59am UTC del día siguiente = 11:59pm Tijuana UTC-8 (invierno)
      const start = new Date(year, month, 1, 0, 0, 0).toISOString()
      const end   = new Date(year, month + 1, 1, 8, 59, 59).toISOString()

      const { data, error } = await supabase
        .from("intento_leccion")
        .select("fecha_completado, estrellas, leccion:id_leccion(titulo)")
        .eq("id_alumno", user.id)
        .gte("fecha_completado", start)
        .lte("fecha_completado", end)
        .not("fecha_completado", "is", null)
        .order("fecha_completado", { ascending: true })

      if (cancelled) return

      if (!error && data) {
        const entries: LessonEntry[] = (data as any[]).map((row) => ({
          fecha:       fechaTijuana(row.fecha_completado),
          lessonTitle: row.leccion?.titulo ?? "Lección",
          estrellas:   row.estrellas ?? null,
        }))
        cache.current[key] = entries
        setCompletions(entries)
      }
      setLoading(false)
    }

    fetchMonth()
    return () => { cancelled = true }
  }, [user, year, month])

  // ── Calendar grid ─────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay    = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  // ── Index by date ─────────────────────────────────────────
  const byDay = useMemo(() => {
    const map: Record<string, LessonEntry[]> = {}
    for (const c of completions) {
      if (!map[c.fecha]) map[c.fecha] = []
      map[c.fecha].push(c)
    }
    return map
  }, [completions])

  const dayStr = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // ── Stats ─────────────────────────────────────────────────
  const conEstrellas  = completions.filter(c => c.estrellas !== null)
  const avgEstrellas  = conEstrellas.length > 0
    ? (conEstrellas.reduce((s, c) => s + (c.estrellas ?? 0), 0) / conEstrellas.length).toFixed(1)
    : null
  const diasActivos   = Object.keys(byDay).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Volver"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-sm font-black text-foreground leading-none">Mi Calendario</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Lecciones completadas por día</p>
            </div>
          </div>
          {settings.voiceEnabled && (
            <button
              type="button"
              onClick={() => speak(`Calendario de lecciones. ${MONTHS_ES[month]} ${year}. Completaste ${completions.length} lección${completions.length !== 1 ? "es" : ""} este mes.`)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Escuchar</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-7 space-y-6">

        {/* Hero */}
        <section aria-labelledby="hero-calendario">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 shadow-xl shadow-primary/20">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-xl" aria-hidden="true" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center shadow-lg" aria-hidden="true">
                <Calendar className="w-7 h-7 text-white" aria-hidden="true" />
              </div>
              <div>
                <h2 id="hero-calendario" className="text-lg font-black text-white leading-tight">{MONTHS_ES[month]} {year}</h2>
                <p className="text-sm text-white/80 mt-0.5">
                  {completions.length} lección{completions.length !== 1 ? "es" : ""} completada{completions.length !== 1 ? "s" : ""} este mes
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* ── Month calendar ───────────────────────────── */}
        <section aria-label={`Calendario de ${MONTHS_ES[month]} ${year}`}>
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-2">
              <nav aria-label="Navegación de meses" className="flex items-center justify-between">
                <Button variant="outline" size="lg" className="h-11 w-11 p-0" onClick={prevMonth} aria-label="Mes anterior">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <CardTitle className="text-xl text-center" aria-live="polite">
                  {MONTHS_ES[month]} {year}
                </CardTitle>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 w-11 p-0"
                  onClick={nextMonth}
                  aria-label="Mes siguiente"
                  disabled={year === today.getFullYear() && month === today.getMonth()}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </nav>
            </CardHeader>

            <CardContent>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS_ES.map((d) => (
                  <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">
                    <abbr title={d}>{d}</abbr>
                  </div>
                ))}
              </div>

              {/* Calendar cells */}
              {loading ? (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="rounded-xl min-h-[56px] bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Días de ${MONTHS_ES[month]} ${year}`}>
                  {calendarDays.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} role="gridcell" aria-hidden="true" />
                    const ds      = dayStr(day)
                    const entries = byDay[ds] ?? []
                    const isToday = ds === todayStr
                    const count   = entries.length

                    return (
                      <button
                        key={ds}
                        role="gridcell"
                        onClick={() => {
                          if (count > 0) speak(`${day} de ${MONTHS_ES[month]}: ${count} lección${count > 1 ? "es" : ""} completada${count > 1 ? "s" : ""}`)
                        }}
                        className={`relative flex flex-col items-center justify-start p-2 rounded-xl min-h-[56px] transition-all border-2 ${
                          isToday
                            ? "border-primary bg-primary/10 shadow-sm"
                            : count > 0
                              ? "border-success/60 bg-success/5 hover:border-success"
                              : "border-transparent hover:border-border"
                        }`}
                        aria-label={`${day} de ${MONTHS_ES[month]}${count > 0 ? `, ${count} lección${count > 1 ? "es" : ""} completada${count > 1 ? "s" : ""}` : ""}`}
                        aria-current={isToday ? "date" : undefined}
                      >
                        {isToday && (
                          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                        )}
                        <span className={`text-base font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                          {day}
                        </span>
                        {count > 0 && (
                          <div className="flex gap-0.5 mt-1 flex-wrap justify-center" aria-hidden="true">
                            {entries.slice(0, 3).map((e, j) => (
                              <span key={j} className={`w-2.5 h-2.5 rounded-full ${starColor(e.estrellas)}`} />
                            ))}
                            {count > 3 && (
                              <span className="text-xs text-muted-foreground font-bold leading-none">+{count - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Legend */}
              <div role="note" aria-label="Leyenda de colores" className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
                {[
                  { color: "bg-success",             label: "4-5 estrellas" },
                  { color: "bg-accent",              label: "2.5-3.9 estrellas" },
                  { color: "bg-destructive",         label: "Menos de 2.5 estrellas" },
                  { color: "bg-muted-foreground/40", label: "Sin estrellas" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`w-3 h-3 rounded-full ${color}`} aria-hidden="true" />
                    {label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── Month summary ─────────────────────────────── */}
        <section aria-label="Resumen del mes">
          {loading ? (
            <ul className="grid grid-cols-3 gap-4 list-none p-0" aria-busy="true">
              {[1, 2, 3].map(i => (
                <li key={i}>
                  <div className="rounded-2xl border-2 border-border bg-card shadow-md p-5 flex flex-col items-center gap-2 animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-muted" />
                    <div className="h-7 w-12 rounded-md bg-muted" />
                    <div className="h-3 w-20 rounded-md bg-muted" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-3 gap-4 list-none p-0">
              {[
                {
                  label: "Completadas",
                  value: completions.length,
                  icon: BookOpen,
                  description: `Completaste ${completions.length} lección${completions.length !== 1 ? "es" : ""} este mes.`,
                },
                {
                  label: "Promedio",
                  value: avgEstrellas ?? "—",
                  icon: Star,
                  description: avgEstrellas
                    ? `Tu promedio de estrellas este mes es ${avgEstrellas} de 5.`
                    : "Aún no tienes lecciones con estrellas este mes.",
                },
                {
                  label: "Días activos",
                  value: diasActivos,
                  icon: Calendar,
                  description: `Estuviste activo ${diasActivos} día${diasActivos !== 1 ? "s" : ""} este mes.`,
                },
              ].map(({ label, value, icon: Icon, description }) => (
                <li key={label}>
                  <Card
                    className="border-2 shadow-md text-center h-full transition-transform duration-200 hover:scale-105 cursor-default"
                    onMouseEnter={() => speak(description)}
                  >
                    <CardContent className="pt-5 pb-4">
                      <Icon className="w-6 h-6 text-primary mx-auto mb-2" aria-hidden="true" />
                      <dl>
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="text-2xl font-bold text-foreground mt-0.5">{value}</dd>
                      </dl>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <VoiceAssistant
        subpageName="calendario"
        subpageMessage={
          loading ? undefined
          : `¡Aquí está tu calendario de aventuras! En ${MONTHS_ES[month]}, ` +
            (completions.length === 0
              ? "aún no tienes lecciones completadas. ¡Anímate a hacer una hoy!"
              : `completaste ${completions.length} ${completions.length === 1 ? "lección" : "lecciones"} ` +
                `en ${diasActivos} ${diasActivos === 1 ? "día" : "días"} distintos. ` +
                (avgEstrellas ? `Tu promedio de estrellas fue de ${avgEstrellas}. ` : "") +
                "¡Sigue así, lo estás haciendo genial!")
        }
        firstName=""
        estrellasTotales={0}
        nivelActual={0}
        nivelNombre=""
        streakDays={0}
        courses={[]}
        onNavigate={() => {}}
        onBack={onBack}
      />
    </div>
  )
}
