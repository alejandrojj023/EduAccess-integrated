"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, BookOpen, CheckCircle2, XCircle, Hash } from "lucide-react"

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
      <header className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onNavigate("student-dashboard")}
            aria-label="Regresar al panel del estudiante"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Unirse a un Curso</h1>
              <p className="text-sm opacity-90">Código de curso o invitación</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">

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
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
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
            <p className="text-muted-foreground">Cargando invitaciones…</p>
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
                            className="bg-green-600 hover:bg-green-700 text-white"
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
    </div>
  )
}
