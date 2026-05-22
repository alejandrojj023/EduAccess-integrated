"use client"

import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { useAnalytics, type AnalyticsFilters } from "@/hooks/teacher/use-analytics"
import { fechaTijuana } from "@/lib/utils"
import { useSpeakOnHover } from "@/components/ui/accessible-tooltip"
import {
  ArrowLeft, Volume2, BarChart3, TrendingUp, Clock,
  CheckCircle, Users, Target, SlidersHorizontal,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, LabelList,
} from "recharts"

interface TeacherAnalyticsProps {
  onBack: () => void
}

// Tipos de actividad disponibles para los checkboxes
const TIPOS_ACTIVIDAD = [
  { value: "identificacion",         label: "Imágenes" },
  { value: "reconocimiento_sonidos", label: "Sonidos" },
  { value: "seleccion_guiada",       label: "Opción Múltiple" },
  { value: "secuenciacion",          label: "Secuencias" },
  { value: "respuesta_oral",         label: "Voz" },
  { value: "respuesta_corta",        label: "Respuesta Corta" },
  { value: "completar_oracion",      label: "Completar oración" },
]

// Fecha por defecto: último mes
function defaultDesde(): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d
}
function defaultHasta(): Date {
  return new Date()
}

// ============================================================
// Componente principal
// ============================================================

function RadioRow({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem value={value} id={value} />
      <Label htmlFor={value} className="cursor-pointer">{label}</Label>
    </div>
  )
}

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

function ConfigBtn({ children }: { children: React.ReactNode }) {
  return (
    <PopoverTrigger asChild>
      <button type="button" className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98] shrink-0">
        <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
        Configurar
      </button>
    </PopoverTrigger>
  )
}

export function TeacherAnalytics({ onBack }: TeacherAnalyticsProps) {
  const { speak, settings } = useAccessibility()
  const { user }            = useAuth()

  // ── Filtros globales ────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false)
  const [grupoId,    setGrupoId]    = useState<string | null>(null)
  const [cursoId,    setCursoId]    = useState<string | null>(null)
  const [alumnoId,   setAlumnoId]   = useState<string | null>(null)
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(defaultDesde())
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(defaultHasta())

  // ── Datos para los dropdowns ────────────────────────────────
  const [grupos,  setGrupos]  = useState<{ id_grupo: string; nombre: string }[]>([])
  const [cursos,  setCursos]  = useState<{ id_curso: string; titulo: string }[]>([])
  const [alumnos, setAlumnos] = useState<{ id_perfil: string; nombre: string }[]>([])

  // ── Config por gráfico ──────────────────────────────────────
  const [perfCfg, setPerfCfg] = useState({ metrica: "promedio_puntaje", cantidad: "5", ordenar: "nombre" })
  const [progCfg, setProgCfg] = useState({ periodo: "7", metrica: "progreso", agrupar: "dia" })
  const [tipoCfg, setTipoCfg] = useState({
    vista:  "dona",
    tipos:  TIPOS_ACTIVIDAD.map((t) => t.value),
  })
  const [despCfg, setDespCfg] = useState({ ordenar: "nombre", filtrar: "todos", mostrar: "5" })

  // ── Hook de analíticas ──────────────────────────────────────
  const toISODay = (d: Date) => fechaTijuana(d)

  const filters: AnalyticsFilters = useMemo(() => ({
    grupoId,
    cursoId,
    alumnoId,
    fechaDesde: fechaDesde ? toISODay(fechaDesde) + "T00:00:00" : null,
    fechaHasta: fechaHasta ? toISODay(fechaHasta) + "T23:59:59" : null,
  }), [grupoId, cursoId, alumnoId, fechaDesde, fechaHasta])

  const {
    performanceData, progressData, activityTypeData,
    studentPerformance, overallStats, loading,
  } = useAnalytics(filters)

  // ── Cargar grupos al montar ─────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase.from("grupo").select("id_grupo, nombre").eq("id_docente", user.id)
      .then(({ data }) => setGrupos(data ?? []))
  }, [user])

  // ── Cursos según grupo seleccionado ────────────────────────
  useEffect(() => {
    if (!user) return
    const fetchCursos = async () => {
      if (grupoId) {
        const { data } = await supabase.from("curso").select("id_curso, titulo").eq("id_grupo", grupoId)
        setCursos(data ?? [])
      } else {
        // Todos los grupos del docente
        const { data: gs } = await supabase.from("grupo").select("id_grupo").eq("id_docente", user.id)
        const gIds = gs?.map((g) => g.id_grupo) ?? []
        if (gIds.length > 0) {
          const { data } = await supabase.from("curso").select("id_curso, titulo").in("id_grupo", gIds)
          setCursos(data ?? [])
        } else {
          setCursos([])
        }
      }
      setCursoId(null)
    }
    fetchCursos()
  }, [user, grupoId])

  // ── Alumnos según grupo seleccionado ───────────────────────
  useEffect(() => {
    if (!user) return
    const fetchAlumnos = async () => {
      let gIds: string[] = []
      if (grupoId) {
        gIds = [grupoId]
      } else {
        const { data: gs } = await supabase.from("grupo").select("id_grupo").eq("id_docente", user.id)
        gIds = gs?.map((g) => g.id_grupo) ?? []
      }
      if (gIds.length === 0) { setAlumnos([]); return }

      const { data: ins } = await supabase.from("alumno_grupo").select("id_alumno").in("id_grupo", gIds)
      const ids = [...new Set(ins?.map((i) => i.id_alumno) ?? [])]
      if (ids.length === 0) { setAlumnos([]); return }

      const { data: perfiles } = await supabase
        .from("perfil").select("id_perfil, nombre").in("id_perfil", ids)
      setAlumnos(perfiles ?? [])
      setAlumnoId(null)
    }
    fetchAlumnos()
  }, [user, grupoId])

  // ── Hover TTS stats ─────────────────────────────────────────
  const hoverCorrect  = useSpeakOnHover(`Respuestas correctas: ${overallStats.averageCorrect}%`)
  const hoverIntentos = useSpeakOnHover(`Total de intentos: ${overallStats.totalAttempts}`)
  const hoverTiempo   = useSpeakOnHover(`Tiempo promedio: ${overallStats.averageTime}`)
  const hoverActivos  = useSpeakOnHover(`Estudiantes activos: ${overallStats.activeStudents}`)

  // ── Datos procesados por configuración ─────────────────────

  // Rendimiento por lección
  const processedPerf = useMemo(() => {
    let data = [...performanceData]
    // Ordenar
    if (perfCfg.ordenar === "nombre") {
      data.sort((a, b) => a.lessonFull.localeCompare(b.lessonFull))
    } else if (perfCfg.ordenar === "asc") {
      data.sort((a, b) => a[perfCfg.metrica as keyof typeof a] as number - (b[perfCfg.metrica as keyof typeof b] as number))
    } else {
      data.sort((a, b) => b[perfCfg.metrica as keyof typeof b] as number - (a[perfCfg.metrica as keyof typeof a] as number))
    }
    // Cantidad
    if (perfCfg.cantidad === "5")  data = data.slice(0, 5)
    if (perfCfg.cantidad === "10") data = data.slice(0, 10)
    return data
  }, [performanceData, perfCfg])

  // Progreso: el hook ya devuelve datos DIARIOS; aquí re-agrupamos según config
  const processedProg = useMemo(() => {
    // Helper para reducir grupos
    function agrupar(
      data: typeof progressData,
      keyFn: (iso: string) => string,
      labelFn: (iso: string) => string,
    ) {
      const map = new Map<string, { label: string; pts: number[]; intentos: number }>()
      data.forEach((item) => {
        if (!item.weekStart) return
        const key  = keyFn(item.weekStart)
        const prev = map.get(key) ?? { label: labelFn(item.weekStart), pts: [] as number[], intentos: 0 }
        prev.pts.push(item.puntaje)
        prev.intentos += item.intentos
        map.set(key, prev)
      })
      return Array.from(map.values()).map((m) => {
        const avg = m.pts.length > 0 ? Math.round(m.pts.reduce((a, b) => a + b, 0) / m.pts.length) : 0
        return { week: m.label, weekStart: "", progreso: avg, puntaje: avg, intentos: m.intentos }
      })
    }

    // Aplicar periodo según modo de agrupación
    let data = [...progressData]
    if (progCfg.periodo !== "todo") {
      const n = parseInt(progCfg.periodo)
      const cutoff = new Date()
      if (progCfg.agrupar === "dia")    cutoff.setDate(cutoff.getDate() - n)
      else if (progCfg.agrupar === "semana") cutoff.setDate(cutoff.getDate() - n * 7)
      else if (progCfg.agrupar === "mes")    cutoff.setMonth(cutoff.getMonth() - n)
      const cutISO = fechaTijuana(cutoff)
      data = data.filter((d) => d.weekStart >= cutISO)
    }

    // Por día: usar datos directamente (ya son diarios)
    if (progCfg.agrupar === "dia") return data

    // Por semana: agrupar días en su lunes correspondiente
    if (progCfg.agrupar === "semana") {
      let semIdx = 0
      const semKeys = new Map<string, number>()
      return agrupar(
        data,
        (iso) => {
          const d   = new Date(iso + "T12:00:00")
          const day = d.getDay() === 0 ? 7 : d.getDay()
          const mon = new Date(d)
          mon.setDate(d.getDate() - (day - 1))
          return fechaTijuana(mon)
        },
        (iso) => {
          const d   = new Date(iso + "T12:00:00")
          const day = d.getDay() === 0 ? 7 : d.getDay()
          const mon = new Date(d)
          mon.setDate(d.getDate() - (day - 1))
          const monISO = fechaTijuana(mon)
          if (!semKeys.has(monISO)) semKeys.set(monISO, ++semIdx)
          return `Sem ${semKeys.get(monISO)}`
        },
      )
    }

    // Por mes
    return agrupar(
      data,
      (iso) => iso.slice(0, 7),
      (iso) => {
        const d = new Date(iso + "T12:00:00")
        return d.toLocaleString("es", { month: "short", year: "2-digit" })
      },
    )
  }, [progressData, progCfg])

  const progDataKey = progCfg.metrica === "intentos" ? "intentos" : progCfg.metrica

  // Tipos de actividad
  const processedTipos = useMemo(() =>
    activityTypeData.filter((d) => tipoCfg.tipos.includes(d.tipo)),
    [activityTypeData, tipoCfg.tipos]
  )

  // Desempeño individual
  const processedDesp = useMemo(() => {
    let data = [...studentPerformance]
    // Ordenar
    if (despCfg.ordenar === "correctas") data.sort((a, b) => b.correctas - a.correctas)
    else if (despCfg.ordenar === "intentos") data.sort((a, b) => b.intentos - a.intentos)
    else if (despCfg.ordenar === "tiempo") data.sort((a, b) => b.tiempoSeconds - a.tiempoSeconds)
    else data.sort((a, b) => a.name.localeCompare(b.name))
    // Filtrar
    if (despCfg.filtrar === "apoyo") data = data.filter((s) => s.correctas < 50)
    else if (despCfg.filtrar === "alto") data = data.filter((s) => s.correctas > 80)
    // Mostrar
    if (despCfg.mostrar !== "todos") data = data.slice(0, parseInt(despCfg.mostrar))
    return data
  }, [studentPerformance, despCfg])

  // ── Estilos comunes Tooltip ─────────────────────────────────
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "var(--card)",
      border: "2px solid var(--border)",
      borderRadius: "8px",
    },
    itemStyle:  { color: "var(--foreground)" },
    labelStyle: { color: "var(--foreground)", fontWeight: 600 },
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Regresar al panel principal">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-sm font-black text-foreground leading-none">Analíticas</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Rendimiento de estudiantes</p>
            </div>
          </div>
          {settings.voiceEnabled && (
            <button type="button"
              onClick={() => speak(`Analíticas. Promedio correcto: ${overallStats.averageCorrect}%. Intentos totales: ${overallStats.totalAttempts}. Tiempo promedio: ${overallStats.averageTime}. Estudiantes activos: ${overallStats.activeStudents}.`)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Escuchar</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-7 space-y-6">

        {/* ── Barra de filtros globales ── */}
        {(() => {
          const activeCount = [grupoId, cursoId, alumnoId].filter(Boolean).length
          return (
            <section aria-label="Filtros globales" className="bg-card border-2 border-border rounded-3xl overflow-hidden shadow-sm">
              {/* Cabecera siempre visible */}
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters}
                  aria-label={showFilters ? "Cerrar panel de filtros" : "Abrir panel de filtros"}
                  className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-semibold text-foreground">
                    {activeCount > 0 ? `${activeCount} filtro${activeCount > 1 ? "s" : ""} activo${activeCount > 1 ? "s" : ""}` : "Filtros"}
                  </span>
                  {activeCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {activeCount}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-3">
                  {activeCount > 0 && (
                    <button
                      onClick={() => { setGrupoId(null); setCursoId(null); setAlumnoId(null); setFechaDesde(defaultDesde()); setFechaHasta(defaultHasta()) }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Limpiar todo
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters((v) => !v)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showFilters ? "Cerrar filtros" : "Abrir filtros"}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Panel expandible */}
              {showFilters && (
                <div className="border-t border-border px-4 pb-4 pt-4">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1.4fr] items-end gap-3">

                    {/* Grupo */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Grupo</Label>
                      <Select
                        value={grupoId ?? "all"}
                        onValueChange={(v) => { setGrupoId(v === "all" ? null : v); setCursoId(null); setAlumnoId(null) }}
                      >
                        <SelectTrigger className="h-10"><SelectValue placeholder="Todos los grupos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los grupos</SelectItem>
                          {grupos.map((g) => (
                            <SelectItem key={g.id_grupo} value={g.id_grupo}>{g.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Curso */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Curso</Label>
                      <Select
                        value={cursoId ?? "all"}
                        onValueChange={(v) => setCursoId(v === "all" ? null : v)}
                      >
                        <SelectTrigger className="h-10"><SelectValue placeholder="Todos los cursos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los cursos</SelectItem>
                          {cursos.map((c) => (
                            <SelectItem key={c.id_curso} value={c.id_curso}>{c.titulo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Alumno */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Alumno</Label>
                      <Select
                        value={alumnoId ?? "all"}
                        onValueChange={(v) => setAlumnoId(v === "all" ? null : v)}
                      >
                        <SelectTrigger className="h-10"><SelectValue placeholder="Todos los alumnos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los alumnos</SelectItem>
                          {alumnos.map((a) => (
                            <SelectItem key={a.id_perfil} value={a.id_perfil}>{a.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Período */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Período</Label>
                      <div className="flex items-center gap-1.5">
                        <DatePicker
                          value={fechaDesde}
                          onChange={setFechaDesde}
                          placeholder="Desde"
                          className="flex-1 min-w-0"
                        />
                        <span className="text-muted-foreground text-xs shrink-0">–</span>
                        <DatePicker
                          value={fechaHasta}
                          onChange={setFechaHasta}
                          placeholder="Hasta"
                          className="flex-1 min-w-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )
        })()}

        {/* ── KPIs ── */}
        <section aria-label="Estadísticas generales">
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 list-none p-0">
            <li>
              <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-400 to-teal-600 p-5 shadow-lg shadow-primary/20 transition-shadow" {...hoverCorrect}>
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/20 blur-xl" aria-hidden="true" />
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                  <CheckCircle className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                {loading
                  ? <div className="h-8 w-20 rounded-lg bg-white/30 animate-pulse mb-0.5" aria-hidden="true" />
                  : <p className="text-2xl font-black text-white">{`${overallStats.averageCorrect}%`}</p>
                }
                <p className="text-xs font-medium text-white/80 mt-0.5">Respuestas Correctas</p>
              </div>
            </li>
            <li>
              <div className="relative overflow-hidden rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-400 to-blue-600 p-5 shadow-lg shadow-primary/20 transition-shadow" {...hoverIntentos}>
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/20 blur-xl" aria-hidden="true" />
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                {loading
                  ? <div className="h-8 w-16 rounded-lg bg-white/30 animate-pulse mb-0.5" aria-hidden="true" />
                  : <p className="text-2xl font-black text-white">{overallStats.totalAttempts}</p>
                }
                <p className="text-xs font-medium text-white/80 mt-0.5">Total Intentos</p>
              </div>
            </li>
            <li>
              <div className="relative overflow-hidden rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-400 to-orange-500 p-5 shadow-lg shadow-primary/20 transition-shadow" {...hoverTiempo}>
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/20 blur-xl" aria-hidden="true" />
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                {loading
                  ? <div className="h-8 w-24 rounded-lg bg-white/30 animate-pulse mb-0.5" aria-hidden="true" />
                  : <p className="text-2xl font-black text-white">{overallStats.averageTime}</p>
                }
                <p className="text-xs font-medium text-white/80 mt-0.5">Tiempo Promedio</p>
              </div>
            </li>
            <li>
              <div className="relative overflow-hidden rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-400 to-violet-600 p-5 shadow-lg shadow-primary/20 transition-shadow" {...hoverActivos}>
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/20 blur-xl" aria-hidden="true" />
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                {loading
                  ? <div className="h-8 w-12 rounded-lg bg-white/30 animate-pulse mb-0.5" aria-hidden="true" />
                  : <p className="text-2xl font-black text-white">{overallStats.activeStudents}</p>
                }
                <p className="text-xs font-medium text-white/80 mt-0.5">Estudiantes Activos</p>
              </div>
            </li>
          </ul>
        </section>

        {/* ── Fila: Rendimiento + Progreso ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Rendimiento por Lección */}
          <div className="rounded-3xl border-2 border-border bg-card shadow-sm overflow-hidden">
            <div className="flex flex-row items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-sm font-black text-foreground">Rendimiento por Lección</h2>
              </div>
              <Popover>
                <ConfigBtn><span /></ConfigBtn>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-5 p-1">
                    <p className="font-semibold text-sm">Configurar gráfico</p>

                    <ConfigSection title="Métrica">
                      <RadioGroup value={perfCfg.metrica} onValueChange={(v) => setPerfCfg((p) => ({ ...p, metrica: v }))} className="space-y-1.5">
                        <RadioRow value="promedio_puntaje" label="Promedio de puntaje" />
                        <RadioRow value="total_intentos" label="Total de intentos" />
                      </RadioGroup>
                    </ConfigSection>

                    <ConfigSection title="Cantidad">
                      <RadioGroup value={perfCfg.cantidad} onValueChange={(v) => setPerfCfg((p) => ({ ...p, cantidad: v }))} className="space-y-1.5">
                        <RadioRow value="5"     label="Últimas 5" />
                        <RadioRow value="10"    label="Últimas 10" />
                        <RadioRow value="todas" label="Todas las lecciones" />
                      </RadioGroup>
                    </ConfigSection>

                    <ConfigSection title="Ordenar por">
                      <RadioGroup value={perfCfg.ordenar} onValueChange={(v) => setPerfCfg((p) => ({ ...p, ordenar: v }))} className="space-y-1.5">
                        <RadioRow value="nombre" label="Nombre" />
                        <RadioRow value="asc"    label="Rendimiento ascendente" />
                        <RadioRow value="desc"   label="Rendimiento descendente" />
                      </RadioGroup>
                    </ConfigSection>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="p-5">
              <div className="h-72">
                {loading ? (
                  <div className="h-full rounded-xl bg-muted animate-pulse" aria-hidden="true" />
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedPerf} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="lessonFull"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      tickFormatter={(v: string) => v.length > 14 ? v.substring(0, 14) + "…" : v}
                    />
                    <YAxis
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      domain={perfCfg.metrica === "total_intentos" ? [0, "auto"] : [0, 100]}
                      tickFormatter={(v) => perfCfg.metrica === "total_intentos" ? v : `${v}%`}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value: number, name: string) => [
                        perfCfg.metrica === "total_intentos" ? value : `${value}%`,
                        name,
                      ]}
                      labelFormatter={(label: string) => label}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    {perfCfg.metrica === "promedio_puntaje" && (
                      <Bar dataKey="promedio_puntaje" name="Puntaje promedio" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="promedio_puntaje" position="top" formatter={(v: number) => `${v}%`} style={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }} />
                      </Bar>
                    )}
                    {perfCfg.metrica === "total_intentos" && (
                      <Bar dataKey="total_intentos" name="Total intentos" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="total_intentos" position="top" style={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }} />
                      </Bar>
                    )}
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Progreso Semanal */}
          <div className="rounded-3xl border-2 border-border bg-card shadow-sm overflow-hidden">
            <div className="flex flex-row items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-sm font-black text-foreground">
                  Progreso{progCfg.agrupar === "mes" ? " Mensual" : progCfg.agrupar === "dia" ? " Diario" : " Semanal"}
                </h2>
              </div>
              <Popover>
                <ConfigBtn><span /></ConfigBtn>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-5 p-1">
                    <p className="font-semibold text-sm">Configurar gráfico</p>

                    <ConfigSection title="Agrupar por">
                      <RadioGroup
                        value={progCfg.agrupar}
                        onValueChange={(v) => setProgCfg((p) => ({
                          ...p,
                          agrupar: v,
                          // Al cambiar el modo, setear el período por defecto correspondiente
                          periodo: v === "dia" ? "7" : v === "semana" ? "4" : "6",
                        }))}
                        className="space-y-1.5"
                      >
                        <RadioRow value="dia"    label="Por día" />
                        <RadioRow value="semana" label="Por semana" />
                        <RadioRow value="mes"    label="Por mes" />
                      </RadioGroup>
                    </ConfigSection>

                    <ConfigSection title="Métrica">
                      <RadioGroup value={progCfg.metrica} onValueChange={(v) => setProgCfg((p) => ({ ...p, metrica: v }))} className="space-y-1.5">
                        <RadioRow value="progreso"  label="Progreso %" />
                        <RadioRow value="puntaje"   label="Puntaje promedio" />
                        <RadioRow value="intentos"  label="Intentos" />
                      </RadioGroup>
                    </ConfigSection>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="p-5">
              <div className="h-64">
                {loading ? (
                  <div className="h-full rounded-xl bg-muted animate-pulse" aria-hidden="true" />
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedProg}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="week" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <Tooltip {...tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey={progDataKey}
                      name={progCfg.metrica === "intentos" ? "Intentos" : progCfg.metrica === "puntaje" ? "Puntaje" : "Progreso %"}
                      stroke="var(--primary)"
                      strokeWidth={3}
                      dot={{ fill: "var(--primary)", strokeWidth: 2, r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Fila: Tipos + Desempeño ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Tipos de Actividad */}
          <div className="rounded-3xl border-2 border-border bg-card shadow-sm overflow-hidden">
            <div className="flex flex-row items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-black text-foreground">Tipos de Actividad</h2>
              <Popover>
                <ConfigBtn><span /></ConfigBtn>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-5 p-1">
                    <p className="font-semibold text-sm">Configurar gráfico</p>

                    <ConfigSection title="Vista">
                      <RadioGroup value={tipoCfg.vista} onValueChange={(v) => setTipoCfg((p) => ({ ...p, vista: v }))} className="space-y-1.5">
                        <RadioRow value="dona"   label="Dona" />
                        <RadioRow value="barras" label="Barras" />
                      </RadioGroup>
                    </ConfigSection>

                    <ConfigSection title="Tipos a incluir">
                      <div className="space-y-1.5">
                        {TIPOS_ACTIVIDAD.map((tipo) => (
                          <div key={tipo.value} className="flex items-center gap-2">
                            <Checkbox
                              id={`tipo-${tipo.value}`}
                              checked={tipoCfg.tipos.includes(tipo.value)}
                              onCheckedChange={(checked) =>
                                setTipoCfg((p) => ({
                                  ...p,
                                  tipos: checked
                                    ? [...p.tipos, tipo.value]
                                    : p.tipos.filter((t) => t !== tipo.value),
                                }))
                              }
                            />
                            <Label htmlFor={`tipo-${tipo.value}`} className="cursor-pointer">{tipo.label}</Label>
                          </div>
                        ))}
                      </div>
                    </ConfigSection>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="h-48 rounded-xl bg-muted animate-pulse" aria-hidden="true" />
              ) : tipoCfg.vista === "dona" ? (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={processedTipos} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                          {processedTipos.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {processedTipos.map((item) => (
                      <div key={item.tipo} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedTipos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={90} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="value" name="Actividades" radius={[0, 4, 4, 0]}>
                        {processedTipos.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Desempeño Individual */}
          <div className="rounded-3xl border-2 border-border bg-card shadow-sm overflow-hidden lg:col-span-2">
            <div className="flex flex-row items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-black text-foreground">Desempeño Individual</h2>
              <Popover>
                <ConfigBtn><span /></ConfigBtn>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-5 p-1">
                    <p className="font-semibold text-sm">Configurar tabla</p>

                    <ConfigSection title="Ordenar por">
                      <RadioGroup value={despCfg.ordenar} onValueChange={(v) => setDespCfg((p) => ({ ...p, ordenar: v }))} className="space-y-1.5">
                        <RadioRow value="nombre"    label="Nombre" />
                        <RadioRow value="correctas" label="% Correctas" />
                        <RadioRow value="intentos"  label="Intentos" />
                        <RadioRow value="tiempo"    label="Tiempo promedio" />
                      </RadioGroup>
                    </ConfigSection>

                    <ConfigSection title="Filtrar">
                      <RadioGroup value={despCfg.filtrar} onValueChange={(v) => setDespCfg((p) => ({ ...p, filtrar: v }))} className="space-y-1.5">
                        <RadioRow value="todos"  label="Todos" />
                        <RadioRow value="apoyo"  label="Necesitan apoyo (< 50%)" />
                        <RadioRow value="alto"   label="Rendimiento alto (> 80%)" />
                      </RadioGroup>
                    </ConfigSection>

                    <ConfigSection title="Mostrar">
                      <RadioGroup value={despCfg.mostrar} onValueChange={(v) => setDespCfg((p) => ({ ...p, mostrar: v }))} className="space-y-1.5">
                        <RadioRow value="5"    label="5 alumnos" />
                        <RadioRow value="10"   label="10 alumnos" />
                        <RadioRow value="20"   label="20 alumnos" />
                        <RadioRow value="todos" label="Todos" />
                      </RadioGroup>
                    </ConfigSection>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="text-left py-2.5 px-3 text-xs font-bold text-muted-foreground">Estudiante</th>
                      <th scope="col" className="text-left py-2.5 px-3 text-xs font-bold text-muted-foreground">Correctas</th>
                      <th scope="col" className="text-left py-2.5 px-3 text-xs font-bold text-muted-foreground">Intentos</th>
                      <th scope="col" className="text-left py-2.5 px-3 text-xs font-bold text-muted-foreground">Tiempo Prom.</th>
                      <th scope="col" className="text-left py-2.5 px-3 text-xs font-bold text-muted-foreground">Progreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedDesp.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                          No hay alumnos con los filtros seleccionados
                        </td>
                      </tr>
                    ) : (
                      processedDesp.map((student) => (
                        <tr key={student.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 text-sm font-bold">{student.name}</td>
                          <td className="py-3 px-3">
                            <span className={`text-sm font-black ${
                              student.correctas >= 80 ? "text-emerald-600"
                              : student.correctas >= 50 ? "text-amber-600"
                              : "text-red-500"
                            }`}>
                              {student.correctas}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-sm text-muted-foreground">{student.intentos}</td>
                          <td className="py-3 px-3 text-sm text-muted-foreground">{student.tiempo}</td>
                          <td className="py-3 px-3 w-28">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                role="progressbar"
                                aria-valuenow={student.correctas}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`Progreso de ${student.name}: ${student.correctas}%`}
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${student.correctas}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
