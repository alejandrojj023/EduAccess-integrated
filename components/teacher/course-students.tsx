"use client"

import { useState, useEffect, useCallback } from "react"
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
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
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
  fecha: string         // fecha_completado del intento_leccion
  puntaje_promedio: number   // 0–100 promedio del intento
  estrellas: number          // 0–5 desde fn_calcular_estrellas (DB)
  actividades: { titulo: string; puntaje: number }[]
  correctasPrimerIntento: number
  totalActividades: number
  totalReintentos: number
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
  promedio_puntaje: number | null
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

/* ─── Helpers compartidos ───────────────────────────────────────────────── */
function StarRow({ stars, size = "w-5 h-5" }: { stars: number | null; size?: string }) {
  if (stars === null) return null
  return (
    <div className="flex gap-0.5" aria-label={`${stars?.toFixed(1) ?? 0} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`${size} ${
            stars >= i
              ? "text-amber-400 fill-amber-400"
              : stars >= i - 0.5
              ? "text-amber-300 fill-amber-100"
              : "text-muted-foreground/30 fill-muted"
          }`}
        />
      ))}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
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
  const [expandedDetailLessonId, setExpandedDetailLessonId] = useState<string | null>(null)
  const [expandedDetailAttemptId, setExpandedDetailAttemptId] = useState<string | null>(null)

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
    setExpandedDetailLessonId(null)
    setExpandedDetailAttemptId(null)
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
            .select("id_leccion, pct_completado, promedio_puntaje, estrellas, total_reintentos")
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

      // Puntaje basado en estrellas: estrellas * 20 = % (5★=100%, 4★=80%, 3★=60%...)
      // Las estrellas siempre se guardan correctamente en todos los intentos.
      const puntaje_promedio = Math.round((il.estrellas ?? 0) * 20)

      return {
        id: il.id_intento_leccion,
        id_leccion: il.id_leccion,
        numero_intento: il.numero_intento ?? 1,
        fecha: il.fecha_completado ?? il.fecha_creacion ?? new Date().toISOString(),
        puntaje_promedio,
        estrellas: il.estrellas ?? 0,
        actividades,
        correctasPrimerIntento: il.correctas_primer_intento ?? 0,
        totalActividades: il.total_actividades ?? 0,
        totalReintentos: il.total_reintentos ?? 0,
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
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-6">
          <button type="button" onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
            aria-label="Volver">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground leading-none">Estudiantes</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{courseName ?? "Curso"}</p>
          </div>
          <button type="button" onClick={onInvite}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]">
            <UserPlus className="w-4 h-4" aria-hidden="true" />Invitar
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <ul className="grid gap-4 list-none p-0" aria-busy="true" aria-label="Cargando estudiantes">
            {[1, 2, 3].map(i => (
              <li key={i}>
                <div className="rounded-2xl border border-border bg-card px-5 py-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                    <div className="h-4 w-32 rounded-md bg-muted shrink-0" />
                    <div className="h-4 w-12 rounded-md bg-muted shrink-0" />
                    <div className="flex-1 h-2 rounded-full bg-muted" />
                    <div className="h-4 w-10 rounded-md bg-muted shrink-0" />
                    <div className="h-9 w-9 rounded-xl bg-muted shrink-0" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center shadow-sm">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" aria-hidden="true" />
            <h2 className="text-base font-bold text-foreground mb-1">Sin estudiantes</h2>
            <p className="text-sm text-muted-foreground">Aún no hay alumnos inscritos en este curso.</p>
          </div>
        ) : (
          <section aria-label="Lista de estudiantes del curso">
            <p className="text-sm text-muted-foreground mb-4">
              {students.length} {students.length === 1 ? "estudiante inscrito" : "estudiantes inscritos"}
            </p>
            <ul className="grid gap-4 list-none p-0">
              {students.map(student => (
                <li key={student.id}>
                  <article aria-label={`Estudiante: ${student.nombre}`}
                    className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                    {/* Una sola fila: avatar + nombre + estrellas + barra + % + menú */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0" aria-hidden="true">
                        {getInitials(student.nombre)}
                      </div>
                      <span className="font-bold text-foreground text-sm shrink-0">{student.nombre}</span>
                      <span className="flex items-center gap-1 text-sm font-semibold text-amber-500 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                        {student.estrellasCurso.toFixed(1)}
                      </span>
                      {/* Barra de progreso — ocupa el espacio restante */}
                      <div className="flex-1 h-2 bg-primary/10 rounded-full overflow-hidden">
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
                          <button type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50 shrink-0"
                            aria-label={`Opciones de ${student.nombre}`}
                            disabled={removingId === student.id}>
                            {removingId === student.id ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <MoreVertical className="w-4 h-4" aria-hidden="true" />}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem className="text-sm py-2.5 cursor-pointer" onClick={() => openReporte(student)}>
                            <FileText className="w-4 h-4 mr-3" aria-hidden="true" />
                            Ver reporte
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-sm py-2.5 cursor-pointer text-destructive focus:text-destructive" onClick={() => setStudentToRemove(student)}>
                            <UserX className="w-4 h-4 mr-3" aria-hidden="true" />
                            Quitar del curso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
                        puntaje_promedio: Math.round((prog?.estrellas ?? 0) * 20),
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
              <div className="flex flex-col gap-2 mb-8">
                {reporte.lecciones.map(leccion => (
                  <div key={leccion.id_leccion} className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3 border border-border">
                    <p className="text-sm font-medium text-foreground">{leccion.titulo}</p>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {leccion.material_lectura && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1"><BookOpen className="w-3 h-3" aria-hidden="true" />Lectura</span>}
                      {leccion.material_audiovisual && <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full flex items-center gap-1"><Video className="w-3 h-3" aria-hidden="true" />Video</span>}
                      {leccion.material_pdf_url && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1"><FilePdf className="w-3 h-3" aria-hidden="true" />PDF</span>}
                      {!leccion.material_lectura && !leccion.material_audiovisual && !leccion.material_pdf_url && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Sin material</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Detalle por Lección */}
              <h3 className="font-bold text-foreground text-base mb-4">Detalle por Lección</h3>
              <div className="rounded-xl border border-border overflow-hidden">
                <ul className="divide-y divide-border list-none p-0">
                  {reporte.lecciones.map((leccion, index) => {
                    const prog = reporte.progresion.find(p => p.id_leccion === leccion.id_leccion)
                    const completada = (prog?.pct_completado ?? 0) >= 100
                    const score = Math.round((prog?.estrellas ?? 0) * 20)
                    const estrellas = prog?.estrellas ?? null
                    const sesionesLeccion = reporte.sesiones
                      .filter(s => s.id_leccion === leccion.id_leccion)
                      .sort((a, b) => a.numero_intento - b.numero_intento)
                    const isExpanded = expandedDetailLessonId === leccion.id_leccion

                    return (
                      <li key={leccion.id_leccion}>
                        {/* Fila principal */}
                        <div className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${completada ? "bg-success/10" : "bg-muted"}`} aria-hidden="true">
                                {completada
                                  ? <CheckCircle className="w-5 h-5 text-success" />
                                  : <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{leccion.titulo}</p>
                                {completada
                                  ? <p className="text-xs text-muted-foreground">Completada en {sesionesLeccion.length} {sesionesLeccion.length === 1 ? "intento" : "intentos"}</p>
                                  : <p className="text-xs text-muted-foreground">Pendiente</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {completada && (
                                <div className="text-right">
                                  <p className="text-lg font-bold text-primary">
                                    {score}%
                                  </p>
                                  <StarRow stars={estrellas} size="w-3.5 h-3.5" />
                                </div>
                              )}
                              {sesionesLeccion.length > 0 && (
                                <button
                                  onClick={() => {
                                    setExpandedDetailLessonId(isExpanded ? null : leccion.id_leccion)
                                    setExpandedDetailAttemptId(null)
                                  }}
                                  className="flex flex-col items-center gap-0.5 text-primary hover:text-primary/80 transition-colors px-2"
                                  aria-expanded={isExpanded}
                                >
                                  <span className="text-xs font-medium">{sesionesLeccion.length} intentos</span>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Historial expandido */}
                        {isExpanded && sesionesLeccion.length > 0 && (
                          <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Historial de intentos</p>
                            {sesionesLeccion.map((sesion) => {
                              const isAttemptExpanded = expandedDetailAttemptId === sesion.id
                              return (
                                <div key={sesion.id} className="rounded-lg border border-border bg-background overflow-hidden">
                                  <button
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                                    onClick={() => setExpandedDetailAttemptId(isAttemptExpanded ? null : sesion.id)}
                                    aria-expanded={isAttemptExpanded}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                        {sesion.numero_intento}
                                      </span>
                                      <div>
                                        <p className="text-sm font-medium text-foreground">Intento {sesion.numero_intento}</p>
                                        <p className="text-xs text-muted-foreground">{formatDate(sesion.fecha)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <p className="text-sm font-bold text-primary">
                                          {sesion.puntaje_promedio}%
                                        </p>
                                        <StarRow stars={sesion.estrellas} size="w-3 h-3" />
                                      </div>
                                      {isAttemptExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                                    </div>
                                  </button>
                                  {isAttemptExpanded && (
                                    <div className="border-t border-border px-4 py-3 bg-muted/20">
                                      {sesion.actividades.length > 0 ? (
                                        <ul className="space-y-2 list-none p-0">
                                          {sesion.actividades.map((act, ai) => (
                                            <li key={ai} className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2 min-w-0">
                                                {act.puntaje >= 70
                                                  ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                                                  : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                                                <span className="text-sm text-foreground truncate">{act.titulo}</span>
                                              </div>
                                              <span className={`text-sm font-semibold shrink-0 ${act.puntaje >= 90 ? "text-success" : act.puntaje >= 70 ? "text-amber-600" : "text-destructive"}`}>
                                                {act.puntaje}%
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-xs text-muted-foreground py-1">Sin detalle de actividades disponible.</p>
                                      )}
                                      {sesion.totalActividades > 0 && (
                                        <div className="mt-3 pt-2 border-t border-border/50 flex gap-4 text-xs text-muted-foreground">
                                          <span>✓ Correctas al 1er intento: <strong>{sesion.correctasPrimerIntento}/{sesion.totalActividades}</strong></span>
                                          {sesion.totalReintentos > 0 && (
                                            <span>↺ Reintentos: <strong>{sesion.totalReintentos}</strong></span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
