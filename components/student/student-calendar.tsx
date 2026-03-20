"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useAccessibility } from "@/lib/accessibility-context"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Volume2,
  Star,
  BookOpen,
} from "lucide-react"

interface StudentCalendarProps {
  onBack: () => void
}

interface CompletionEntry {
  fecha: string          // "YYYY-MM-DD"
  activityTitle: string
  activityType: string
  score: number | null
}

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]
const WEEKDAYS_ES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]

const typeLabel: Record<string, string> = {
  identificacion:         "Identificación de imágenes",
  reconocimiento_sonidos: "Reconocimiento de sonidos",
  secuenciacion:          "Ordenar secuencias",
  seleccion_guiada:       "Opción múltiple",
  respuesta_corta:        "Respuesta corta",
  respuesta_oral:         "Respuesta por voz",
}

function scoreColor(score: number | null): string {
  if (score === null) return "bg-muted-foreground/40"
  if (score >= 80)   return "bg-success"
  if (score >= 50)   return "bg-accent"
  return "bg-destructive"
}

export function StudentCalendar({ onBack }: StudentCalendarProps) {
  const { user } = useAuth()
  const { speak, settings } = useAccessibility()

  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const [completions, setCompletions] = useState<CompletionEntry[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // ── Fetch completions for the current month ───────────────
  useEffect(() => {
    if (!user) return
    const fetchMonth = async () => {
      setLoading(true)
      setSelectedDay(null)

      const start = new Date(year, month, 1).toISOString()
      const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

      const { data, error } = await supabase
        .from("intento_actividad")
        .select("fecha_creacion, puntaje_total, actividad:id_actividad(titulo, tipo)")
        .eq("id_alumno", user.id)
        .gte("fecha_creacion", start)
        .lte("fecha_creacion", end)
        .order("fecha_creacion", { ascending: true })

      if (!error && data) {
        const entries: CompletionEntry[] = (data as any[]).map((row) => ({
          fecha:         row.fecha_creacion.slice(0, 10),
          activityTitle: row.actividad?.titulo ?? "Actividad",
          activityType:  row.actividad?.tipo   ?? "",
          score:         row.puntaje_total,
        }))
        setCompletions(entries)
      }
      setLoading(false)
    }
    fetchMonth()
  }, [user, year, month])

  // ── Build calendar grid ────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay   = new Date(year, month, 1).getDay()   // 0=Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    // Pad to complete the last row
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  // ── Index completions by date string ─────────────────────
  const byDay = useMemo(() => {
    const map: Record<string, CompletionEntry[]> = {}
    completions.forEach((c) => {
      if (!map[c.fecha]) map[c.fecha] = []
      map[c.fecha].push(c)
    })
    return map
  }, [completions])

  const todayStr = today.toISOString().slice(0, 10)

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const selectedEntries = selectedDay ? (byDay[selectedDay] ?? []) : []
  const dayStr = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              className="h-12 w-12 p-0"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mi Calendario</h1>
              <p className="text-sm text-muted-foreground">Actividades completadas por día</p>
            </div>
          </div>
          {settings.voiceEnabled && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => speak(`Calendario de actividades. ${MONTHS_ES[month]} ${year}. Completaste ${completions.length} actividades este mes.`)}
              className="h-12"
            >
              <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
              Escuchar
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* ── Month navigation ─────────────────────────── */}
        <section aria-label={`Calendario de ${MONTHS_ES[month]} ${year}`}>
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-2">
            <nav aria-label="Navegación de meses" className="flex items-center justify-between">
              <Button
                variant="outline"
                size="lg"
                className="h-11 w-11 p-0"
                onClick={prevMonth}
                aria-label="Mes anterior"
              >
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
            <div className="grid grid-cols-7 mb-2" role="row" aria-label="Días de la semana">
              {WEEKDAYS_ES.map((d) => (
                <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2" role="columnheader">
                  <abbr title={d}>{d}</abbr>
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            {loading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground" aria-busy="true">
                Cargando...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Días de ${MONTHS_ES[month]} ${year}`}>
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} role="gridcell" aria-hidden="true" />
                  const ds      = dayStr(day)
                  const entries = byDay[ds] ?? []
                  const isToday = ds === todayStr
                  const isSel   = ds === selectedDay
                  const count   = entries.length

                  return (
                    <button
                      key={ds}
                      role="gridcell"
                      onClick={() => {
                        setSelectedDay(isSel ? null : ds)
                        if (count > 0) speak(`${day} de ${MONTHS_ES[month]}: ${count} actividad${count > 1 ? "es" : ""} completada${count > 1 ? "s" : ""}`)
                      }}
                      className={`relative flex flex-col items-center justify-start p-2 rounded-xl min-h-[56px] transition-all border-2 ${
                        isSel
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : isToday
                            ? "border-primary/60 bg-primary/5"
                            : count > 0
                              ? "border-success/60 bg-success/5 hover:border-success"
                              : "border-transparent hover:border-border"
                      }`}
                      aria-label={`${day} de ${MONTHS_ES[month]}${count > 0 ? `, ${count} actividad${count > 1 ? "es" : ""} completada${count > 1 ? "s" : ""}` : ""}`}
                      aria-pressed={isSel}
                      aria-current={isToday ? "date" : undefined}
                    >
                      <span className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                        {day}
                      </span>
                      {/* Activity dots */}
                      {count > 0 && (
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center" aria-hidden="true">
                          {entries.slice(0, 3).map((e, j) => (
                            <span
                              key={j}
                              className={`w-2 h-2 rounded-full ${scoreColor(e.score)}`}
                            />
                          ))}
                          {count > 3 && (
                            <span className="text-[9px] text-muted-foreground font-bold">+{count - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Legend */}
            <aside aria-label="Leyenda de colores" className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
              {[
                { color: "bg-success",              label: "Calificación alta (≥80%)" },
                { color: "bg-accent",               label: "Calificación media (50-79%)" },
                { color: "bg-destructive",          label: "Calificación baja (<50%)" },
                { color: "bg-muted-foreground/40",  label: "Sin calificación" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`w-3 h-3 rounded-full ${color}`} aria-hidden="true" />
                  {label}
                </div>
              ))}
            </aside>
          </CardContent>
        </Card>
        </section>

        {/* ── Month summary ─────────────────────────────── */}
        {!loading && (
          <section aria-label="Resumen del mes">
          <ul className="grid grid-cols-3 gap-4 list-none p-0">
            {[
              { label: "Completadas",  value: completions.length,  icon: BookOpen },
              {
                label: "Promedio",
                value: completions.filter(c => c.score !== null).length > 0
                  ? Math.round(completions.filter(c => c.score !== null).reduce((s, c) => s + (c.score ?? 0), 0) / completions.filter(c => c.score !== null).length) + "%"
                  : "—",
                icon: Star,
              },
              {
                label: "Días activos",
                value: Object.keys(byDay).length,
                icon: Calendar,
              },
            ].map(({ label, value, icon: Icon }) => (
              <li key={label}>
              <Card className="border-2 shadow-md text-center h-full">
                <CardContent className="pt-5 pb-4">
                  <Icon className="w-6 h-6 text-primary mx-auto mb-2" aria-hidden="true" />
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
              </li>
            ))}
          </ul>
          </section>
        )}

        {/* ── Selected day detail ───────────────────────── */}
        {selectedDay && (
          <section aria-label={`Actividades del ${parseInt(selectedDay.slice(8))} de ${MONTHS_ES[month]}`} aria-live="polite">
          <Card className="border-2 border-primary/40 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">
                {parseInt(selectedDay.slice(8))} de {MONTHS_ES[month]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEntries.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No completaste actividades este día
                </p>
              ) : (
                <ul className="space-y-3" aria-label="Lista de actividades del día">
                  {selectedEntries.map((e, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between p-4 bg-muted rounded-xl"
                    >
                      <article aria-label={`${e.activityTitle}${e.score !== null ? `, puntaje ${e.score}%` : ""}`} className="flex items-center justify-between w-full gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{e.activityTitle}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {typeLabel[e.activityType] ?? e.activityType}
                          </p>
                        </div>
                        {e.score !== null && (
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0 ${scoreColor(e.score)}`} aria-hidden="true">
                            {e.score}%
                          </div>
                        )}
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          </section>
        )}
      </main>
    </div>
  )
}
