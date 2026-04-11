"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Users,
  MoreVertical,
  UserX,
  FileText,
  Loader2,
  UserPlus,
  Star,
  BookOpen,
  Video,
  FileText as FilePdf,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ─── Colores por actividad ─────────────────────────────────────────────── */
const COLORES_HEX = [
  "#14b8a6","#c084fc","#fbbf24","#60a5fa",
  "#fb7185","#34d399","#fb923c","#818cf8",
]

/* ─── Interfaces ─────────────────────────────────────────────────────────── */
interface CourseStudent {
  id: string
  nombre: string
  correo: string
  progreso: number
  estrellasCurso: number
  leccionesCompletadas: number
  totalLecciones: number
}

/**
 * Una "sesión" = un intento_leccion (cada vez que el alumno completa la lección).
 * Cada sesión → una barra en "Evolución de Aprendizaje".
 * Las estrellas vienen directamente de intento_leccion.estrellas (fn_calcular_estrellas).
 */
interface SesionLeccion {
  id: string            // id_intento_leccion
  id_leccion: string
  numero_intento: number
  fecha: string         // fecha_creacion del intento_leccion
  puntaje_promedio: number   // 0–100 promedio del intento
  estrellas: number          // 0–5 desde fn_calcular_estrellas (DB)
  actividades: { titulo: string; puntaje: number }[]
}

interface LeccionData {
  id_leccion: string
  titulo: string
  material_lectura: string | null
  material_audiovisual: string | null
  material_pdf_url: string | null
}

interface ProgresionData {
  id_leccion: string
  pct_completado: number
  estrellas: number | null
  total_reintentos: number
}

interface ReporteData {
  student: CourseStudent
  lecciones: LeccionData[]
  progresion: ProgresionData[]
  sesiones: SesionLeccion[]
}

interface CourseStudentsProps {
  courseId: string
  courseName: string | null
  onBack: () => void
  onInvite: () => void
  /** Si se pasa, abre automáticamente el reporte de ese alumno al cargar la lista */
  openStudentId?: string | null
}

/* ─── Barra de intento con segmentos y tooltip ───────────────────────────── */
function BarraIntento({
  sesion,
  numero,
  onExpandedChange,
}: {
  sesion: SesionLeccion
  numero: number
  onExpandedChange?: (expanded: boolean) => void
}) {
  const [expandido, setExpandido] = useState(false)
  const [tooltip, setTooltip] = useState<string | null>(null)

  // Agrupar por título (misma actividad hecha varias veces en el día)
  const agrupadas: Record<string, { titulo: string; puntaje: number; count: number }> = {}
  for (const act of sesion.actividades) {
    if (!agrupadas[act.titulo]) agrupadas[act.titulo] = { titulo: act.titulo, puntaje: 0, count: 0 }
    agrupadas[act.titulo].puntaje += act.puntaje
    agrupadas[act.titulo].count++
  }
  const actividades = Object.values(agrupadas)
  const total = actividades.length || 1

  const alturaTotal = 120
  const alturaEstrella = (sesion.estrellas / 5) * alturaTotal

  const handleClick = () => {
    const next = !expandido
    setExpandido(next)
    setTooltip(null)
    onExpandedChange?.(next)
  }

  return (
    <div className="flex flex-col items-center gap-2 relative">
      <div
        className="w-12 bg-muted rounded-t-lg overflow-hidden relative cursor-pointer"
        style={{ height: `${alturaTotal}px` }}
        onClick={handleClick}
        title={expandido ? "Clic para colapsar" : "Clic para ver actividades"}
      >
        <div
          className="absolute bottom-0 w-full rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-700"
          style={{ height: `${alturaEstrella}px` }}
        >
          {/* Colapsado: barra sólida primaria */}
          {!expandido && (
            <div className="w-full h-full bg-primary rounded-t-lg" />
          )}

          {/* Expandido: segmentos multicolor por actividad */}
          {expandido && (
            actividades.length > 0
              ? actividades.map((act, idx) => (
                  <div
                    key={act.titulo}
                    className="w-full transition-opacity hover:opacity-75"
                    style={{
                      height: `${100 / total}%`,
                      backgroundColor: COLORES_HEX[idx % COLORES_HEX.length],
                    }}
                    onMouseEnter={() => setTooltip(act.titulo)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))
              : <div className="w-full h-full bg-primary rounded-t-lg" />
          )}
        </div>

        {/* Tooltip hover sobre segmento */}
        {expandido && tooltip && agrupadas[tooltip] && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-foreground text-background text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg pointer-events-none">
            <p className="font-semibold">{tooltip}</p>
            <p className="opacity-70">
              {agrupadas[tooltip].count > 1
                ? `${agrupadas[tooltip].count} intentos`
                : `${Math.round(agrupadas[tooltip].puntaje)}%`}
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
          </div>
        )}
      </div>
      <span className="text-sm font-bold text-amber-500">{sesion.estrellas.toFixed(1)}⭐</span>
      <span className="text-xs text-muted-foreground">#{numero}</span>
    </div>
  )
}

/* ─── Componente principal ───────────────────────────────────────────────── */
export function CourseStudents({ courseId, courseName, onBack, onInvite, openStudentId }: CourseStudentsProps) {
  const [students, setStudents] = useState<CourseStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [studentToRemove, setStudentToRemove] = useState<CourseStudent | null>(null)
  const [animado, setAnimado] = useState(false)
  const [reporte, setReporte] = useState<ReporteData | null>(null)
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [barrasExpandidas, setBarrasExpandidas] = useState<Record<string, boolean>>({})
  const [autoOpenedId, setAutoOpenedId] = useState<string | null>(null)

  const fetchStudents = useCallback(async () => {
    setLoading(true)

    const { data: inscripciones } = await supabase
      .from("alumno_curso")
      .select("id_alumno, perfil:id_alumno(id_perfil, nombre, correo)")
      .eq("id_curso", courseId)

    if (!inscripciones || inscripciones.length === 0) {
      setStudents([])
      setLoading(false)
      return
    }

    const { count: totalLecciones } = await supabase
      .from("leccion")
      .select("id_leccion", { count: "exact", head: true })
      .eq("id_curso", courseId)

    const total = totalLecciones ?? 0

    const { data: leccionesData } = await supabase
      .from("leccion")
      .select("id_leccion")
      .eq("id_curso", courseId)

    const leccionIds = (leccionesData ?? []).map((l: any) => l.id_leccion)
    const alumnoIds = inscripciones.map((i: any) => i.id_alumno)

    const { data: progresiones } = leccionIds.length > 0
      ? await supabase
          .from("progresion_alumno")
          .select("id_alumno, id_leccion, pct_completado, estrellas")
          .in("id_alumno", alumnoIds)
          .in("id_leccion", leccionIds)
      : { data: [] }

    const lista: CourseStudent[] = inscripciones.map((ins: any) => {
      const perfil = ins.perfil as { id_perfil: string; nombre: string; correo: string }
      const progsAlumno = (progresiones ?? []).filter((p: any) => p.id_alumno === perfil.id_perfil)
      const completadas = progsAlumno.filter((p: any) => p.pct_completado >= 100).length
      const promedio = total > 0
        ? Math.round(progsAlumno.reduce((acc: number, p: any) => acc + (p.pct_completado ?? 0), 0) / total)
        : 0
      const estrellas = progsAlumno.reduce((acc: number, p: any) => acc + (p.estrellas ?? 0), 0)

      return {
        id: perfil.id_perfil,
        nombre: perfil.nombre,
        correo: perfil.correo,
        progreso: promedio,
        estrellasCurso: estrellas,
        leccionesCompletadas: completadas,
        totalLecciones: total,
      }
    })

    setStudents(lista)
    setLoading(false)
  }, [courseId])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  // Dispara animación de barras después de que los datos cargan
  useEffect(() => {
    if (!loading && students.length > 0) {
      const t = setTimeout(() => setAnimado(true), 80)
      return () => clearTimeout(t)
    } else {
      setAnimado(false)
    }
  }, [loading, students])

  // Auto-abrir el reporte cuando viene openStudentId (desde "Mis Estudiantes")
  useEffect(() => {
    if (loading || !openStudentId || autoOpenedId === openStudentId) return
    const target = students.find(s => s.id === openStudentId)
    if (target) {
      setAutoOpenedId(openStudentId)
      openReporte(target)
    }
  }, [loading, students, openStudentId, autoOpenedId])

  const openReporte = async (student: CourseStudent) => {
    setLoadingReporte(true)
    setBarrasExpandidas({})
    setReporte({ student, lecciones: [], progresion: [], sesiones: [] })

    // 1. Lecciones del curso
    const { data: leccionesData } = await supabase
      .from("leccion")
      .select("id_leccion, titulo, material_lectura, material_audiovisual, material_pdf_url")
      .eq("id_curso", courseId)
      .order("orden")

    const lecciones: LeccionData[] = leccionesData ?? []
    const leccionIds = lecciones.map(l => l.id_leccion)

    // 2. Progresión consolidada + historial de intento_leccion (en paralelo)
    //    intento_leccion se obtiene vía API (supabaseAdmin) porque RLS no permite al docente leerlo directamente.
    const { data: { session: authSession } } = await supabase.auth.getSession()
    const [{ data: progresionData }, attemptsRes] = await Promise.all([
      leccionIds.length > 0
        ? supabase
            .from("progresion_alumno")
            .select("id_leccion, pct_completado, estrellas, total_reintentos")
            .eq("id_alumno", student.id)
            .in("id_leccion", leccionIds)
        : { data: [] },
      leccionIds.length > 0
        ? fetch(`/api/lesson-attempts?alumnoId=${student.id}&leccionIds=${leccionIds.join(",")}`, {
            headers: { Authorization: `Bearer ${authSession?.access_token}` },
          }).then(r => r.json())
        : Promise.resolve({ intentosLeccion: [], intentosAct: [], actividades: [] }),
    ])

    const intentosLeccionData: any[] = attemptsRes.intentosLeccion ?? []
    const intentosActData: any[]     = attemptsRes.intentosAct ?? []
    const actTitulo: Record<string, string> = {}
    for (const a of attemptsRes.actividades ?? []) {
      actTitulo[a.id_actividad] = a.titulo
    }

    // 3. Construir sesiones desde intento_leccion
    //    Cada fila = una completación de la lección.
    //    Estrellas vienen directamente de fn_calcular_estrellas (guardadas en DB).
    const sesiones: SesionLeccion[] = intentosLeccionData.map((il: any) => {
      const actsDeEsteIntento = intentosActData.filter(
        (ia: any) => ia.id_intento_leccion === il.id_intento_leccion
      )
      const actividades = actsDeEsteIntento.map((ia: any) => ({
        titulo: actTitulo[ia.id_actividad] ?? "Actividad",
        puntaje: ia.puntaje_total ?? 0,
      }))
      return {
        id: il.id_intento_leccion,
        id_leccion: il.id_leccion,
        numero_intento: il.numero_intento ?? 1,
        fecha: il.fecha_creacion ?? new Date().toISOString(),
        puntaje_promedio: Math.round(il.promedio_puntaje ?? 0),
        estrellas: il.estrellas ?? 0,
        actividades,
      }
    })

    setReporte({ student, lecciones, progresion: progresionData ?? [], sesiones })
    setLoadingReporte(false)
  }

  const handleRemove = async (studentId: string) => {
    setRemovingId(studentId)
    await supabase.from("alumno_curso").delete().eq("id_curso", courseId).eq("id_alumno", studentId)
    setStudents(prev => prev.filter(s => s.id !== studentId))
    setRemovingId(null)
  }

  const getInitials = (nombre: string) =>
    nombre.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return "text-green-600"
    if (pct >= 40) return "text-amber-600"
    return "text-red-500"
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="outline" size="lg" onClick={onBack} className="h-12 w-12 p-0" aria-label="Volver">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Estudiantes</h1>
            <p className="text-sm text-muted-foreground">{courseName ?? "Curso"}</p>
          </div>
          <Button size="lg" className="h-12 gap-2" onClick={onInvite}>
            <UserPlus className="w-5 h-5" aria-hidden="true" />
            Invitar
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
              <h3 className="text-2xl font-bold text-foreground mb-2">Sin estudiantes</h3>
              <p className="text-muted-foreground">Aún no hay alumnos inscritos en este curso.</p>
            </CardContent>
          </Card>
        ) : (
          <section aria-label="Lista de estudiantes del curso">
            <p className="text-sm text-muted-foreground mb-4">
              {students.length} {students.length === 1 ? "estudiante inscrito" : "estudiantes inscritos"}
            </p>
            <ul className="grid gap-4 list-none p-0">
              {students.map(student => (
                <li key={student.id}>
                  <article aria-label={`Estudiante: ${student.nombre}`}>
                    <Card className="border-2 hover:border-primary/40 transition-all">
                      <CardContent className="px-5 py-4">
                        {/* Una sola fila: avatar + nombre + estrellas + barra + % + menú */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0" aria-hidden="true">
                            {getInitials(student.nombre)}
                          </div>
                          <span className="font-bold text-foreground text-base shrink-0">{student.nombre}</span>
                          <span className="flex items-center gap-1 text-sm font-semibold text-amber-500 shrink-0">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                            {student.estrellasCurso.toFixed(1)}
                          </span>
                          {/* Barra de progreso — ocupa el espacio restante */}
                          <div className="flex-1 h-2.5 bg-primary/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                              style={{ width: animado ? `${student.progreso}%` : "0%" }}
                            />
                          </div>
                          <span className={`text-sm font-bold shrink-0 ${getProgressColor(student.progreso)}`}>
                            {student.progreso}%
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-9 w-9 border-2 shrink-0" aria-label={`Opciones de ${student.nombre}`} disabled={removingId === student.id}>
                                {removingId === student.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem className="text-base py-3 cursor-pointer" onClick={() => openReporte(student)}>
                                <FileText className="w-4 h-4 mr-3" aria-hidden="true" />
                                Ver reporte
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-base py-3 cursor-pointer text-destructive focus:text-destructive" onClick={() => setStudentToRemove(student)}>
                                <UserX className="w-4 h-4 mr-3" aria-hidden="true" />
                                Quitar del curso
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {/* ── Confirmación Quitar Alumno ────────────────────────────────────── */}
      <AlertDialog open={studentToRemove !== null} onOpenChange={(open) => { if (!open) setStudentToRemove(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar a {studentToRemove?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              El alumno perderá acceso a este curso y sus lecciones. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (studentToRemove) handleRemove(studentToRemove.id); setStudentToRemove(null) }}
            >
              Sí, quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Sheet de Reporte ──────────────────────────────────────────────── */}
      <Sheet open={reporte !== null} onOpenChange={(open) => { if (!open) setReporte(null) }}>
        <SheetContent side="right" className="w-full max-w-full sm:max-w-[700px] h-full p-0 overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Reporte del estudiante</SheetTitle>
          </SheetHeader>

          {loadingReporte || !reporte ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="p-6">
              {/* Header del reporte */}
              <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-border">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
                  {getInitials(reporte.student.nombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-foreground">{reporte.student.nombre}</h2>
                  <p className="text-sm text-muted-foreground truncate">{reporte.student.correo}</p>
                </div>
                <div className="flex gap-5 text-center shrink-0">
                  <div>
                    <p className="text-2xl font-bold text-primary">{reporte.student.progreso}%</p>
                    <p className="text-xs text-muted-foreground">Progreso</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-500">
                      ⭐ {reporte.progresion.reduce((acc, p) => acc + (p.estrellas ?? 0), 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">Estrellas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-500">
                      {reporte.student.leccionesCompletadas}
                      <span className="text-base font-medium text-muted-foreground">/{reporte.student.totalLecciones}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Completadas</p>
                  </div>
                </div>
              </div>

              {/* Progreso por lección */}
              <h3 className="font-bold text-foreground text-base mb-4">Progreso por Lección</h3>
              <div className="flex flex-col gap-4 mb-8">
                {reporte.lecciones.map(leccion => {
                  const prog = reporte.progresion.find(p => p.id_leccion === leccion.id_leccion)
                  const sesionesLeccion = reporte.sesiones
                    .filter(s => s.id_leccion === leccion.id_leccion)
                    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                  // Estrellas: siempre desde progresion_alumno (valor canónico de fn_calcular_estrellas)
                  const estrellasActuales = prog?.estrellas ?? 0
                  const completada = (prog?.pct_completado ?? 0) >= 100

                  return (
                    <div key={leccion.id_leccion} className="bg-muted/40 rounded-xl p-4 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-foreground">{leccion.titulo}</p>
                        {completada
                          ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Completada ✓</span>
                          : <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">En progreso</span>
                        }
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${prog?.pct_completado ?? 0}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-foreground w-10 text-right">{prog?.pct_completado ?? 0}%</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>⭐ {estrellasActuales.toFixed(1)} estrellas</span>
                        <span>🔄 {sesionesLeccion.length} {sesionesLeccion.length === 1 ? "intento" : "intentos"}</span>
                        <span>↩️ {prog?.total_reintentos ?? 0} reintentos de actividades</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Evolución de Aprendizaje */}
              <h3 className="font-bold text-foreground text-base mb-4">Evolución de Aprendizaje</h3>
              <div className="flex flex-col gap-4 mb-8">
                {reporte.lecciones.map(leccion => {
                  const prog = reporte.progresion.find(p => p.id_leccion === leccion.id_leccion)
                  const sesionesLeccion = reporte.sesiones
                    .filter(s => s.id_leccion === leccion.id_leccion)
                    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

                  // Sin datos → no mostrar bloque
                  if (!prog && sesionesLeccion.length === 0) return null

                  // Fallback: sesión virtual desde progresion_alumno (sin historial de intento_leccion)
                  const sesionesRender: SesionLeccion[] = sesionesLeccion.length > 0
                    ? sesionesLeccion
                    : [{
                        id: `virtual-${leccion.id_leccion}`,
                        id_leccion: leccion.id_leccion,
                        numero_intento: 1,
                        fecha: new Date().toISOString(),
                        puntaje_promedio: prog?.pct_completado ?? 0,
                        estrellas: prog?.estrellas ?? 0,
                        actividades: [],
                      }]

                  // Títulos únicos de la primera sesión (para leyenda)
                  const titulosUnicos = [...new Set(sesionesRender[0].actividades.map(a => a.titulo))]

                  return (
                    <div key={leccion.id_leccion} className="bg-muted/40 rounded-xl p-5 border border-border">
                      <p className="font-semibold text-foreground mb-4">{leccion.titulo}</p>
                      <div className="flex items-end gap-6 flex-wrap">
                        {sesionesRender.map((sesion, idx) => (
                          <BarraIntento
                            key={sesion.id}
                            sesion={sesion}
                            numero={idx + 1}
                            onExpandedChange={(exp) =>
                              setBarrasExpandidas(prev => ({ ...prev, [sesion.id]: exp }))
                            }
                          />
                        ))}
                        {sesionesRender.length > 1 && (
                          <div className="ml-auto self-center text-sm font-medium">
                            {sesionesRender[sesionesRender.length - 1].estrellas > sesionesRender[0].estrellas
                              ? <span className="text-primary">📈 Mejoró</span>
                              : sesionesRender[sesionesRender.length - 1].estrellas === sesionesRender[0].estrellas
                              ? <span className="text-muted-foreground">➡️ Estable</span>
                              : <span className="text-destructive">📉 Bajó</span>}
                          </div>
                        )}
                      </div>
                      {/* Leyenda — solo cuando alguna barra está expandida */}
                      {titulosUnicos.length > 0 && sesionesRender.some(s => barrasExpandidas[s.id]) && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
                          {titulosUnicos.map((titulo, idx) => (
                            <div key={titulo} className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: COLORES_HEX[idx % COLORES_HEX.length] }} />
                              <span className="text-xs text-muted-foreground">{titulo}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Material Educativo */}
              <h3 className="font-bold text-foreground text-base mb-4">Material Educativo Disponible</h3>
              <div className="flex flex-col gap-2">
                {reporte.lecciones.map(leccion => (
                  <div key={leccion.id_leccion} className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3 border border-border">
                    <p className="text-sm font-medium text-foreground">{leccion.titulo}</p>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {leccion.material_lectura && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1"><BookOpen className="w-3 h-3" />Lectura</span>}
                      {leccion.material_audiovisual && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Video className="w-3 h-3" />Video</span>}
                      {leccion.material_pdf_url && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1"><FilePdf className="w-3 h-3" />PDF</span>}
                      {!leccion.material_lectura && !leccion.material_audiovisual && !leccion.material_pdf_url && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Sin material</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
