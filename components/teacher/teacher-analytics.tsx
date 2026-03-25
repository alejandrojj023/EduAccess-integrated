"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
  const [perfCfg, setPerfCfg] = useState({ metrica: "correctas", cantidad: "5", ordenar: "nombre" })
  const [progCfg, setProgCfg] = useState({ periodo: "7", metrica: "progreso", agrupar: "dia" })
  const [tipoCfg, setTipoCfg] = useState({
    vista:  "dona",
    tipos:  TIPOS_ACTIVIDAD.map((t) => t.value),
  })
  const [despCfg, setDespCfg] = useState({ ordenar: "nombre", filtrar: "todos", mostrar: "5" })

  // ── Hook de analíticas ──────────────────────────────────────
  const toISODay = (d: Date) => d.toISOString().slice(0, 10)

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
      const cutISO = cutoff.toISOString().slice(0, 10)
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
          return mon.toISOString().slice(0, 10)
        },
        (iso) => {
          const d   = new Date(iso + "T12:00:00")
          const day = d.getDay() === 0 ? 7 : d.getDay()
          const mon = new Date(d)
          mon.setDate(d.getDate() - (day - 1))
          const monISO = mon.toISOString().slice(0, 10)
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
      backgroundColor: "hsl(var(--card))",
      border: "2px solid hsl(var(--border))",
      borderRadius: "8px",
    },
    itemStyle:  { color: "hsl(var(--foreground))" },
    labelStyle: { color: "hsl(var(--foreground))", fontWeight: 600 },
  }

  // ── Helpers ─────────────────────────────────────────────────
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
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-medium shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Configurar
        </Button>
      </PopoverTrigger>
    )
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline" size="lg" onClick={onBack}
              className="h-12 w-12 p-0" aria-label="Regresar al panel principal"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analíticas</h1>
              <p className="text-sm text-muted-foreground">Rendimiento de estudiantes</p>
            </div>
          </div>
          {settings.voiceEnabled && (
            <Button variant="outline" size="lg"
              onClick={() => speak(`Analíticas. Promedio correcto: ${overallStats.averageCorrect}%. Intentos totales: ${overallStats.totalAttempts}. Tiempo promedio: ${overallStats.averageTime}. Estudiantes activos: ${overallStats.activeStudents}.`)}
              className="h-12"
            >
              <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
              Escuchar
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* ── Barra de filtros globales ── */}
        {(() => {
          const activeCount = [grupoId, cursoId, alumnoId].filter(Boolean).length
          return (
            <section aria-label="Filtros globales" className="bg-card border-2 border-border rounded-2xl overflow-hidden">
              {/* Cabecera siempre visible */}
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
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
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0">
            <li>
              <Card className="border-2 shadow-lg h-full" {...hoverCorrect}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-success" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{loading ? "…" : `${overallStats.averageCorrect}%`}</p>
                    <p className="text-sm text-muted-foreground">Respuestas Correctas</p>
                  </div>
                </CardContent>
              </Card>
            </li>
            <li>
              <Card className="border-2 shadow-lg h-full" {...hoverIntentos}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <Target className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{loading ? "…" : overallStats.totalAttempts}</p>
                    <p className="text-sm text-muted-foreground">Total Intentos</p>
                  </div>
                </CardContent>
              </Card>
            </li>
            <li>
              <Card className="border-2 shadow-lg h-full" {...hoverTiempo}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center">
                    <Clock className="w-7 h-7 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{loading ? "…" : overallStats.averageTime}</p>
                    <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
                  </div>
                </CardContent>
              </Card>
            </li>
            <li>
              <Card className="border-2 shadow-lg h-full" {...hoverActivos}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-chart-4/20 rounded-2xl flex items-center justify-center">
                    <Users className="w-7 h-7 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{loading ? "…" : overallStats.activeStudents}</p>
                    <p className="text-sm text-muted-foreground">Estudiantes Activos</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          </ul>
        </section>

        {/* ── Fila: Rendimiento + Progreso ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Rendimiento por Lección */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-primary" aria-hidden="true" />
                Rendimiento por Lección
              </CardTitle>
              <Popover>
                <ConfigBtn><span /></ConfigBtn>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-5 p-1">
                    <p className="font-semibold text-sm">Configurar gráfico</p>

                    <ConfigSection title="Métrica">
                      <RadioGroup value={perfCfg.metrica} onValueChange={(v) => setPerfCfg((p) => ({ ...p, metrica: v }))} className="space-y-1.5">
                        <RadioRow value="correctas"      label="% Correctas" />
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
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedPerf} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="lesson" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      domain={perfCfg.metrica === "total_intentos" ? [0, "auto"] : [0, 100]}
                      tickFormatter={(v) => perfCfg.metrica === "total_intentos" ? v : `${v}%`}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value: number, name: string) => [
                        perfCfg.metrica === "total_intentos" ? value : `${value}%`,
                        name,
                      ]}
                      labelFormatter={(label: string) => {
                        const item = processedPerf.find((d) => d.lesson === label)
                        return item?.lessonFull ?? label
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    {perfCfg.metrica === "correctas" && (
                      <>
                        <Bar dataKey="correctas"  name="Correctas %"   fill="#22c55e" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="correctas"  position="top" formatter={(v: number) => `${v}%`} style={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }} />
                        </Bar>
                        <Bar dataKey="incorrectas" name="Incorrectas %" fill="#ef4444" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="incorrectas" position="top" formatter={(v: number) => `${v}%`} style={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }} />
                        </Bar>
                      </>
                    )}
                    {perfCfg.metrica === "promedio_puntaje" && (
                      <Bar dataKey="promedio_puntaje" name="Puntaje promedio" fill="#0d9488" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="promedio_puntaje" position="top" formatter={(v: number) => `${v}%`} style={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }} />
                      </Bar>
                    )}
                    {perfCfg.metrica === "total_intentos" && (
                      <Bar dataKey="total_intentos" name="Total intentos" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="total_intentos" position="top" style={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }} />
                      </Bar>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Progreso Semanal */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-primary" aria-hidden="true" />
                Progreso{progCfg.agrupar === "mes" ? " Mensual" : progCfg.agrupar === "dia" ? " Diario" : " Semanal"}
              </CardTitle>
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
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedProg}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip {...tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey={progDataKey}
                      name={progCfg.metrica === "intentos" ? "Intentos" : progCfg.metrica === "puntaje" ? "Puntaje" : "Progreso %"}
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Fila: Tipos + Desempeño ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Tipos de Actividad */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl">Tipos de Actividad</CardTitle>
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
            </CardHeader>
            <CardContent>
              {tipoCfg.vista === "dona" ? (
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
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={90} />
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
            </CardContent>
          </Card>

          {/* Desempeño Individual */}
          <Card className="border-2 shadow-lg lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl">Desempeño Individual</CardTitle>
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
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estudiante</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Correctas</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Intentos</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tiempo Prom.</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Progreso</th>
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
                        <tr key={student.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-4 px-4 font-medium">{student.name}</td>
                          <td className="py-4 px-4">
                            <span className={`font-semibold ${
                              student.correctas >= 80 ? "text-success"
                              : student.correctas >= 50 ? "text-accent-foreground"
                              : "text-destructive"
                            }`}>
                              {student.correctas}%
                            </span>
                          </td>
                          <td className="py-4 px-4 text-muted-foreground">{student.intentos}</td>
                          <td className="py-4 px-4 text-muted-foreground">{student.tiempo}</td>
                          <td className="py-4 px-4 w-32">
                            <Progress value={student.correctas} className="h-2" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
