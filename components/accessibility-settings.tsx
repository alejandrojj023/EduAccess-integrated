"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft, Volume2, Type, Eye, EyeOff, Mic, Sparkles, Check,
  User, Bell, Settings, Gauge, MessageSquare, ZapOff,
  Sun, Moon, Contrast, X, Pencil, Lock, AlertCircle,
} from "lucide-react"
import type { ContrastLevel, TooltipMode } from "@/lib/accessibility-context"

interface AccessibilitySettingsProps {
  onBack: () => void
}

type Tab = "perfil" | "notificaciones" | "accesibilidad"

// ── Avatar color options ───────────────────────────────────
const AVATAR_COLOR_KEY = "ea_avatar_color"

const AVATAR_COLORS = [
  { id: "c1",  color: "#93c5fd", name: "Azul"      },
  { id: "c2",  color: "#fdba74", name: "Naranja"   },
  { id: "c3",  color: "#86efac", name: "Verde"     },
  { id: "c4",  color: "#fca5a5", name: "Rojo"      },
  { id: "c5",  color: "#fde68a", name: "Amarillo"  },
  { id: "c6",  color: "#d8b4fe", name: "Morado"    },
  { id: "c7",  color: "#67e8f9", name: "Cian"      },
  { id: "c8",  color: "#fcd34d", name: "Ámbar"     },
  { id: "c9",  color: "#f9a8d4", name: "Rosa"      },
  { id: "c10", color: "#a78bfa", name: "Violeta"   },
  { id: "c11", color: "#4ade80", name: "Lima"      },
  { id: "c12", color: "#fb923c", name: "Coral"     },
]

function loadAvatarColor(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(AVATAR_COLOR_KEY)
}

// ── Notification settings stored in localStorage ──────────
const NOTIF_KEYS = {
  newLesson:   "ea_notif_lesson",
  activity:    "ea_notif_activity",
  teacher:     "ea_notif_teacher",
}

function loadNotifSettings() {
  if (typeof window === "undefined") return { newLesson: true, activity: true, teacher: true }
  return {
    newLesson: localStorage.getItem(NOTIF_KEYS.newLesson)  !== "false",
    activity:  localStorage.getItem(NOTIF_KEYS.activity)   !== "false",
    teacher:   localStorage.getItem(NOTIF_KEYS.teacher)    !== "false",
  }
}

// ── Available Spanish voices ──────────────────────────────
function useSpanishVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (!("speechSynthesis" in window)) return
    const load = () => {
      const all = window.speechSynthesis.getVoices()
      const es  = all.filter((v) => v.lang.startsWith("es"))
      setVoices(es.length > 0 ? es : all.slice(0, 10))
    }
    load()
    window.speechSynthesis.addEventListener("voiceschanged", load)
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load)
  }, [])

  return voices
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function AccessibilitySettings({ onBack }: AccessibilitySettingsProps) {
  const { settings, updateSettings, speak } = useAccessibility()
  const { user } = useAuth()
  const voices = useSpanishVoices()

  const [activeTab, setActiveTab] = useState<Tab>("accesibilidad")

  // ── Profile state ────────────────────────────────────────
  const [editName, setEditName] = useState(user?.name ?? "")
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  // ── Avatar color state ────────────────────────────────────
  const [selectedColor, setSelectedColor] = useState<string | null>(loadAvatarColor)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const handleSelectColor = (opt: typeof AVATAR_COLORS[0]) => {
    setSelectedColor(opt.color)
    localStorage.setItem(AVATAR_COLOR_KEY, opt.color)
    setShowColorPicker(false)
    speak(`Color de avatar: ${opt.name}`)
  }

  // ── Notification state ────────────────────────────────────
  const [notif, setNotif] = useState(loadNotifSettings)

  const toggleNotif = (key: keyof typeof notif) => {
    const next = { ...notif, [key]: !notif[key] }
    setNotif(next)
    if (typeof window !== "undefined") {
      localStorage.setItem(NOTIF_KEYS[key], String(next[key]))
    }
  }

  // ── Password change state ─────────────────────────────────
  const [newPassword, setNewPassword]         = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [savingPassword, setSavingPassword]   = useState(false)
  const [passwordMsg, setPasswordMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordMsg({ ok: false, text: "La contraseña debe tener al menos 6 caracteres." })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "Las contraseñas no coinciden." })
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      setPasswordMsg({ ok: false, text: "Error al cambiar la contraseña. Intenta de nuevo." })
    } else {
      setNewPassword("")
      setConfirmPassword("")
      setPasswordMsg({ ok: true, text: "Contraseña actualizada correctamente." })
      speak("Contraseña actualizada correctamente")
      setTimeout(() => setPasswordMsg(null), 3000)
    }
  }

  // ── Save profile name ─────────────────────────────────────
  const handleSaveName = async () => {
    if (!user || !editName.trim()) return
    setSavingName(true)
    await supabase
      .from("perfil")
      .update({ nombre: editName.trim() })
      .eq("id_perfil", user.id)
    setSavingName(false)
    setNameSaved(true)
    speak("Nombre actualizado correctamente")
    setTimeout(() => setNameSaved(false), 2500)
  }

  // ── Contrast options ──────────────────────────────────────
  const contrastOptions: { id: ContrastLevel; label: string; desc: string; icon: typeof Sun }[] = [
    { id: "normal",   label: "Normal",    desc: "Colores estándar",         icon: Sun      },
    { id: "alto",     label: "Alto",      desc: "Mayor contraste visual",   icon: Moon     },
    { id: "muy_alto", label: "Muy Alto",  desc: "Máximo contraste (amarillo)", icon: Contrast },
  ]

  // ── Text size options ─────────────────────────────────────
  const textSizes = [
    { id: "normal"      as const, label: "Normal",    cls: "text-base" },
    { id: "large"       as const, label: "Grande",    cls: "text-lg"   },
    { id: "extra-large" as const, label: "Muy Grande", cls: "text-xl"  },
  ]

  // ── Tooltip mode options ──────────────────────────────────
  const tooltipOptions: { id: TooltipMode; label: string; desc: string }[] = [
    { id: "off",    label: "Desactivado", desc: "Sin descripción al pasar el cursor" },
    { id: "visual", label: "Solo texto",  desc: "Muestra un tooltip visual"          },
    { id: "voice",  label: "Solo voz",    desc: "Lee el elemento en voz alta"        },
    { id: "both",   label: "Texto y voz", desc: "Tooltip visual + lectura de voz"    },
  ]

  // ── Tabs ──────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: typeof User; title: string }[] = [
    { id: "perfil",         label: "Perfil",         icon: User,     title: "Gestiona tu información personal, nombre y correo."           },
    { id: "notificaciones", label: "Notificaciones", icon: Bell,     title: "Configura alertas de nuevas lecciones, actividades y mensajes." },
    { id: "accesibilidad",  label: "Accesibilidad",  icon: Settings, title: "Ajusta contraste, tamaño de texto, lectura por voz y tooltips." },
  ]

  const roleLabel = user?.role === "teacher" ? "Docente" : "Estudiante"
  const initials  = (user?.name ?? "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ───────────────────────────────────────── */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              className="h-12 w-12 p-0"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Ajustes</h1>
          </div>
          {settings.voiceEnabled && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => speak("Ajustes. Tienes tres secciones: Perfil, Notificaciones y Accesibilidad.")}
              className="h-12"
            >
              <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
              Escuchar
            </Button>
          )}
        </div>

        {/* ── Tab bar ──────────────────────────────────── */}
        <nav aria-label="Secciones de ajustes" className="max-w-2xl mx-auto px-4 pb-0">
          <ul role="tablist" className="flex gap-1 list-none p-0">
          {tabs.map((t) => (
            <li key={t.id} role="presentation">
            <button
              role="tab"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
                activeTab === t.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              aria-selected={activeTab === t.id}
              aria-controls={`tabpanel-${t.id}`}
              id={`tab-${t.id}`}
              title={t.title}
              aria-label={`${t.label}: ${t.title}`}
            >
              <t.icon className="w-4 h-4" aria-hidden="true" />
              {t.label}
            </button>
            </li>
          ))}
          </ul>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ══════════════════════════════════════════════
            TAB: PERFIL
        ══════════════════════════════════════════════ */}
        {activeTab === "perfil" && (
          <section role="tabpanel" id="tabpanel-perfil" aria-labelledby="tab-perfil">

            {/* Color picker modal */}
            {showColorPicker && (
              <div
                className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-label="Selector de color de avatar"
                onClick={(e) => { if (e.target === e.currentTarget) setShowColorPicker(false) }}
              >
                <div className="bg-card rounded-2xl border-2 border-border shadow-2xl w-full max-w-sm">
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Elige un color</h2>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-10 w-10 p-0"
                      onClick={() => setShowColorPicker(false)}
                      aria-label="Cerrar selector de color"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="p-5 grid grid-cols-4 gap-3">
                    {AVATAR_COLORS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectColor(opt)}
                        className={`flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all hover:scale-105 ${
                          selectedColor === opt.color
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border hover:border-primary/50"
                        }`}
                        aria-label={`${opt.name}${selectedColor === opt.color ? ", seleccionado" : ""}`}
                        aria-pressed={selectedColor === opt.color}
                      >
                        <div
                          className="w-12 h-12 rounded-full shadow-md flex items-center justify-center text-lg font-bold text-white/80"
                          style={{ backgroundColor: opt.color }}
                        >
                          {initials}
                        </div>
                        <span className="text-xs font-medium text-foreground">{opt.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Avatar + Name card */}
            <Card className="border-2 shadow-lg">
              <CardContent className="p-6 flex items-center gap-5">
                {/* Clickable avatar */}
                <button
                  onClick={() => setShowColorPicker(true)}
                  className="relative shrink-0 group"
                  aria-label="Cambiar color de avatar"
                  title="Haz clic para cambiar el color"
                >
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg transition-transform group-hover:scale-105"
                    style={{ backgroundColor: selectedColor ?? "hsl(var(--primary))", color: "white" }}
                  >
                    {initials}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-card">
                    <Pencil className="w-3.5 h-3.5 text-primary-foreground" aria-hidden="true" />
                  </span>
                </button>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold text-foreground truncate">{user?.name}</p>
                  <span className="inline-block mt-1 px-3 py-0.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    {roleLabel}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="h-10 shrink-0 border-2"
                  onClick={() => setShowColorPicker(true)}
                >
                  <Pencil className="w-4 h-4 mr-2" aria-hidden="true" />
                  Color
                </Button>
              </CardContent>
            </Card>

            {/* Editar nombre */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <User className="w-6 h-6 text-primary" aria-hidden="true" />
                  Información personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground block">Nombre</label>
                  <div className="flex gap-3">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Tu nombre"
                      className="h-12 text-lg border-2 flex-1"
                    />
                    <Button
                      size="lg"
                      className="h-12 px-5"
                      onClick={handleSaveName}
                      disabled={savingName || !editName.trim() || editName.trim() === user?.name}
                    >
                      {nameSaved ? <Check className="w-5 h-5" /> : savingName ? "..." : "Guardar"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground block">Correo electrónico</label>
                  <Input
                    value={user?.email ?? ""}
                    readOnly
                    className="h-12 text-lg border-2 opacity-60 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">El correo no se puede cambiar desde aquí</p>
                </div>

                {/* Separador */}
                <div className="border-t border-border pt-5 space-y-4">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" aria-hidden="true" />
                    Cambiar contraseña
                  </p>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground block">Nueva contraseña</label>
                      <div className="relative">
                        <Input
                          type={showNew ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="h-12 text-lg border-2 pr-12"
                          aria-label="Nueva contraseña"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground block">Confirmar contraseña</label>
                      <div className="relative">
                        <Input
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repite la nueva contraseña"
                          className="h-12 text-lg border-2 pr-12"
                          aria-label="Confirmar nueva contraseña"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {passwordMsg && (
                    <div
                      className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
                        passwordMsg.ok
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                      role="alert"
                    >
                      {passwordMsg.ok
                        ? <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                        : <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      }
                      {passwordMsg.text}
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full h-12"
                    onClick={handleChangePassword}
                    disabled={savingPassword || !newPassword || !confirmPassword}
                  >
                    <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
                    {savingPassword ? "Guardando..." : "Actualizar contraseña"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ══════════════════════════════════════════════
            TAB: NOTIFICACIONES
        ══════════════════════════════════════════════ */}
        {activeTab === "notificaciones" && (
          <section role="tabpanel" id="tabpanel-notificaciones" aria-labelledby="tab-notificaciones">
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <Bell className="w-6 h-6 text-primary" aria-hidden="true" />
                Preferencias de notificación
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {[
                {
                  key: "newLesson" as const,
                  label: "Nueva lección disponible",
                  desc:  "Aviso cuando el docente publica una nueva lección",
                },
                {
                  key: "activity" as const,
                  label: "Recordatorio de actividades",
                  desc:  "Recordatorio de actividades pendientes en tus cursos",
                },
                {
                  key: "teacher" as const,
                  label: "Mensajes del docente",
                  desc:  "Alertas cuando el docente envía un mensaje al grupo",
                },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-5">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{label}</p>
                    <p className="text-muted-foreground mt-0.5 text-sm">{desc}</p>
                  </div>
                  <Switch
                    checked={notif[key]}
                    onCheckedChange={() => toggleNotif(key)}
                    className="scale-150"
                    aria-label={label}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
          </section>
        )}

        {/* ══════════════════════════════════════════════
            TAB: ACCESIBILIDAD
        ══════════════════════════════════════════════ */}
        {activeTab === "accesibilidad" && (
          <section role="tabpanel" id="tabpanel-accesibilidad" aria-labelledby="tab-accesibilidad">
            {/* Contraste */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <Contrast className="w-6 h-6 text-primary" aria-hidden="true" />
                  Modo de Contraste
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {contrastOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        updateSettings({ contrastLevel: opt.id })
                        speak(`Contraste ${opt.label} activado`)
                      }}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                        settings.contrastLevel === opt.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                      aria-pressed={settings.contrastLevel === opt.id}
                    >
                      <opt.icon
                        className={`w-7 h-7 ${settings.contrastLevel === opt.id ? "text-primary" : "text-muted-foreground"}`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm font-bold ${settings.contrastLevel === opt.id ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </span>
                      <span className="text-xs text-muted-foreground text-center leading-tight">
                        {opt.desc}
                      </span>
                      {settings.contrastLevel === opt.id && (
                        <Check className="w-4 h-4 text-primary" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tamaño de texto */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <Type className="w-6 h-6 text-primary" aria-hidden="true" />
                  Tamaño de Texto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {textSizes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        updateSettings({ textSize: s.id })
                        speak(`Tamaño de texto cambiado a ${s.label}`)
                      }}
                      className={`p-5 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                        settings.textSize === s.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                      aria-pressed={settings.textSize === s.id}
                    >
                      <span className={`font-bold ${s.cls} ${settings.textSize === s.id ? "text-primary" : "text-foreground"}`}>
                        Aa
                      </span>
                      <span className={`text-sm font-medium ${settings.textSize === s.id ? "text-primary" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                      {settings.textSize === s.id && (
                        <Check className="w-4 h-4 text-primary" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lectura por voz */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <Mic className="w-6 h-6 text-primary" aria-hidden="true" />
                  Lectura por Voz (TTS)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-foreground font-medium">Activar lectura en voz alta</p>
                    <p className="text-muted-foreground text-sm mt-0.5">Lee instrucciones y contenido</p>
                  </div>
                  <Switch
                    checked={settings.voiceEnabled}
                    onCheckedChange={(v) => {
                      updateSettings({ voiceEnabled: v })
                      if (v) setTimeout(() => speak("Lectura por voz activada"), 100)
                    }}
                    className="scale-150"
                    aria-label="Activar lectura por voz"
                  />
                </div>

                {settings.voiceEnabled && (
                  <>
                    {/* Velocidad */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Gauge className="w-4 h-4" aria-hidden="true" />
                          Velocidad de lectura
                        </label>
                        <span className="text-sm font-bold text-primary">{settings.voiceRate.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={settings.voiceRate}
                        onChange={(e) => updateSettings({ voiceRate: parseFloat(e.target.value) })}
                        className="w-full accent-primary h-2 cursor-pointer"
                        aria-label="Velocidad de voz"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Lento (0.5x)</span>
                        <span>Normal (1.0x)</span>
                        <span>Rápido (2.0x)</span>
                      </div>
                    </div>

                    {/* Selección de voz */}
                    {voices.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Volume2 className="w-4 h-4" aria-hidden="true" />
                          Voz del sistema
                        </label>
                        <select
                          value={settings.voiceName}
                          onChange={(e) => updateSettings({ voiceName: e.target.value })}
                          className="w-full h-12 px-4 text-base border-2 border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          aria-label="Seleccionar voz"
                        >
                          <option value="">Voz automática (es-ES)</option>
                          {voices.map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.name} — {v.lang}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          className="w-full h-11 border-2"
                          onClick={() => speak("Esta es una prueba de lectura en voz alta. La configuración funciona correctamente.")}
                        >
                          <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" />
                          Probar voz seleccionada
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Modo de descripción / Tooltips */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-primary" aria-hidden="true" />
                  Descripción de Elementos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm mb-4">
                  Comportamiento al pasar el cursor sobre botones e íconos
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {tooltipOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        updateSettings({ tooltipMode: opt.id })
                        speak(`Descripción de elementos: ${opt.label}`)
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        settings.tooltipMode === opt.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                      aria-pressed={settings.tooltipMode === opt.id}
                    >
                      <p className={`font-bold text-sm ${settings.tooltipMode === opt.id ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Interfaz simplificada */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <Eye className="w-6 h-6 text-primary" aria-hidden="true" />
                  Interfaz Simplificada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-foreground font-medium">Reducir elementos visuales</p>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      Muestra solo los elementos esenciales
                    </p>
                  </div>
                  <Switch
                    checked={settings.simplifiedInterface}
                    onCheckedChange={(v) => {
                      updateSettings({ simplifiedInterface: v })
                      speak(v ? "Interfaz simplificada activada" : "Interfaz simplificada desactivada")
                    }}
                    className="scale-150"
                    aria-label="Activar interfaz simplificada"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Vista previa (live) ──────────────────── */}
            <Card className="border-2 border-primary/40 shadow-lg bg-primary/5">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-primary" aria-hidden="true" />
                  Vista Previa (en tiempo real)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-card rounded-xl border-2 border-border space-y-4">
                  <h3 className="text-xl font-bold text-foreground">Texto de ejemplo</h3>
                  <p className="text-muted-foreground">
                    Así se verá el contenido con tu configuración actual de contraste y tamaño.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button size="lg">Botón principal</Button>
                    <Button variant="outline" size="lg">Botón secundario</Button>
                  </div>
                  {/* Current settings summary */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {[
                      `Contraste: ${settings.contrastLevel}`,
                      `Texto: ${settings.textSize}`,
                      `Voz: ${settings.voiceEnabled ? "on" : "off"}`,
                      `Tooltips: ${settings.tooltipMode}`,
                    ].map((label) => (
                      <span
                        key={label}
                        className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-semibold"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info */}
            <div className="text-center text-muted-foreground p-4 bg-muted rounded-lg text-sm">
              Los cambios se guardan automáticamente y se aplican en toda la plataforma.
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
