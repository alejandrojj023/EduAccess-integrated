"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { useAccessibility } from "@/lib/accessibility-context"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  UserPlus,
  Volume2,
  Pause,
  Play,
  RotateCcw,
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
  colorPerfil: string | null
}

const ESTADO_CONFIG = {
  pendiente: { label: "Pendiente",  icon: Clock,         color: "text-amber-700 bg-amber-100 border-amber-200"  },
  aceptada:  { label: "Aceptada",   icon: CheckCircle2,  color: "text-green-700 bg-green-100 border-green-200"  },
  rechazada: { label: "Rechazada",  icon: XCircle,       color: "text-destructive bg-destructive/10 border-destructive/20" },
}

export function CourseInvite({ courseId, courseName, onBack }: CourseInviteProps) {
  const { user } = useAuth()
  const { speak, stopSpeak, settings } = useAccessibility()
  const [inviteAudioState, setInviteAudioState] = useState<"idle" | "playing" | "paused" | "ended">("idle")

  const [tab, setTab] = useState<"email" | "list">("email")

  const [email,       setEmail]       = useState("")
  const [searching,   setSearching]   = useState(false)
  const [foundAlumno, setFoundAlumno] = useState<(Alumno & { alreadyInvited?: boolean; alreadyEnrolled?: boolean }) | null>(null)
  const [inviting,    setInviting]    = useState(false)
  const [emailMsg,    setEmailMsg]    = useState<{ ok: boolean; text: string } | null>(null)

  const [disponibles,   setDisponibles]   = useState<Alumno[]>([])
  const [loadingList,   setLoadingList]   = useState(false)
  const [invitingListId, setInvitingListId] = useState<string | null>(null)
  const [listMsg,       setListMsg]       = useState<{ ok: boolean; text: string } | null>(null)

  const [invitaciones, setInvitaciones] = useState<Invitation[]>([])
  const [loadingInv,   setLoadingInv]   = useState(true)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [invToDelete,  setInvToDelete]  = useState<string | null>(null)

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
      .select("id_alumno, perfil:id_alumno ( id_perfil, nombre, correo, color_perfil )")
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
      lista.push({ id_perfil: p.id_perfil, nombre: p.nombre, correo: p.correo, colorPerfil: p.color_perfil ?? null })
    }

    setDisponibles(lista)
    setLoadingList(false)
  }

  async function handleSearchByEmail() {
    const correo = email.trim().toLowerCase()
    if (!correo || !user) return
    setSearching(true); setEmailMsg(null); setFoundAlumno(null)

    const { data: alumno } = await supabase.from("perfil").select("id_perfil, nombre, correo, color_perfil")
      .eq("correo", correo).eq("rol", "alumno").maybeSingle()

    if (!alumno) {
      setEmailMsg({ ok: false, text: "No se encontró un alumno con ese correo." })
      setSearching(false)
      return
    }

    const [{ data: yaInscrito }, { data: yaInvitado }] = await Promise.all([
      supabase.from("alumno_curso").select("id_alumno").eq("id_curso", courseId).eq("id_alumno", alumno.id_perfil).maybeSingle(),
      supabase.from("invitacion_curso").select("id_alumno").eq("id_curso", courseId).eq("id_alumno", alumno.id_perfil).eq("estado", "pendiente").maybeSingle(),
    ])

    setFoundAlumno({
      id_perfil: alumno.id_perfil,
      nombre: alumno.nombre,
      correo: alumno.correo,
      colorPerfil: (alumno as any).color_perfil ?? null,
      alreadyEnrolled: !!yaInscrito,
      alreadyInvited: !!yaInvitado,
    })
    setEmail("")
    setSearching(false)
  }

  async function handleConfirmInvite() {
    if (!foundAlumno || !user) return
    setInviting(true); setEmailMsg(null)

    const { error } = await supabase.from("invitacion_curso").insert({
      id_curso: courseId, id_docente: user.id, id_alumno: foundAlumno.id_perfil,
    })

    setInviting(false)
    if (error) {
      setEmailMsg({ ok: false, text: error.code === "23505" ? `Ya enviaste una invitación a ${foundAlumno.nombre}.` : error.message })
    } else {
      setEmailMsg({ ok: true, text: `Invitación enviada a ${foundAlumno.nombre}.` })
      setEmail(""); setFoundAlumno(null)
      loadInvitaciones()
    }
    setTimeout(() => setEmailMsg(null), 5000)
  }

  async function handleInviteOne(alumno: Alumno) {
    if (!user) return
    setInvitingListId(alumno.id_perfil); setListMsg(null)

    const { error } = await supabase.from("invitacion_curso").insert({
      id_curso: courseId, id_docente: user.id, id_alumno: alumno.id_perfil,
    })

    setInvitingListId(null)
    if (error) {
      setListMsg({ ok: false, text: error.code === "23505" ? `Ya enviaste una invitación a ${alumno.nombre}.` : error.message })
    } else {
      setListMsg({ ok: true, text: `Invitación enviada a ${alumno.nombre}.` })
      loadInvitaciones(); loadDisponibles()
    }
    setTimeout(() => setListMsg(null), 5000)
  }

  async function handleDeleteInvitation(id: string) {
    setDeletingId(id)
    await supabase.from("invitacion_curso").delete().eq("id_invitacion", id)
    setInvitaciones((prev) => prev.filter((i) => i.id_invitacion !== id))
    setDeletingId(null); loadDisponibles()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-6">
          <button type="button" onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
            aria-label="Volver">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground leading-none">Invitar Alumnos</h1>
            {courseName && <p className="text-xs text-muted-foreground mt-0.5">{courseName}</p>}
          </div>
          {settings.voiceEnabled && (
            <button type="button"
              onClick={async () => {
                const text = `Invitar alumnos al curso ${courseName ?? ""}. Busca por correo electrónico o selecciona de tu lista de alumnos.`
                if (inviteAudioState === "playing") { stopSpeak(); setInviteAudioState("paused") }
                else { setInviteAudioState("playing"); await speak(text); setInviteAudioState("ended") }
              }}
              aria-label={inviteAudioState === "playing" ? "Pausar" : inviteAudioState === "paused" ? "Reanudar" : inviteAudioState === "ended" ? "Repetir" : "Escuchar instrucciones"}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
              {inviteAudioState === "playing" ? <Pause className="w-4 h-4" aria-hidden="true" />
               : inviteAudioState === "paused" ? <Play className="w-4 h-4" aria-hidden="true" />
               : inviteAudioState === "ended"  ? <RotateCcw className="w-4 h-4" aria-hidden="true" />
               : <Volume2 className="w-4 h-4" aria-hidden="true" />}
              <span className="hidden sm:inline">
                {inviteAudioState === "playing" ? "Pausar" : inviteAudioState === "paused" ? "Reanudar" : inviteAudioState === "ended" ? "Repetir" : "Escuchar"}
              </span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">

        {/* Tabs */}
        <div role="tablist" className="flex gap-1 bg-muted p-1 rounded-xl">
          {([
            { id: "email", label: "Por correo", Icon: Mail },
            { id: "list",  label: "Mis alumnos", Icon: Users },
          ] as const).map(({ id, label, Icon }) => (
            <button key={id}
              type="button"
              id={`tab-${id}`}
              role="tab"
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-4 h-4" aria-hidden="true" />{label}
            </button>
          ))}
        </div>

        {/* Tab: Email */}
        {tab === "email" && (
          <section id="panel-email" role="tabpanel" aria-labelledby="tab-email" aria-label="Invitar por correo electrónico">
            <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
              <p className="text-xs text-muted-foreground">Escribe el correo del alumno que quieres invitar a este curso.</p>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFoundAlumno(null); setEmailMsg(null) }}
                  placeholder="alumno@correo.com"
                  className="border-border pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSearchByEmail()}
                  aria-label="Correo del alumno"
                />
                <button
                  type="button"
                  onClick={handleSearchByEmail}
                  disabled={searching || !email.trim()}
                  aria-label="Buscar alumno"
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Resultado de búsqueda */}
              {foundAlumno && (
                <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: foundAlumno.colorPerfil ?? "#94a3b8" }}
                  >
                    {foundAlumno.nombre.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{foundAlumno.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{foundAlumno.correo}</p>
                  </div>

                  {foundAlumno.alreadyEnrolled ? (
                    <span className="shrink-0 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                      Inscrito
                    </span>
                  ) : foundAlumno.alreadyInvited ? (
                    <span className="shrink-0 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                      Invitado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmInvite}
                      disabled={inviting}
                      aria-label={`Invitar a ${foundAlumno.nombre}`}
                      className="shrink-0 flex items-center justify-center rounded-xl p-2 text-primary hover:bg-primary/10 transition-colors active:scale-[0.97] disabled:opacity-50"
                    >
                      <UserPlus className="w-5 h-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

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
          <section id="panel-list" role="tabpanel" aria-labelledby="tab-list" aria-label="Seleccionar alumnos de tus grupos">
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
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-3">
                <p className="text-xs text-muted-foreground">Toca el ícono para invitar a un alumno.</p>

                {listMsg && (
                  <p className={`text-sm rounded-xl px-3 py-2 border ${
                    listMsg.ok
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`} role="alert">{listMsg.text}</p>
                )}

                <ul className="space-y-1.5 list-none p-0 max-h-72 overflow-y-auto">
                  {disponibles.map((a) => (
                    <li key={a.id_perfil}>
                      <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                        <div
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: a.colorPerfil ?? "#94a3b8" }}
                        >
                          {a.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{a.nombre}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.correo}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInviteOne(a)}
                          disabled={invitingListId === a.id_perfil}
                          aria-label={`Invitar a ${a.nombre}`}
                          className="shrink-0 flex items-center justify-center rounded-xl p-2 text-primary hover:bg-primary/10 transition-colors active:scale-[0.97] disabled:opacity-50"
                        >
                          <UserPlus className="w-5 h-5" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
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
                    <article aria-label={`Invitación a ${inv.alumno?.nombre ?? "alumno"}, estado: ${cfg.label}`}
                      className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-4 flex-wrap shadow-sm">
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
                            onClick={() => setInvToDelete(inv.id_invitacion)}
                            disabled={deletingId === inv.id_invitacion}
                            aria-label={`Cancelar invitación a ${inv.alumno?.nombre}`}
                            className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      <AlertDialog open={invToDelete !== null} onOpenChange={(open) => { if (!open) setInvToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar invitación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cancelará la invitación pendiente. El alumno no podrá aceptarla. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (invToDelete) handleDeleteInvitation(invToDelete); setInvToDelete(null) }}
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
