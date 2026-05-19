"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, BookOpen, CheckCircle2, XCircle, Hash } from "lucide-react"
import { VoiceAssistant } from "@/components/student/voice-assistant"

interface CourseInvitation {
  id_invitacion: string
  estado: string
  fecha_creacion: string
  curso: { titulo: string; codigo_curso: string; materia: string } | null
  docente: { nombre: string } | null
}

interface JoinGroupProps {
  onNavigate: (screen: string) => void
}

export function JoinGroup({ onNavigate }: JoinGroupProps) {
  const [courseCode,    setCourseCode]    = useState("")
  const [joiningCourse, setJoiningCourse] = useState(false)
  const [courseMsg,     setCourseMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  const [courseInvitations, setCourseInvitations] = useState<CourseInvitation[]>([])
  const [loadingCourseInv,  setLoadingCourseInv]  = useState(true)
  const [actionCourseId,    setActionCourseId]    = useState<string | null>(null)

  useEffect(() => { loadCourseInvitations() }, [])

  async function loadCourseInvitations() {
    setLoadingCourseInv(true)
    const { data } = await supabase
      .from("invitacion_curso")
      .select(`
        id_invitacion,
        estado,
        fecha_creacion,
        curso:id_curso ( titulo, codigo_curso, materia ),
        docente:id_docente ( nombre )
      `)
      .eq("estado", "pendiente")
    setCourseInvitations((data as any[]) ?? [])
    setLoadingCourseInv(false)
  }

  async function handleJoinByCourseCode() {
    const trimmed = courseCode.trim().toUpperCase()
    if (trimmed.length !== 6) return
    setJoiningCourse(true)
    setCourseMsg(null)
    const { data, error } = await supabase.rpc("fn_unirse_por_codigo_curso", {
      p_codigo: trimmed,
    })
    setJoiningCourse(false)
    if (data?.success) {
      setCourseMsg({ ok: true, text: `Te uniste al curso "${data.curso}" correctamente.` })
      setCourseCode("")
      loadCourseInvitations()
    } else {
      setCourseMsg({ ok: false, text: data?.error ?? error?.message ?? "Código no válido." })
    }
    setTimeout(() => setCourseMsg(null), 6000)
  }

  async function handleCourseInvitation(id: string, accept: boolean) {
    setActionCourseId(id)
    const rpc = accept ? "fn_aceptar_invitacion_curso" : "fn_rechazar_invitacion_curso"
    const { data } = await supabase.rpc(rpc, { p_id_invitacion: id })
    setActionCourseId(null)
    if (data?.success) {
      setCourseInvitations(prev => prev.filter(i => i.id_invitacion !== id))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("student-dashboard")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              aria-label="Regresar al panel del estudiante"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-black text-foreground leading-none">Unirse a un Curso</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Código de curso o invitación</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-7 space-y-6">

        {/* Hero */}
        <section aria-label="Unirse a un curso">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-xl shadow-primary/20">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-xl" aria-hidden />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-white" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-black text-white leading-tight">Ingresa el código de tu docente</h2>
                <p className="text-sm text-white/80 mt-0.5">Código de 6 caracteres o acepta una invitación pendiente</p>
              </div>
            </div>
          </div>
        </section>

        {/* Código de curso */}
        <section aria-label="Unirse por código de curso">
          <h2 className="text-lg font-bold mb-3 text-foreground">Código de curso</h2>
          <Card className="border-2">
            <CardContent className="py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Pídele a tu docente el código de 6 caracteres del curso e ingrésalo aquí.
              </p>
              <div className="flex gap-3">
                <Input
                  value={courseCode}
                  onChange={e =>
                    setCourseCode(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
                    )
                  }
                  placeholder="ABC123"
                  maxLength={6}
                  className="h-14 text-2xl font-mono tracking-[0.4em] text-center uppercase flex-1"
                  aria-label="Código de curso de 6 caracteres"
                  onKeyDown={e => e.key === "Enter" && handleJoinByCourseCode()}
                />
                <Button
                  onClick={handleJoinByCourseCode}
                  disabled={joiningCourse || courseCode.trim().length !== 6}
                  className="h-14 px-6 text-base"
                >
                  <Hash className="w-4 h-4 mr-2" aria-hidden="true" />
                  {joiningCourse ? "Uniéndome…" : "Unirme"}
                </Button>
              </div>
              {courseMsg && (
                <p
                  className={`text-sm rounded-md px-3 py-2 ${
                    courseMsg.ok
                      ? "bg-success/10 text-success border border-success/30"
                      : "bg-destructive/10 text-destructive border border-destructive/30"
                  }`}
                  role="alert"
                >
                  {courseMsg.text}
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Invitaciones de curso */}
        <section aria-label="Invitaciones de curso pendientes">
          <h2 className="text-lg font-bold mb-3 text-foreground">Invitaciones de curso</h2>
          {loadingCourseInv ? (
            <ul className="space-y-3 list-none p-0" aria-busy="true" aria-label="Cargando invitaciones">
              {[1, 2].map((i) => (
                <li key={i}>
                  <div className="rounded-xl border-2 border-border bg-card p-4 flex items-center justify-between gap-4 animate-pulse">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-40 rounded-md bg-muted" />
                      <div className="h-3 w-28 rounded-md bg-muted" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-20 rounded-md bg-muted" />
                      <div className="h-8 w-20 rounded-md bg-muted" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : courseInvitations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tienes invitaciones de curso pendientes.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3 list-none p-0">
              {courseInvitations.map(inv => (
                <li key={inv.id_invitacion}>
                  <article>
                    <Card className="border-2">
                      <CardContent className="py-4 flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p className="font-semibold text-foreground">
                            {inv.curso?.titulo ?? "—"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Invitación de {inv.docente?.nombre ?? "tu docente"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleCourseInvitation(inv.id_invitacion, true)}
                            disabled={actionCourseId === inv.id_invitacion}
                            className="bg-success hover:bg-success/80 text-white"
                            aria-label={`Aceptar invitación al curso ${inv.curso?.titulo}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" aria-hidden="true" />
                            Aceptar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCourseInvitation(inv.id_invitacion, false)}
                            disabled={actionCourseId === inv.id_invitacion}
                            aria-label={`Rechazar invitación al curso ${inv.curso?.titulo}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                            Rechazar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <VoiceAssistant
        subpageName="unirse"
        subpageMessage={
          loadingCourseInv ? undefined
          : courseInvitations.length === 0
            ? "¡Aquí puedes unirte a un curso nuevo! Pídele a tu docente el código de 6 caracteres e ingrésalo en el campo de arriba. Por ahora no tienes invitaciones pendientes."
            : courseInvitations.length === 1
              ? `¡Aquí puedes unirte a un curso nuevo! Tienes una invitación pendiente del curso ${courseInvitations[0].curso?.titulo ?? "desconocido"}, de ${courseInvitations[0].docente?.nombre ?? "tu docente"}. Puedes aceptarla o rechazarla desde aquí.`
              : `¡Aquí puedes unirte a un curso nuevo! Tienes ${courseInvitations.length} invitaciones pendientes. Puedes aceptarlas o rechazarlas desde aquí.`
        }
        firstName=""
        estrellasTotales={0}
        nivelActual={0}
        nivelNombre=""
        streakDays={0}
        courses={[]}
        onNavigate={onNavigate}
        onBack={() => onNavigate("student-dashboard")}
      />
    </div>
  )
}
