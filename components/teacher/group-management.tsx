"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft, Copy, Check, Users, Send,
  CheckCircle2, XCircle, Clock,
} from "lucide-react"

interface Group {
  id_grupo: string
  nombre: string
  grado: string
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

  // Form state
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
        .select("id_grupo, nombre, grado, codigo_clase")
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
            <ul className="space-y-3 list-none p-0">
              {groups.map(g => (
                <li key={g.id_grupo}>
                  <Card className="border-2">
                    <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-semibold text-foreground">{g.nombre}</p>
                        <p className="text-sm text-muted-foreground">{gradeLabel(g.grado)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Comparte este código con tus alumnos
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-mono font-bold tracking-widest text-primary">
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
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
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
