"use client"

import { useState, useEffect } from "react"
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
  pendiente: { label: "Pendiente",  icon: Clock,         color: "text-amber-700 bg-amber-100 border-amber-200"  },
  aceptada:  { label: "Aceptada",   icon: CheckCircle2,  color: "text-green-700 bg-green-100 border-green-200"  },
  rechazada: { label: "Rechazada",  icon: XCircle,       color: "text-destructive bg-destructive/10 border-destructive/20" },
}

export function CourseInvite({ courseId, courseName, onBack }: CourseInviteProps) {
  const { user } = useAuth()

  const [tab, setTab] = useState<"email" | "list">("email")

  const [email,     setEmail]     = useState("")
  const [searching, setSearching] = useState(false)
  const [emailMsg,  setEmailMsg]  = useState<{ ok: boolean; text: string } | null>(null)

  const [disponibles, setDisponibles] = useState<Alumno[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [sending,     setSending]     = useState(false)
  const [listMsg,     setListMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  const [invitaciones, setInvitaciones] = useState<Invitation[]>([])
  const [loadingInv,   setLoadingInv]   = useState(true)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)

  useEffect(() => { loadInvitaciones() }, [courseId])
  useEffect(() => { if (tab === "list") loadDisponibles() }, [tab])

  async function loadInvitaciones() {
    setLoadingInv(true)
    const { data } = await supabase
      .from("invitacion_curso")
      .select(`id_invitacion, estado, fecha_creacion, alumno:id_alumno ( nombre, correo )`)
      .eq("id_curso", courseId)
      .eq("id_docente", user!.id)
      .order("fecha_creacion", { ascending: false })
    setInvitaciones((data as any[]) ?? [])
    setLoadingInv(false)
  }

  async function loadDisponibles() {
    if (!user) return
    setLoadingList(true)

    const { data: grupos } = await supabase.from("grupo").select("id_grupo").eq("id_docente", user.id)
    const grupoIds = grupos?.map((g: any) => g.id_grupo) ?? []
    if (grupoIds.length === 0) { setDisponibles([]); setLoadingList(false); return }

    const { data: enGrupos } = await supabase
      .from("alumno_grupo")
      .select("id_alumno, perfil:id_alumno ( id_perfil, nombre, correo )")
      .in("id_grupo", grupoIds)

    const { data: yaInscritos } = await supabase.from("alumno_curso").select("id_alumno").eq("id_curso", courseId)
    const { data: yaInvitados } = await supabase.from("invitacion_curso").select("id_alumno").eq("id_curso", courseId).eq("estado", "pendiente")

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
    setSearching(true); setEmailMsg(null)

    const { data: alumno } = await supabase.from("perfil").select("id_perfil, nombre, correo")
      .eq("correo", correo).eq("rol", "alumno").maybeSingle()

    if (!alumno) { setEmailMsg({ ok: false, text: "No se encontró un alumno con ese correo." }); setSearching(false); return }

    const { data: yaInscrito } = await supabase.from("alumno_curso").select("id_alumno")
      .eq("id_curso", courseId).eq("id_alumno", alumno.id_perfil).maybeSingle()

    if (yaInscrito) { setEmailMsg({ ok: false, text: `${alumno.nombre} ya está inscrito en este curso.` }); setSearching(false); return }

    const { error } = await supabase.from("invitacion_curso").insert({ id_curso: courseId, id_docente: user.id, id_alumno: alumno.id_perfil })

    setSearching(false)
    if (error) {
      setEmailMsg({ ok: false, text: error.code === "23505" ? `Ya enviaste una invitación a ${alumno.nombre}.` : error.message })
    } else {
      setEmailMsg({ ok: true, text: `Invitación enviada a ${alumno.nombre}.` })
      setEmail("")
      loadInvitaciones()
    }
    setTimeout(() => setEmailMsg(null), 5000)
  }

  async function handleInviteSelected() {
    if (!user || selected.size === 0) return
    setSending(true); setListMsg(null)

    const rows = Array.from(selected).map((id) => ({ id_curso: courseId, id_docente: user.id, id_alumno: id }))
    const { error } = await supabase.from("invitacion_curso").insert(rows)
    setSending(false)

    if (error) {
      setListMsg({ ok: false, text: "Error al enviar algunas invitaciones." })
    } else {
      setListMsg({ ok: true, text: `${selected.size} invitación${selected.size > 1 ? "es" : ""} enviada${selected.size > 1 ? "s" : ""}.` })
      setSelected(new Set()); loadInvitaciones(); loadDisponibles()
    }
    setTimeout(() => setListMsg(null), 5000)
  }

  async function handleDeleteInvitation(id: string) {
    setDeletingId(id)
    await supabase.from("invitacion_curso").delete().eq("id_invitacion", id)
    setInvitaciones((prev) => prev.filter((i) => i.id_invitacion !== id))
    setDeletingId(null); loadDisponibles()
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
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-6">
          <button type="button" onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
            aria-label="Volver">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground leading-none">Invitar Alumnos</h1>
            {courseName && <p className="text-xs text-muted-foreground mt-0.5">{courseName}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">

        {/* Tabs */}
        <div role="tablist" className="flex gap-1 bg-muted p-1 rounded-xl">
          {([
            { id: "email", label: "Por correo", Icon: Mail },
            { id: "list",  label: "Mis alumnos", Icon: Users },
          ] as const).map(({ id, label, Icon }) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-4 h-4" aria-hidden="true" />{label}
            </button>
          ))}
        </div>

        {/* Tab: Email */}
        {tab === "email" && (
          <section aria-label="Invitar por correo electrónico">
            <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
              <p className="text-xs text-muted-foreground">Escribe el correo del alumno que quieres invitar a este curso.</p>
              <div className="flex gap-2">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="alumno@correo.com" className="border-border flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleInviteByEmail()}
                  aria-label="Correo del alumno" />
                <button type="button" onClick={handleInviteByEmail}
                  disabled={searching || !email.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
                  <Search className="w-4 h-4" aria-hidden="true" />
                  {searching ? "Buscando…" : "Invitar"}
                </button>
              </div>
              {emailMsg && (
                <p className={`text-sm rounded-xl px-3 py-2 border ${
                  emailMsg.ok
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }`} role="alert">{emailMsg.text}</p>
              )}
            </div>
          </section>
        )}

        {/* Tab: List */}
        {tab === "list" && (
          <section aria-label="Seleccionar alumnos de tus grupos">
            {loadingList ? (
              <ul className="space-y-1.5 list-none p-0" aria-busy="true" aria-label="Cargando alumnos">
                {[1, 2, 3].map(i => (
                  <li key={i}>
                    <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-28 rounded-md bg-muted" />
                        <div className="h-3 w-40 rounded-md bg-muted" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : disponibles.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card shadow-sm py-10 text-center">
                <p className="text-sm text-muted-foreground">No hay alumnos disponibles para invitar.</p>
                <p className="text-xs text-muted-foreground mt-1">Ya están inscritos o tienen invitación pendiente.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
                <p className="text-xs text-muted-foreground">Selecciona uno o varios alumnos para invitar.</p>
                <ul className="space-y-1.5 list-none p-0 max-h-72 overflow-y-auto">
                  {disponibles.map((a) => (
                    <li key={a.id_perfil}>
                      <button type="button" onClick={() => toggleSelect(a.id_perfil)}
                        className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                          selected.has(a.id_perfil)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/40 hover:bg-muted"
                        }`}
                        aria-pressed={selected.has(a.id_perfil)}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          selected.has(a.id_perfil) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}>
                          {a.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{a.nombre}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.correo}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                {listMsg && (
                  <p className={`text-sm rounded-xl px-3 py-2 border ${
                    listMsg.ok
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`} role="alert">{listMsg.text}</p>
                )}

                <button type="button" onClick={handleInviteSelected}
                  disabled={sending || selected.size === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                  <Send className="w-4 h-4" aria-hidden="true" />
                  {sending ? "Enviando…" : `Invitar${selected.size > 0 ? ` (${selected.size})` : ""}`}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Sent invitations */}
        <section aria-label="Invitaciones enviadas">
          <h2 className="text-sm font-semibold text-foreground mb-3">Invitaciones enviadas</h2>
          {loadingInv ? (
            <ul className="space-y-2 list-none p-0" aria-busy="true" aria-label="Cargando invitaciones">
              {[1, 2].map(i => (
                <li key={i}>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-4 animate-pulse">
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-32 rounded-md bg-muted" />
                      <div className="h-3 w-48 rounded-md bg-muted" />
                    </div>
                    <div className="h-6 w-20 rounded-full bg-muted shrink-0" />
                  </div>
                </li>
              ))}
            </ul>
          ) : invitaciones.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card shadow-sm py-8 text-center">
              <p className="text-sm text-muted-foreground">No hay invitaciones enviadas para este curso.</p>
            </div>
          ) : (
            <ul className="space-y-2 list-none p-0">
              {invitaciones.map((inv) => {
                const cfg = ESTADO_CONFIG[inv.estado] ?? ESTADO_CONFIG.pendiente
                const IconComp = cfg.icon
                return (
                  <li key={inv.id_invitacion}>
                    <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-4 flex-wrap shadow-sm">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{inv.alumno?.nombre ?? "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{inv.alumno?.correo ?? ""}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                          <IconComp className="w-3 h-3" aria-hidden="true" />
                          {cfg.label}
                        </span>
                        {inv.estado === "pendiente" && (
                          <button type="button"
                            onClick={() => handleDeleteInvitation(inv.id_invitacion)}
                            disabled={deletingId === inv.id_invitacion}
                            aria-label={`Cancelar invitación a ${inv.alumno?.nombre}`}
                            className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
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
