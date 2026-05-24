"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
import { StudentProfileSheet, type StudentProfileSheetStudent } from "@/components/teacher/student-profile-sheet"
import { fechaTijuana, NIVELES } from "@/lib/utils"
import { useSpeakOnHover } from "@/components/ui/accessible-tooltip"
import {
  ArrowLeft, Volume2, Pause, BarChart3, TrendingUp, Clock,
  CheckCircle, Users, Target, SlidersHorizontal,
  ChevronLeft, ChevronRight, Trophy, Crown, Award, Star, Flame,
} from "lucide-react"
import { Tooltip as UITooltip, TooltipTrigger as UITooltipTrigger, TooltipContent as UITooltipContent } from "@/components/ui/tooltip"
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

function ConfigBtn() {
  return (
    <UITooltip>
      <UITooltipTrigger asChild>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Configurar"
            className="flex items-center justify-center rounded-xl border border-border bg-card w-8 h-8 text-muted-foreground transition-all hover:bg-muted active:scale-[0.98] shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </PopoverTrigger>
      </UITooltipTrigger>
      <UITooltipContent side="left">Configurar</UITooltipContent>
    </UITooltip>
  )
}

export function TeacherAnalytics({ onBack }: TeacherAnalyticsProps) {
  const { speak, stopSpeak, settings } = useAccessibility()
  const { user }            = useAuth()
  const [analyticsSpeakState, setAnalyticsSpeakState] = useState<"idle" | "playing" | "played">("idle")
  const analyticsPlayIdRef = useRef(0)

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
  const [progCfg, setProgCfg] = useState({ metrica: "progreso", agrupar: "dia" })
  const [tipoCfg, setTipoCfg] = useState({
    vista:  "dona",
    tipos:  TIPOS_ACTIVIDAD.map((t) => t.value),
  })
  const [despCfg, setDespCfg] = useState({ ordenar: "nombre", filtrar: "todos" })
  const [topCfg,  setTopCfg]  = useState({ filtro: "racha", cantidad: "3" })
  const [despPage, setDespPage] = useState(0)
  const DESP_PAGE_SIZE = 10

  // ── Perfil de alumno (sheet lateral) ───────────────────────
  const [profileStudent, setProfileStudent] = useState<StudentProfileSheetStudent | null>(null)
  const openProfile = (s: StudentProfileSheetStudent) => setProfileStudent(s)

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
    studentPerformance, grupoStudents, overallStats, loading,
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
      const map = new Map<string, { label: string; pts: number[]; intentos: number; intentosLeccion: number }>()
      data.forEach((item) => {
        if (!item.weekStart) return
        const key  = keyFn(item.weekStart)
        const prev = map.get(key) ?? { label: labelFn(item.weekStart), pts: [] as number[], intentos: 0, intentosLeccion: 0 }
        prev.pts.push(item.puntaje)
        prev.intentos        += item.intentos
        prev.intentosLeccion += item.intentosLeccion
        map.set(key, prev)
      })
      return Array.from(map.values()).map((m) => {
        const avg = m.pts.length > 0 ? Math.round(m.pts.reduce((a, b) => a + b, 0) / m.pts.length) : 0
        return { week: m.label, weekStart: "", progreso: avg, puntaje: avg, intentos: m.intentos, intentosLeccion: m.intentosLeccion }
      })
    }

    const data = [...progressData]

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
          const num = semKeys.get(monISO)
          const sun = new Date(mon)
          sun.setDate(mon.getDate() + 6)
          const fmt = (date: Date) => date.toLocaleString("es", { day: "numeric", month: "short" })
          return `Sem ${num}\n${fmt(mon)}–${fmt(sun)}`
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

  const progDataKey = progCfg.metrica === "intentos" ? "intentos"
    : progCfg.metrica === "intentosLeccion" ? "intentosLeccion"
    : progCfg.metrica

  // Tipos de actividad
  const processedTipos = useMemo(() =>
    activityTypeData.filter((d) => tipoCfg.tipos.includes(d.tipo)),
    [activityTypeData, tipoCfg.tipos]
  )

  // Desempeño individual
  const processedDesp = useMemo(() => {
    let data = [...studentPerformance]
    if (despCfg.ordenar === "correctas") data.sort((a, b) => b.correctas - a.correctas)
    else if (despCfg.ordenar === "intentos") data.sort((a, b) => b.intentos - a.intentos)
    else if (despCfg.ordenar === "tiempo") data.sort((a, b) => b.tiempoSeconds - a.tiempoSeconds)
    else data.sort((a, b) => a.name.localeCompare(b.name))
    if (despCfg.filtrar === "apoyo") data = data.filter((s) => s.correctas < 50)
    else if (despCfg.filtrar === "alto") data = data.filter((s) => s.correctas > 80)
    return data
  }, [studentPerformance, despCfg])

  // Reset página cuando cambian los filtros
  const paginatedDesp = useMemo(() => {
    const start = despPage * DESP_PAGE_SIZE
    return processedDesp.slice(start, start + DESP_PAGE_SIZE)
  }, [processedDesp, despPage])
  const totalDespPages = Math.ceil(processedDesp.length / DESP_PAGE_SIZE)

  // Top Alumnos — usa grupoStudents (solo filtro de grupo, no fecha/alumno/curso)
  const processedTop = useMemo(() => {
    let data = [...grupoStudents]
    if (topCfg.filtro === "racha")          data.sort((a, b) => b.racha - a.racha)
    else if (topCfg.filtro === "estrellas") data.sort((a, b) => b.estrellas - a.estrellas)
    else                                    data.sort((a, b) => b.nivel - a.nivel)
    return data.slice(0, parseInt(topCfg.cantidad))
  }, [grupoStudents, topCfg])

  // Distribución de niveles — usa grupoStudents (solo filtro de grupo, no fecha/alumno/curso)
  const nivelDistData = useMemo(() => {
    const counts = new Map<number, number>()
    grupoStudents.forEach((s) => counts.set(s.nivel, (counts.get(s.nivel) ?? 0) + 1))
    return Array.from({ length: 10 }, (_, i) => {
      const n = i + 1
      return { nivel: n, ...NIVELES[n], count: counts.get(n) ?? 0 }
    }).filter((d) => d.count > 0)
  }, [grupoStudents])

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
              onClick={async () => {
                if (analyticsSpeakState === "playing") {
                  stopSpeak()
                  setAnalyticsSpeakState("played")
                  return
                }
                const playId = ++analyticsPlayIdRef.current
                setAnalyticsSpeakState("playing")
                await speak(`Analíticas. Promedio correcto: ${overallStats.averageCorrect}%. Intentos totales: ${overallStats.totalAttempts}. Tiempo promedio: ${overallStats.averageTime}. Estudiantes activos: ${overallStats.activeStudents}.`)
                if (analyticsPlayIdRef.current === playId) setAnalyticsSpeakState("played")
              }}
              aria-label={analyticsSpeakState === "playing" ? "Pausar" : analyticsSpeakState === "played" ? "Repetir" : "Escuchar resumen analíticas"}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
              {analyticsSpeakState === "playing"
                ? <Pause className="w-4 h-4" aria-hidden="true" />
                : <Volume2 className="w-4 h-4" aria-hidden="true" />}
              <span className="hidden sm:inline">
                {analyticsSpeakState === "playing" ? "Pausar" : analyticsSpeakState === "played" ? "Repetir" : "Escuchar"}
              </span>
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
                <p className="text-xs font-medium text-white/80 mt-0.5">Intentos de Lección</p>
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
                <p className="text-xs font-medium text-white/80 mt-0.5">Tiempo prom./Lección</p>
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
                <ConfigBtn />
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-5 p-1">
                    <p className="font-semibold text-sm">Configurar gráfico</p>

                    <ConfigSection title="Métrica">
                      <RadioGroup value={perfCfg.metrica} onValueChange={(v) => setPerfCfg((p) => ({ ...p, metrica: v }))} className="space-y-1.5">
                        <RadioRow value="promedio_puntaje"   label="Promedio de puntaje" />
                        <RadioRow value="total_intentos"     label="Intentos de lección" />
                        <RadioRow value="total_intentos_act" label="Intentos de actividad" />
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
                ) : processedPerf.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <BarChart3 className="w-8 h-8 opacity-30" aria-hidden="true" />
                    <p className="text-sm">Sin datos para el período seleccionado</p>
                  </div>
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
                        perfCfg.metrica === "promedio_puntaje" ? `${value}%` : value,
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
                      <Bar dataKey="total_intentos" name="Intentos de lección" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="total_intentos" position="top" style={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }} />
                      </Bar>
                    )}
                    {perfCfg.metrica === "total_intentos_act" && (
                      <Bar dataKey="total_intentos_act" name="Intentos de actividad" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="total_intentos_act" position="top" style={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }} />
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
                <ConfigBtn />
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
                        <RadioRow value="progreso"         label="Progreso %" />
                        <RadioRow value="puntaje"          label="Puntaje promedio" />
                        <RadioRow value="intentos"         label="Intentos actividades" />
                        <RadioRow value="intentosLeccion"  label="Intentos lección" />
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
                ) : processedProg.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <TrendingUp className="w-8 h-8 opacity-30" aria-hidden="true" />
                    <p className="text-sm">Sin datos para el período seleccionado</p>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedProg}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="week"
                      height={44}
                      tick={({ x, y, payload }: any) => {
                        const [line1, line2] = String(payload.value).split("\n")
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={0} dy={12} textAnchor="middle" fill="var(--muted-foreground)" fontSize={11} fontWeight={600}>{line1}</text>
                            {line2 && <text x={0} y={0} dy={24} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10}>{line2}</text>}
                          </g>
                        )
                      }}
                    />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <Tooltip {...tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey={progDataKey}
                      name={
                        progCfg.metrica === "intentos"        ? "Intentos actividades"
                        : progCfg.metrica === "intentosLeccion" ? "Intentos lección"
                        : progCfg.metrica === "puntaje"         ? "Puntaje promedio"
                        : "Progreso %"
                      }
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

        {/* ── Fila: Tipos + Top Alumnos + Distribución de Niveles ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr_1fr] gap-5">

          {/* Tipos de Actividad */}
          <div className="rounded-3xl border-2 border-border bg-card shadow-sm overflow-hidden">
            <div className="flex flex-row items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-black text-foreground">Tipos de Actividad</h2>
              <Popover>
                <ConfigBtn />
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
              ) : processedTipos.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Target className="w-8 h-8 opacity-30" aria-hidden="true" />
                  <p className="text-sm">Sin datos para el período seleccionado</p>
                </div>
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

          {/* Top Alumnos */}
          <div className="rounded-3xl border-2 border-border bg-card shadow-sm overflow-hidden">
            <div className="flex flex-row items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-amber-500" aria-hidden="true" />
                </div>
                <h2 className="text-sm font-black text-foreground">Top Alumnos</h2>
              </div>
              <Popover>
                <ConfigBtn />
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-5 p-1">
                    <p className="font-semibold text-sm">Configurar ranking</p>
                    <ConfigSection title="Filtrar por">
                      <RadioGroup value={topCfg.filtro} onValueChange={(v) => setTopCfg((p) => ({ ...p, filtro: v }))} className="space-y-1.5">
                        <RadioRow value="racha"     label="Racha de días" />
                        <RadioRow value="estrellas" label="Estrellas totales" />
                      </RadioGroup>
                    </ConfigSection>
                    <ConfigSection title="Mostrar">
                      <RadioGroup value={topCfg.cantidad} onValueChange={(v) => setTopCfg((p) => ({ ...p, cantidad: v }))} className="space-y-1.5">
                        <RadioRow value="3" label="Top 3" />
                        <RadioRow value="5" label="Top 5" />
                      </RadioGroup>
                    </ConfigSection>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
                </div>
              ) : processedTop.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Trophy className="w-8 h-8 opacity-30" aria-hidden="true" />
                  <p className="text-sm">Sin datos disponibles</p>
                </div>
              ) : (
                <ol className="space-y-3" aria-label="Ranking de alumnos">
                  {processedTop.map((student, idx) => {
                    const rowBg        = idx === 0 ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60"
                      : idx === 1 ? "bg-slate-50 dark:bg-slate-900/30 border border-slate-200/60"
                      : idx === 2 ? "bg-orange-50 dark:bg-orange-950/20 border border-orange-200/60"
                      : "border border-border"
                    const MedalIcon  = idx === 0 ? Crown : idx === 1 ? Award : idx === 2 ? Award : null
                    const medalColor = idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : "text-orange-400"
                    const initials   = student.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

                    const valorChip = topCfg.filtro === "racha" ? (
                      <span className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full shrink-0">
                        <Flame className="w-5 h-5 fill-orange-500 text-orange-500 shrink-0" aria-hidden="true" />
                        <span className="text-xs font-black">{student.racha}</span>
                      </span>
                    ) : topCfg.filtro === "estrellas" ? (
                      <span className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full shrink-0">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
                        <span className="text-xs font-black">{student.estrellas}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full shrink-0">
                        <div className="w-4 h-4 rounded-md overflow-hidden shrink-0">
                          <img src={student.nivelIcon} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-black">Nv. {student.nivel}</span>
                      </span>
                    )

                    return (
                      <li key={student.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${rowBg}`}>
                        {/* Posición */}
                        <span className="w-7 flex items-center justify-center shrink-0" aria-label={`Posición ${idx + 1}`}>
                          {MedalIcon
                            ? <MedalIcon className={`w-6 h-6 ${medalColor}`} aria-hidden="true" />
                            : <span className="text-sm font-black text-muted-foreground">{idx + 1}</span>
                          }
                        </span>
                        {/* Avatar + badge nivel */}
                        <button
                          type="button"
                          onClick={() => openProfile({ alumnoId: student.id, name: student.name, colorPerfil: student.colorPerfil })}
                          className="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Ver perfil de ${student.name}`}
                        >
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm shadow-sm"
                            style={{ backgroundColor: student.colorPerfil ?? "#93c5fd" }}
                          >
                            {initials}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg overflow-hidden border-2 border-card">
                            <img src={student.nivelIcon} alt={student.nivelNombre} className="w-full h-full object-cover" />
                          </div>
                        </button>
                        {/* Nombre + nivel */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{student.name}</p>
                          <p className="text-xs text-muted-foreground truncate">Nv. {student.nivel} · {student.nivelNombre}</p>
                        </div>
                        {/* Valor con ícono */}
                        {valorChip}
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </div>

          {/* Distribución de Niveles */}
          <div className="rounded-3xl border-2 border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-black text-foreground">Distribución de Niveles</h2>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 rounded-xl bg-muted animate-pulse" />)}
                </div>
              ) : nivelDistData.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <BarChart3 className="w-8 h-8 opacity-30" aria-hidden="true" />
                  <p className="text-sm">Sin datos disponibles</p>
                </div>
              ) : (
                <ol className="space-y-4" aria-label="Distribución de alumnos por nivel">
                  {nivelDistData.map((d) => {
                    const pct      = grupoStudents.length > 0 ? Math.round((d.count / grupoStudents.length) * 100) : 0
                    const barColor = d.nivel <= 3 ? "bg-emerald-400"
                      : d.nivel <= 6 ? "bg-teal-500"
                      : d.nivel <= 8 ? "bg-primary"
                      : "bg-violet-500"
                    return (
                      <li key={d.nivel} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 shrink-0 overflow-hidden rounded-xl">
                              <img src={d.icon} alt={d.nombre} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate leading-tight">{d.nombre}</p>
                              <p className="text-xs text-muted-foreground">Nivel {d.nivel}</p>
                            </div>
                          </span>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-foreground">{d.count} alumno{d.count !== 1 ? "s" : ""}</p>
                            <p className="text-xs text-muted-foreground">{pct}%</p>
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Nivel ${d.nivel}: ${d.count} alumnos`}>
                          <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </div>

        </div>

        {/* ── Desempeño Individual (fila completa, paginada) ── */}
        <div className="rounded-3xl border-2 border-border bg-card shadow-sm overflow-hidden">
          <div className="flex flex-row items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-black text-foreground">Desempeño Individual</h2>
              {processedDesp.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {processedDesp.length} alumno{processedDesp.length !== 1 ? "s" : ""}
                  {totalDespPages > 1 && ` · Pág ${despPage + 1} de ${totalDespPages}`}
                </p>
              )}
            </div>
            <Popover>
              <ConfigBtn />
              <PopoverContent className="w-64" align="end">
                <div className="space-y-5 p-1">
                  <p className="font-semibold text-sm">Configurar tabla</p>
                  <ConfigSection title="Ordenar por">
                    <RadioGroup value={despCfg.ordenar} onValueChange={(v) => { setDespCfg((p) => ({ ...p, ordenar: v })); setDespPage(0) }} className="space-y-1.5">
                      <RadioRow value="nombre"    label="Nombre" />
                      <RadioRow value="correctas" label="% Correctas" />
                      <RadioRow value="intentos"  label="Intentos" />
                      <RadioRow value="tiempo"    label="Tiempo promedio" />
                    </RadioGroup>
                  </ConfigSection>
                  <ConfigSection title="Filtrar">
                    <RadioGroup value={despCfg.filtrar} onValueChange={(v) => { setDespCfg((p) => ({ ...p, filtrar: v })); setDespPage(0) }} className="space-y-1.5">
                      <RadioRow value="todos"  label="Todos" />
                      <RadioRow value="apoyo"  label="Necesitan apoyo (< 50%)" />
                      <RadioRow value="alto"   label="Rendimiento alto (> 80%)" />
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
                  <tr className="border-b-2 border-border bg-muted/30">
                    <th scope="col" className="text-left py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estudiante</th>
                    <th scope="col" className="text-left py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Correctas</th>
                    <th scope="col" className="text-left py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Int. Lección</th>
                    <th scope="col" className="text-left py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tiempo Prom.</th>
                    <th scope="col" className="text-left py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider min-w-[140px]">Progreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {processedDesp.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground text-sm">
                        No hay alumnos con los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    paginatedDesp.map((student, rowIdx) => {
                      const initials = student.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
                      const badgeBg  = student.correctas >= 80 ? "bg-emerald-100 text-emerald-700"
                        : student.correctas >= 50 ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-600"
                      const barColor = student.correctas >= 80 ? "bg-emerald-500"
                        : student.correctas >= 50 ? "bg-amber-400"
                        : "bg-red-400"
                      return (
                        <tr key={student.id} className={`transition-colors hover:bg-muted/40 ${rowIdx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => openProfile({ alumnoId: student.id, name: student.name, colorPerfil: student.colorPerfil })}
                                className="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label={`Ver perfil de ${student.name}`}
                              >
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shadow-sm"
                                  style={{ backgroundColor: student.colorPerfil ?? "#93c5fd" }}
                                >
                                  {initials}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg overflow-hidden border-2 border-card">
                                  <img src={student.nivelIcon} alt={student.nivelNombre} className="w-full h-full object-cover" />
                                </div>
                              </button>
                              <p className="text-sm font-bold text-foreground truncate flex-1 min-w-0">{student.name}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${badgeBg}`}>
                              {student.correctas}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-sm font-semibold text-foreground">{student.intentos}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-sm text-muted-foreground">{student.tiempo}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <UITooltip>
                              <UITooltipTrigger asChild>
                                <div className="h-2.5 rounded-full bg-muted overflow-hidden cursor-default">
                                  <div
                                    role="progressbar"
                                    aria-valuenow={student.progreso}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`Progreso de ${student.name}: ${student.progreso}%`}
                                    className={`h-full rounded-full ${barColor} transition-all duration-500`}
                                    style={{ width: `${student.progreso}%` }}
                                  />
                                </div>
                              </UITooltipTrigger>
                              <UITooltipContent side="top">
                                {student.leccionesCompletadas} lección{student.leccionesCompletadas !== 1 ? "es" : ""} completada{student.leccionesCompletadas !== 1 ? "s" : ""} · {student.progreso}% {cursoId ? "del curso" : "de todos los cursos"}
                              </UITooltipContent>
                            </UITooltip>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalDespPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                <span className="text-xs text-muted-foreground">
                  {despPage * DESP_PAGE_SIZE + 1}–{Math.min((despPage + 1) * DESP_PAGE_SIZE, processedDesp.length)} de {processedDesp.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDespPage((p) => p - 1)}
                    disabled={despPage === 0}
                    aria-label="Página anterior"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  {Array.from({ length: totalDespPages }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDespPage(i)}
                      aria-label={`Ir a página ${i + 1}`}
                      aria-current={despPage === i ? "page" : undefined}
                      className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                        despPage === i
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDespPage((p) => p + 1)}
                    disabled={despPage >= totalDespPages - 1}
                    aria-label="Página siguiente"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sheet lateral — perfil de alumno */}
      <StudentProfileSheet
        open={profileStudent !== null}
        onOpenChange={(open) => { if (!open) setProfileStudent(null) }}
        student={profileStudent}
      />
    </div>
  )
}
