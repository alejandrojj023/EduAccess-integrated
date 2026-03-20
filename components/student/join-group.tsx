"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Users, CheckCircle2, XCircle, Hash } from "lucide-react"

interface Invitation {
  id_invitacion: string
  estado: string
  fecha_creacion: string
  grupo: { nombre: string; grado: string } | null
  docente: { nombre: string } | null
}

interface JoinGroupProps {
  onNavigate: (screen: string) => void
}

const gradeLabel = (g: string) =>
  g === "1" ? "1er Grado" : g === "2" ? "2do Grado" : "3er Grado"

export function JoinGroup({ onNavigate }: JoinGroupProps) {
  const [code,        setCode]        = useState("")
  const [joining,     setJoining]     = useState(false)
  const [codeMsg,     setCodeMsg]     = useState<{ ok: boolean; text: string } | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingInv,  setLoadingInv]  = useState(true)
  const [actionId,    setActionId]    = useState<string | null>(null)

  useEffect(() => { loadInvitations() }, [])

  async function loadInvitations() {
    setLoadingInv(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/invitations", {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const json = await res.json()
    if (json.data) setInvitations(json.data)
    setLoadingInv(false)
  }

  async function handleJoinByCode() {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 6) return
    setJoining(true)
    setCodeMsg(null)
    const { data, error } = await supabase.rpc("fn_unirse_por_codigo", {
      p_codigo: trimmed,
    })
    setJoining(false)
    if (data?.success) {
      setCodeMsg({
        ok: true,
        text: `Te uniste al grupo "${data.grupo}" (${gradeLabel(data.grado)}) correctamente.`,
      })
      setCode("")
    } else {
      setCodeMsg({ ok: false, text: data?.error ?? error?.message ?? "Código no válido." })
    }
    setTimeout(() => setCodeMsg(null), 6000)
  }

  async function handleInvitation(id: string, accept: boolean) {
    setActionId(id)
    const rpc = accept ? "fn_aceptar_invitacion" : "fn_rechazar_invitacion"
    const { data } = await supabase.rpc(rpc, { p_id_invitacion: id })
    setActionId(null)
    if (data?.success) {
      setInvitations(prev => prev.filter(i => i.id_invitacion !== id))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Unirse a un Grupo</h1>
              <p className="text-sm opacity-90">Código de clase o invitación</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* ── Código de clase ── */}
        <section aria-label="Unirse por código de clase">
          <h2 className="text-lg font-bold mb-3 text-foreground">Código de clase</h2>
          <Card className="border-2">
            <CardContent className="py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Pídele a tu docente el código de 6 caracteres de su grupo e ingrésalo aquí.
              </p>

              <div className="flex gap-3">
                <Input
                  value={code}
                  onChange={e =>
                    setCode(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder="ABC123"
                  maxLength={6}
                  className="h-14 text-2xl font-mono tracking-[0.4em] text-center uppercase flex-1"
                  aria-label="Código de clase de 6 caracteres"
                  onKeyDown={e => e.key === "Enter" && handleJoinByCode()}
                />
                <Button
                  onClick={handleJoinByCode}
                  disabled={joining || code.trim().length !== 6}
                  className="h-14 px-6 text-base"
                >
                  <Hash className="w-4 h-4 mr-2" aria-hidden="true" />
                  {joining ? "Uniéndome…" : "Unirme"}
                </Button>
              </div>

              {codeMsg && (
                <p
                  className={`text-sm rounded-md px-3 py-2 ${
                    codeMsg.ok
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                  role="alert"
                >
                  {codeMsg.text}
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Invitaciones pendientes ── */}
        <section aria-label="Invitaciones pendientes">
          <h2 className="text-lg font-bold mb-3 text-foreground">Invitaciones pendientes</h2>

          {loadingInv ? (
            <p className="text-muted-foreground">Cargando invitaciones…</p>
          ) : invitations.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No tienes invitaciones pendientes.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3 list-none p-0">
              {invitations.map(inv => (
                <li key={inv.id_invitacion}>
                  <article>
                    <Card className="border-2">
                      <CardContent className="py-4 flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p className="font-semibold text-foreground">
                            {inv.grupo?.nombre ?? "—"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {gradeLabel(inv.grupo?.grado ?? "")} ·{" "}
                            Invitación de {inv.docente?.nombre ?? "tu docente"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleInvitation(inv.id_invitacion, true)}
                            disabled={actionId === inv.id_invitacion}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            aria-label={`Aceptar invitación al grupo ${inv.grupo?.nombre}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" aria-hidden="true" />
                            Aceptar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleInvitation(inv.id_invitacion, false)}
                            disabled={actionId === inv.id_invitacion}
                            aria-label={`Rechazar invitación al grupo ${inv.grupo?.nombre}`}
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
