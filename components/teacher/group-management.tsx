"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft, Copy, Check, Users, Send,
  Plus, Pencil, Trash2, X,
} from "lucide-react"

interface Group {
  id_grupo: string
  nombre: string
  grado: string
  seccion: string | null
  codigo_clase: string
}

interface Invitation {
  id_invitacion: string
  estado: string
  fecha_creacion: string
  alumno: { nombre: string; correo: string } | null
  grupo: { nombre: string } | null
}

interface GroupManagementProps {
  onNavigate: (screen: string) => void
}

const gradeLabel = (g: string) =>
  g === "1" ? "1er Grado" : g === "2" ? "2do Grado" : "3er Grado"

const gradoShort: Record<string, string> = { "1": "1ro", "2": "2do", "3": "3ro" }
const SECCIONES_RAPIDAS = ["A", "B", "C", "D"]

const statusMeta = (s: string) => {
  if (s === "pendiente")  return { label: "Pendiente",  cls: "text-amber-700 bg-amber-100 border border-amber-200" }
  if (s === "aceptada")   return { label: "Aceptada",   cls: "text-green-700 bg-green-100 border border-green-200" }
  return                         { label: "Rechazada",  cls: "text-destructive bg-destructive/10 border border-destructive/20" }
}

export function GroupManagement({ onNavigate }: GroupManagementProps) {
  const { user } = useAuth()

  const [groups,      setGroups]      = useState<Group[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading,     setLoading]     = useState(true)
  const [copiedId,    setCopiedId]    = useState<string | null>(null)

  // Form: crear grupo
  const [newGrade,   setNewGrade]   = useState("")
  const [newSection, setNewSection] = useState("")
  const [creating,   setCreating]   = useState(false)
  const [createMsg,  setCreateMsg]  = useState<{ ok: boolean; text: string } | null>(null)

  // Editar / eliminar grupo
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editSec,    setEditSec]    = useState("")
  const [saving,     setSaving]     = useState(false)
  const [editMsg,    setEditMsg]    = useState<{ ok: boolean; text: string } | null>(null)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  // Form: invitar alumno
  const [email,           setEmail]           = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [sending,         setSending]         = useState(false)
  const [msg,             setMsg]             = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const [groupsRes, invRes] = await Promise.all([
      supabase
        .from("grupo")
        .select("id_grupo, nombre, grado, seccion, codigo_clase")
        .eq("id_docente", user!.id)
        .order("grado"),
      fetch("/api/invitations", {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    ])

    if (groupsRes.data) setGroups(groupsRes.data)
    if (invRes.data)    setInvitations(invRes.data)
    setLoading(false)
  }

  async function handleCreateGroup() {
    if (!newGrade || !newSection.trim()) return
    setCreating(true)
    setCreateMsg(null)
    const seccion = newSection.trim().toUpperCase()
    const nombre  = `${gradoShort[newGrade]} ${seccion}`
    const { error } = await supabase
      .from("grupo")
      .insert({ id_docente: user!.id, grado: newGrade, seccion, nombre })
    setCreating(false)
    if (error) {
      const isDup = error.code === "23505"
      setCreateMsg({
        ok:   false,
        text: isDup
          ? `Ya tienes un grupo ${nombre}. Elige otra sección.`
          : error.message,
      })
    } else {
      setCreateMsg({ ok: true, text: `Grupo ${nombre} creado correctamente.` })
      setNewGrade("")
      setNewSection("")
      loadData()
    }
    setTimeout(() => setCreateMsg(null), 5000)
  }

  function openEdit(g: Group) {
    setEditingId(g.id_grupo)
    setEditSec(g.seccion ?? "")
    setEditMsg(null)
  }

  function closeEdit() {
    setEditingId(null)
    setEditSec("")
    setEditMsg(null)
  }

  async function handleUpdateGroup(g: Group) {
    if (!editSec.trim()) return
    setSaving(true)
    setEditMsg(null)
    const seccion = editSec.trim().toUpperCase()
    const nombre  = `${gradoShort[g.grado] ?? g.grado} ${seccion}`
    const { error } = await supabase
      .from("grupo")
      .update({ seccion, nombre })
      .eq("id_grupo", g.id_grupo)
    setSaving(false)
    if (error) {
      setEditMsg({
        ok:   false,
        text: error.code === "23505"
          ? `Ya tienes un grupo ${nombre}. Elige otra sección.`
          : error.message,
      })
    } else {
      closeEdit()
      loadData()
    }
  }

  async function handleDeleteGroup() {
    if (!deleteId) return
    setDeleting(true)
    const { error } = await supabase
      .from("grupo")
      .delete()
      .eq("id_grupo", deleteId)
    setDeleting(false)
    setDeleteId(null)
    if (!error) loadData()
  }

  async function handleCopy(code: string, id: string) {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleInvite() {
    if (!email.trim() || !selectedGroupId) return
    setSending(true)
    setMsg(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session!.access_token}`,
      },
      body: JSON.stringify({ email: email.trim().toLowerCase(), id_grupo: selectedGroupId }),
    })
    const json = await res.json()
    setSending(false)
    if (res.ok) {
      setMsg({ ok: true, text: "Invitación enviada correctamente." })
      setEmail("")
      loadData()
    } else {
      setMsg({ ok: false, text: json.error || "Error al enviar la invitación." })
    }
    setTimeout(() => setMsg(null), 5000)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-6">
          <button type="button"
            onClick={() => onNavigate("teacher-dashboard")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
            aria-label="Regresar al panel principal">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="w-4 h-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">Gestión de Grupos</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Códigos e invitaciones</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">

        {/* ── Crear grupo ── */}
        <section aria-label="Crear nuevo grupo">
          <h2 className="text-sm font-semibold text-foreground mb-3">Crear nuevo grupo</h2>
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-5">

            {/* Grado */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Grado</p>
              <div className="grid grid-cols-3 gap-3">
                {(["1", "2", "3"] as const).map((g) => (
                  <button key={g} type="button"
                    onClick={() => setNewGrade(g)}
                    className={`py-3 rounded-xl border text-center text-sm font-semibold transition-all active:scale-[0.98] ${
                      newGrade === g
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary ring-offset-1"
                        : "border-border hover:border-primary/40 hover:bg-muted text-foreground"
                    }`}
                    aria-pressed={newGrade === g}>
                    {gradoShort[g]}
                  </button>
                ))}
              </div>
            </div>

            {/* Sección */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Sección</p>
              <div className="flex gap-2 flex-wrap">
                {SECCIONES_RAPIDAS.map((s) => (
                  <button key={s} type="button"
                    onClick={() => setNewSection(s)}
                    className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all active:scale-[0.98] ${
                      newSection === s
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary ring-offset-1"
                        : "border-border hover:border-primary/40 hover:bg-muted text-foreground"
                    }`}
                    aria-pressed={newSection === s}>
                    {s}
                  </button>
                ))}
                <Input
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value.toUpperCase())}
                  placeholder="Otra"
                  maxLength={4}
                  className="w-20 text-center font-bold border-border uppercase"
                  aria-label="Sección personalizada"
                />
              </div>
            </div>

            {/* Vista previa del nombre */}
            {newGrade && newSection.trim() && (
              <p className="text-xs text-muted-foreground">
                Nombre del grupo:{" "}
                <span className="font-bold text-foreground">
                  {gradoShort[newGrade]} {newSection.trim().toUpperCase()}
                </span>
              </p>
            )}

            {createMsg && (
              <p className={`text-sm rounded-xl px-3 py-2 border ${
                createMsg.ok
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`} role="alert">
                {createMsg.text}
              </p>
            )}

            <button type="button"
              onClick={handleCreateGroup}
              disabled={creating || !newGrade || !newSection.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <Plus className="w-4 h-4" aria-hidden="true" />
              {creating ? "Creando…" : "Crear grupo"}
            </button>
          </div>
        </section>

        {/* ── Códigos de clase ── */}
        <section aria-label="Códigos de clase">
          <h2 className="text-sm font-semibold text-foreground mb-3">Códigos de clase</h2>
          {loading ? (
            <ul className="space-y-3 list-none p-0" aria-busy="true" aria-label="Cargando grupos">
              {[1, 2].map(i => (
                <li key={i}>
                  <div className="rounded-2xl border border-border bg-card px-5 py-4 animate-pulse">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="h-4 w-24 rounded-md bg-muted" />
                        <div className="h-3 w-40 rounded-md bg-muted" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-20 rounded-md bg-muted" />
                        <div className="h-9 w-9 rounded-xl bg-muted" />
                        <div className="h-9 w-9 rounded-xl bg-muted" />
                        <div className="h-9 w-9 rounded-xl bg-muted" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card py-10 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">No tienes grupos creados aún. Crea un curso para generar un grupo.</p>
            </div>
          ) : (
            <>
              {/* Modal de confirmación de eliminación */}
              {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="rounded-2xl border border-border bg-card shadow-xl p-6 max-w-sm w-full mx-4 space-y-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 mx-auto">
                      <Trash2 className="w-6 h-6 text-destructive" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      ¿Eliminar este grupo?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Se eliminará el grupo y sus alumnos inscritos quedarán sin grupo.
                      Los cursos y lecciones no se eliminan.
                    </p>
                    <div className="flex gap-3">
                      <button type="button"
                        className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] disabled:opacity-50 transition-all"
                        onClick={() => setDeleteId(null)}
                        disabled={deleting}>
                        Cancelar
                      </button>
                      <button type="button"
                        className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all"
                        onClick={handleDeleteGroup}
                        disabled={deleting}>
                        {deleting ? "Eliminando…" : "Eliminar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <ul className="space-y-3 list-none p-0">
                {groups.map(g => (
                  <li key={g.id_grupo}>
                    <div className="rounded-2xl border border-border bg-card shadow-sm px-5 py-4 space-y-3">
                      {/* Fila principal */}
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{g.nombre}</p>
                          {!g.seccion && (
                            <p className="text-xs text-amber-600 mt-0.5">Sin sección — edita para asignar una</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Comparte este código con tus alumnos
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-mono font-bold tracking-widest text-primary">
                            {g.codigo_clase}
                          </span>
                          <button type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
                            onClick={() => handleCopy(g.codigo_clase, g.id_grupo)}
                            aria-label={`Copiar código ${g.codigo_clase}`}>
                            {copiedId === g.id_grupo
                              ? <Check className="w-4 h-4 text-green-600" />
                              : <Copy className="w-4 h-4" />}
                          </button>
                          <button type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
                            onClick={() => editingId === g.id_grupo ? closeEdit() : openEdit(g)}
                            aria-label={editingId === g.id_grupo ? "Cancelar edición" : `Editar grupo ${g.nombre}`}>
                            {editingId === g.id_grupo
                              ? <X className="w-4 h-4" />
                              : <Pencil className="w-4 h-4" />}
                          </button>
                          <button type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-destructive transition-all hover:bg-destructive/10 active:scale-[0.98]"
                            onClick={() => setDeleteId(g.id_grupo)}
                            aria-label={`Eliminar grupo ${g.nombre}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Formulario de edición inline */}
                      {editingId === g.id_grupo && (
                        <div className="border-t border-border pt-3 space-y-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Editar sección del grupo{" "}
                            <span className="text-muted-foreground">({gradeLabel(g.grado)})</span>
                          </p>
                          <div className="flex gap-2 flex-wrap items-center">
                            {SECCIONES_RAPIDAS.map((s) => (
                              <button key={s} type="button"
                                onClick={() => setEditSec(s)}
                                className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all active:scale-[0.98] ${
                                  editSec === s
                                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary ring-offset-1"
                                    : "border-border hover:border-primary/40 hover:bg-muted text-foreground"
                                }`}
                                aria-pressed={editSec === s}>
                                {s}
                              </button>
                            ))}
                            <Input
                              value={editSec}
                              onChange={(e) => setEditSec(e.target.value.toUpperCase())}
                              placeholder="Otra"
                              maxLength={4}
                              className="w-20 text-center font-bold border-border uppercase"
                              aria-label="Sección personalizada"
                            />
                          </div>
                          {editSec.trim() && (
                            <p className="text-xs text-muted-foreground">
                              Nuevo nombre:{" "}
                              <span className="font-bold text-foreground">
                                {gradoShort[g.grado] ?? g.grado} {editSec.trim().toUpperCase()}
                              </span>
                            </p>
                          )}
                          {editMsg && (
                            <p className={`text-xs rounded-xl px-3 py-2 border ${
                              editMsg.ok
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }`} role="alert">
                              {editMsg.text}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <button type="button"
                              className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all"
                              onClick={() => handleUpdateGroup(g)}
                              disabled={saving || !editSec.trim()}>
                              {saving ? "Guardando…" : "Guardar"}
                            </button>
                            <button type="button"
                              className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-all"
                              onClick={closeEdit}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ── Invitar alumno ── */}
        <section aria-label="Invitar alumno por correo">
          <h2 className="text-sm font-semibold text-foreground mb-3">Invitar alumno por correo</h2>
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              El alumno debe estar registrado en EduAccess. Recibirá la invitación en su panel.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="inv-email">
                Correo del alumno
              </label>
              <Input
                id="inv-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="alumno@ejemplo.com"
                className="border-border"
                onKeyDown={e => e.key === "Enter" && handleInvite()}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="inv-group">
                Grupo destino
              </label>
              <select
                id="inv-group"
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecciona un grupo…</option>
                {groups.map(g => (
                  <option key={g.id_grupo} value={g.id_grupo}>
                    {g.nombre} — {gradeLabel(g.grado)}
                  </option>
                ))}
              </select>
            </div>

            {msg && (
              <p className={`text-sm rounded-xl px-3 py-2 border ${
                msg.ok
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`} role="alert">
                {msg.text}
              </p>
            )}

            <button type="button"
              onClick={handleInvite}
              disabled={sending || !email.trim() || !selectedGroupId}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <Send className="w-4 h-4" aria-hidden="true" />
              {sending ? "Enviando…" : "Enviar invitación"}
            </button>
          </div>
        </section>

        {/* ── Historial de invitaciones ── */}
        <section aria-label="Invitaciones enviadas">
          <h2 className="text-sm font-semibold text-foreground mb-3">Invitaciones enviadas</h2>
          {loading ? (
            <ul className="space-y-2 list-none p-0" aria-busy="true" aria-label="Cargando invitaciones">
              {[1, 2].map(i => (
                <li key={i}>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3 animate-pulse">
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 rounded-md bg-muted" />
                      <div className="h-3 w-48 rounded-md bg-muted" />
                    </div>
                    <div className="h-6 w-20 rounded-full bg-muted shrink-0" />
                  </div>
                </li>
              ))}
            </ul>
          ) : invitations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card py-8 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">Aún no has enviado invitaciones.</p>
            </div>
          ) : (
            <ul className="space-y-2 list-none p-0">
              {invitations.map(inv => {
                const sm = statusMeta(inv.estado)
                return (
                  <li key={inv.id_invitacion}>
                    <article className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3 flex-wrap shadow-sm">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {inv.alumno?.nombre ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inv.alumno?.correo} · {inv.grupo?.nombre}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sm.cls}`}>
                        {sm.label}
                      </span>
                    </article>
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
