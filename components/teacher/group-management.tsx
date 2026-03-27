"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft, Copy, Check, Users, Send,
  CheckCircle2, XCircle, Clock, Plus, Pencil, Trash2, X,
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
  if (s === "pendiente")  return { label: "Pendiente",  cls: "text-yellow-700 bg-yellow-50 border border-yellow-200" }
  if (s === "aceptada")   return { label: "Aceptada",   cls: "text-green-700  bg-green-50  border border-green-200"  }
  return                         { label: "Rechazada",  cls: "text-red-700    bg-red-50    border border-red-200"    }
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
  const [deleteId,   setDeleteId]   = useState<string | null>(null)  // grupo pendiente de confirmar
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
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("teacher-dashboard")}
            aria-label="Regresar al panel principal"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Gestión de Grupos</h1>
              <p className="text-sm text-muted-foreground">Códigos e invitaciones</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* ── Crear grupo ── */}
        <section aria-label="Crear nuevo grupo">
          <h2 className="text-lg font-bold mb-3 text-foreground">Crear nuevo grupo</h2>
          <Card className="border-2">
            <CardContent className="py-5 space-y-5">

              {/* Grado */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Grado</p>
                <div className="grid grid-cols-3 gap-3">
                  {(["1", "2", "3"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setNewGrade(g)}
                      className={`py-3 rounded-xl border-2 text-center font-semibold transition-all ${
                        newGrade === g
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                      aria-pressed={newGrade === g}
                    >
                      {gradoShort[g]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sección */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Sección</p>
                <div className="flex gap-2 flex-wrap">
                  {SECCIONES_RAPIDAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewSection(s)}
                      className={`w-11 h-11 rounded-lg border-2 text-base font-bold transition-all ${
                        newSection === s
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                      aria-pressed={newSection === s}
                    >
                      {s}
                    </button>
                  ))}
                  <Input
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value.toUpperCase())}
                    placeholder="Otra"
                    maxLength={4}
                    className="w-24 h-11 text-center font-bold border-2 uppercase"
                    aria-label="Sección personalizada"
                  />
                </div>
              </div>

              {/* Vista previa del nombre */}
              {newGrade && newSection.trim() && (
                <p className="text-sm text-muted-foreground">
                  Nombre del grupo:{" "}
                  <span className="font-bold text-foreground">
                    {gradoShort[newGrade]} {newSection.trim().toUpperCase()}
                  </span>
                </p>
              )}

              {createMsg && (
                <p
                  className={`text-sm rounded-md px-3 py-2 ${
                    createMsg.ok
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                  role="alert"
                >
                  {createMsg.text}
                </p>
              )}

              <Button
                onClick={handleCreateGroup}
                disabled={creating || !newGrade || !newSection.trim()}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                {creating ? "Creando…" : "Crear grupo"}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* ── Códigos de clase ── */}
        <section aria-label="Códigos de clase">
          <h2 className="text-lg font-bold mb-3 text-foreground">Códigos de clase</h2>
          {loading ? (
            <p className="text-muted-foreground">Cargando grupos…</p>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No tienes grupos creados aún. Crea un curso para generar un grupo.
              </CardContent>
            </Card>
          ) : (
            <>
            {/* Modal de confirmación de eliminación */}
            {deleteId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <Card className="border-2 shadow-2xl max-w-sm w-full mx-4">
                  <CardContent className="py-6 space-y-4 text-center">
                    <Trash2 className="w-10 h-10 text-destructive mx-auto" aria-hidden="true" />
                    <p className="text-base font-semibold text-foreground">
                      ¿Eliminar este grupo?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Se eliminará el grupo y sus alumnos inscritos quedarán sin grupo.
                      Los cursos y lecciones no se eliminan.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-2"
                        onClick={() => setDeleteId(null)}
                        disabled={deleting}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={handleDeleteGroup}
                        disabled={deleting}
                      >
                        {deleting ? "Eliminando…" : "Eliminar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <ul className="space-y-3 list-none p-0">
              {groups.map(g => (
                <li key={g.id_grupo}>
                  <Card className="border-2">
                    <CardContent className="py-4 space-y-3">
                      {/* Fila principal */}
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="font-semibold text-foreground">{g.nombre}</p>
                          {!g.seccion && (
                            <p className="text-xs text-amber-600 mt-0.5">Sin sección — edita para asignar una</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Comparte este código con tus alumnos
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-mono font-bold tracking-widest text-primary">
                            {g.codigo_clase}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCopy(g.codigo_clase, g.id_grupo)}
                            aria-label={`Copiar código ${g.codigo_clase}`}
                          >
                            {copiedId === g.id_grupo
                              ? <Check className="w-4 h-4 text-green-600" />
                              : <Copy className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => editingId === g.id_grupo ? closeEdit() : openEdit(g)}
                            aria-label={editingId === g.id_grupo ? "Cancelar edición" : `Editar grupo ${g.nombre}`}
                          >
                            {editingId === g.id_grupo
                              ? <X className="w-4 h-4" />
                              : <Pencil className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:border-destructive"
                            onClick={() => setDeleteId(g.id_grupo)}
                            aria-label={`Eliminar grupo ${g.nombre}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Formulario de edición inline */}
                      {editingId === g.id_grupo && (
                        <div className="border-t border-border pt-3 space-y-3">
                          <p className="text-sm font-medium text-foreground">
                            Editar sección del grupo{" "}
                            <span className="text-muted-foreground">({gradeLabel(g.grado)})</span>
                          </p>
                          <div className="flex gap-2 flex-wrap items-center">
                            {SECCIONES_RAPIDAS.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setEditSec(s)}
                                className={`w-10 h-10 rounded-lg border-2 text-sm font-bold transition-all ${
                                  editSec === s
                                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary"
                                    : "border-border hover:border-primary/50 text-foreground"
                                }`}
                                aria-pressed={editSec === s}
                              >
                                {s}
                              </button>
                            ))}
                            <Input
                              value={editSec}
                              onChange={(e) => setEditSec(e.target.value.toUpperCase())}
                              placeholder="Otra"
                              maxLength={4}
                              className="w-20 h-10 text-center font-bold border-2 uppercase"
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
                            <p
                              className={`text-xs rounded-md px-3 py-2 ${
                                editMsg.ok
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                              role="alert"
                            >
                              {editMsg.text}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateGroup(g)}
                              disabled={saving || !editSec.trim()}
                              className="flex-1"
                            >
                              {saving ? "Guardando…" : "Guardar"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={closeEdit}
                              className="flex-1 border-2"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
            </>
          )}
        </section>

        {/* ── Invitar alumno ── */}
        <section aria-label="Invitar alumno por correo">
          <h2 className="text-lg font-bold mb-3 text-foreground">Invitar alumno por correo</h2>
          <Card className="border-2">
            <CardContent className="py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                El alumno debe estar registrado en EduAccess. Recibirá la invitación en su panel.
              </p>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="inv-email">
                  Correo del alumno
                </label>
                <Input
                  id="inv-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="alumno@ejemplo.com"
                  className="h-11"
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="inv-group">
                  Grupo destino
                </label>
                <select
                  id="inv-group"
                  value={selectedGroupId}
                  onChange={e => setSelectedGroupId(e.target.value)}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                <p
                  className={`text-sm rounded-md px-3 py-2 ${
                    msg.ok
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                  role="alert"
                >
                  {msg.text}
                </p>
              )}

              <Button
                onClick={handleInvite}
                disabled={sending || !email.trim() || !selectedGroupId}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" aria-hidden="true" />
                {sending ? "Enviando…" : "Enviar invitación"}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* ── Historial de invitaciones ── */}
        <section aria-label="Invitaciones enviadas">
          <h2 className="text-lg font-bold mb-3 text-foreground">Invitaciones enviadas</h2>
          {loading ? null : invitations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aún no has enviado invitaciones.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2 list-none p-0">
              {invitations.map(inv => {
                const sm = statusMeta(inv.estado)
                return (
                  <li key={inv.id_invitacion}>
                    <article>
                      <Card className="border">
                        <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-medium text-foreground">
                              {inv.alumno?.nombre ?? "—"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {inv.alumno?.correo} · {inv.grupo?.nombre}
                            </p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${sm.cls}`}>
                            {sm.label}
                          </span>
                        </CardContent>
                      </Card>
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
