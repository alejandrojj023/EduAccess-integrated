"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import {
  ArrowLeft,
  Mail,
  Users,
  Search,
  Send,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface CourseInviteProps {
  courseId: string
  courseName: string | null
  onBack: () => void
}

interface Invitation {
  id_invitacion: string
  estado: "pendiente" | "aceptada" | "rechazada"
  fecha_creacion: string
  alumno: { nombre: string; correo: string } | null
}

interface Alumno {
  id_perfil: string
  nombre: string
  correo: string
}

const ESTADO_CONFIG = {
  pendiente:  { label: "Pendiente",  icon: Clock,         color: "text-amber-600  bg-amber-50  border-amber-200"  },
  aceptada:   { label: "Aceptada",   icon: CheckCircle2,  color: "text-green-600  bg-green-50  border-green-200"  },
  rechazada:  { label: "Rechazada",  icon: XCircle,       color: "text-red-600    bg-red-50    border-red-200"    },
}

export function CourseInvite({ courseId, courseName, onBack }: CourseInviteProps) {
  const { user } = useAuth()

  const [tab, setTab]           = useState<"email" | "list">("email")

  // Pestaña email
  const [email,     setEmail]     = useState("")
  const [searching, setSearching] = useState(false)
  const [emailMsg,  setEmailMsg]  = useState<{ ok: boolean; text: string } | null>(null)

  // Pestaña lista
  const [disponibles, setDisponibles] = useState<Alumno[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [sending,     setSending]     = useState(false)
  const [listMsg,     setListMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  // Invitaciones enviadas
  const [invitaciones,    setInvitaciones]    = useState<Invitation[]>([])
  const [loadingInv,      setLoadingInv]      = useState(true)
  const [deletingId,      setDeletingId]      = useState<string | null>(null)

  useEffect(() => {
    loadInvitaciones()
  }, [courseId])

  useEffect(() => {
    if (tab === "list") loadDisponibles()
  }, [tab])

  async function loadInvitaciones() {
    setLoadingInv(true)
    const { data } = await supabase
      .from("invitacion_curso")
      .select(`
        id_invitacion,
        estado,
        fecha_creacion,
        alumno:id_alumno ( nombre, correo )
      `)
      .eq("id_curso", courseId)
      .eq("id_docente", user!.id)
      .order("fecha_creacion", { ascending: false })
    setInvitaciones((data as any[]) ?? [])
    setLoadingInv(false)
  }

  async function loadDisponibles() {
    if (!user) return
    setLoadingList(true)

    // Grupos del docente
    const { data: grupos } = await supabase
      .from("grupo")
      .select("id_grupo")
      .eq("id_docente", user.id)

    const grupoIds = grupos?.map((g: any) => g.id_grupo) ?? []
    if (grupoIds.length === 0) {
      setDisponibles([])
      setLoadingList(false)
      return
    }

    // Alumnos en esos grupos
    const { data: enGrupos } = await supabase
      .from("alumno_grupo")
      .select("id_alumno, perfil:id_alumno ( id_perfil, nombre, correo )")
      .in("id_grupo", grupoIds)

    // Alumnos ya inscritos en este curso
    const { data: yaInscritos } = await supabase
      .from("alumno_curso")
      .select("id_alumno")
      .eq("id_curso", courseId)

    // Alumnos con invitación ya enviada (pendiente)
    const { data: yaInvitados } = await supabase
      .from("invitacion_curso")
      .select("id_alumno")
      .eq("id_curso", courseId)
      .eq("estado", "pendiente")

    const excluidos = new Set([
      ...(yaInscritos?.map((a: any) => a.id_alumno) ?? []),
      ...(yaInvitados?.map((a: any) => a.id_alumno) ?? []),
    ])

    const vistos = new Set<string>()
    const lista: Alumno[] = []
    for (const row of (enGrupos ?? []) as any[]) {
      const p = row.perfil
      if (!p || excluidos.has(p.id_perfil) || vistos.has(p.id_perfil)) continue
      vistos.add(p.id_perfil)
      lista.push({ id_perfil: p.id_perfil, nombre: p.nombre, correo: p.correo })
    }

    setDisponibles(lista)
    setLoadingList(false)
  }

  async function handleInviteByEmail() {
    const correo = email.trim().toLowerCase()
    if (!correo || !user) return
    setSearching(true)
    setEmailMsg(null)

    const { data: alumno } = await supabase
      .from("perfil")
      .select("id_perfil, nombre, correo")
      .eq("correo", correo)
      .eq("rol", "alumno")
      .maybeSingle()

    if (!alumno) {
      setEmailMsg({ ok: false, text: "No se encontró un alumno con ese correo." })
      setSearching(false)
      return
    }

    // Verificar que no esté ya inscrito o invitado
    const { data: yaInscrito } = await supabase
      .from("alumno_curso")
      .select("id_alumno")
      .eq("id_curso", courseId)
      .eq("id_alumno", alumno.id_perfil)
      .maybeSingle()

    if (yaInscrito) {
      setEmailMsg({ ok: false, text: `${alumno.nombre} ya está inscrito en este curso.` })
      setSearching(false)
      return
    }

    const { error } = await supabase.from("invitacion_curso").insert({
      id_curso:  courseId,
      id_docente: user.id,
      id_alumno: alumno.id_perfil,
    })

    setSearching(false)
    if (error) {
      if (error.code === "23505") {
        setEmailMsg({ ok: false, text: `Ya enviaste una invitación a ${alumno.nombre}.` })
      } else {
        setEmailMsg({ ok: false, text: error.message })
      }
    } else {
      setEmailMsg({ ok: true, text: `Invitación enviada a ${alumno.nombre}.` })
      setEmail("")
      loadInvitaciones()
    }
    setTimeout(() => setEmailMsg(null), 5000)
  }

  async function handleInviteSelected() {
    if (!user || selected.size === 0) return
    setSending(true)
    setListMsg(null)

    const rows = Array.from(selected).map((id) => ({
      id_curso:   courseId,
      id_docente: user.id,
      id_alumno:  id,
    }))

    const { error } = await supabase.from("invitacion_curso").insert(rows)
    setSending(false)

    if (error) {
      setListMsg({ ok: false, text: "Error al enviar algunas invitaciones." })
    } else {
      setListMsg({ ok: true, text: `${selected.size} invitación${selected.size > 1 ? "es" : ""} enviada${selected.size > 1 ? "s" : ""}.` })
      setSelected(new Set())
      loadInvitaciones()
      loadDisponibles()
    }
    setTimeout(() => setListMsg(null), 5000)
  }

  async function handleDeleteInvitation(id: string) {
    setDeletingId(id)
    await supabase.from("invitacion_curso").delete().eq("id_invitacion", id)
    setInvitaciones((prev) => prev.filter((i) => i.id_invitacion !== id))
    setDeletingId(null)
    loadDisponibles()
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
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
            <h1 className="text-2xl font-bold text-foreground">Invitar Alumnos</h1>
            {courseName && (
              <p className="text-sm text-muted-foreground">{courseName}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* ── Tabs ── */}
        <div role="tablist" className="flex gap-2 bg-muted p-1 rounded-xl">
          <button
            role="tab"
            aria-selected={tab === "email"}
            onClick={() => setTab("email")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-base font-semibold transition-all ${
              tab === "email"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            Por correo
          </button>
          <button
            role="tab"
            aria-selected={tab === "list"}
            onClick={() => setTab("list")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-base font-semibold transition-all ${
              tab === "list"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" aria-hidden="true" />
            Mis alumnos
          </button>
        </div>

        {/* ── Tab: Correo ── */}
        {tab === "email" && (
          <section aria-label="Invitar por correo electrónico">
            <Card className="border-2">
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Escribe el correo del alumno que quieres invitar a este curso.
                </p>
                <div className="flex gap-3">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alumno@correo.com"
                    className="h-12 text-base border-2 flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleInviteByEmail()}
                    aria-label="Correo del alumno"
                  />
                  <Button
                    onClick={handleInviteByEmail}
                    disabled={searching || !email.trim()}
                    className="h-12 px-5"
                  >
                    <Search className="w-4 h-4 mr-2" aria-hidden="true" />
                    {searching ? "Buscando…" : "Invitar"}
                  </Button>
                </div>
                {emailMsg && (
                  <p
                    className={`text-sm rounded-md px-3 py-2 border ${
                      emailMsg.ok
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                    role="alert"
                  >
                    {emailMsg.text}
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Tab: Lista de alumnos ── */}
        {tab === "list" && (
          <section aria-label="Seleccionar alumnos de tus grupos">
            {loadingList ? (
              <p className="text-muted-foreground">Cargando alumnos…</p>
            ) : disponibles.length === 0 ? (
              <Card className="border-2">
                <CardContent className="py-10 text-center text-muted-foreground">
                  No hay alumnos disponibles para invitar.
                  <br />
                  <span className="text-sm">
                    Ya están inscritos o tienen invitación pendiente.
                  </span>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2">
                <CardContent className="pt-4 space-y-3">
                  <p className="text-sm text-muted-foreground pb-1">
                    Selecciona uno o varios alumnos para invitar.
                  </p>
                  <ul className="space-y-2 list-none p-0 max-h-72 overflow-y-auto">
                    {disponibles.map((a) => (
                      <li key={a.id_perfil}>
                        <button
                          type="button"
                          onClick={() => toggleSelect(a.id_perfil)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            selected.has(a.id_perfil)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/40 hover:bg-muted"
                          }`}
                          aria-pressed={selected.has(a.id_perfil)}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            selected.has(a.id_perfil)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted-foreground/20 text-foreground"
                          }`}>
                            {a.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{a.nombre}</p>
                            <p className="text-sm text-muted-foreground truncate">{a.correo}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {listMsg && (
                    <p
                      className={`text-sm rounded-md px-3 py-2 border ${
                        listMsg.ok
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                      role="alert"
                    >
                      {listMsg.text}
                    </p>
                  )}

                  <Button
                    onClick={handleInviteSelected}
                    disabled={sending || selected.size === 0}
                    className="w-full h-12 text-base"
                  >
                    <Send className="w-4 h-4 mr-2" aria-hidden="true" />
                    {sending
                      ? "Enviando…"
                      : `Invitar ${selected.size > 0 ? `(${selected.size})` : ""}`}
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* ── Invitaciones enviadas ── */}
        <section aria-label="Invitaciones enviadas">
          <h2 className="text-xl font-bold text-foreground mb-4">Invitaciones enviadas</h2>
          {loadingInv ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : invitaciones.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay invitaciones enviadas para este curso.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3 list-none p-0">
              {invitaciones.map((inv) => {
                const cfg = ESTADO_CONFIG[inv.estado] ?? ESTADO_CONFIG.pendiente
                const IconComp = cfg.icon
                return (
                  <li key={inv.id_invitacion}>
                    <Card className="border-2">
                      <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {inv.alumno?.nombre ?? "—"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {inv.alumno?.correo ?? ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border ${cfg.color}`}>
                            <IconComp className="w-3.5 h-3.5" aria-hidden="true" />
                            {cfg.label}
                          </span>
                          {inv.estado === "pendiente" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteInvitation(inv.id_invitacion)}
                              disabled={deletingId === inv.id_invitacion}
                              aria-label={`Cancelar invitación a ${inv.alumno?.nombre}`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
