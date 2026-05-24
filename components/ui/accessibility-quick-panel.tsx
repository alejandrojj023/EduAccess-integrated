"use client"

import { useEffect, useState, useRef } from "react"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAccessibility } from "@/lib/accessibility-context"
import { useAuth } from "@/lib/auth-context"
import { Check, Contrast, Eye, Gauge, MessageSquare, Mic, Moon, Pause, Sun, Type, Volume2, ZapOff } from "lucide-react"
import type { ContrastLevel, TooltipMode } from "@/lib/accessibility-context"

function useSpanishVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (!("speechSynthesis" in window)) return
    const load = () => {
      const all = window.speechSynthesis.getVoices()
      const es = all.filter((v) => v.name.includes("Sabina"))
      setVoices(es)
    }
    load()
    window.speechSynthesis.addEventListener("voiceschanged", load)
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load)
  }, [])
  return voices
}

export function AccessibilityQuickPanel() {
  const { settings, updateSettings, speak, stopSpeak } = useAccessibility()
  const { user } = useAuth()
  const [testSpeakState, setTestSpeakState] = useState<"idle" | "playing" | "played">("idle")
  const testPlayIdRef = useRef(0)
  const voices = useSpanishVoices()

  const contrastOptions: { id: ContrastLevel; label: string; desc: string; icon: typeof Sun }[] = [
    { id: "normal",   label: "Normal",   desc: "Colores estándar",         icon: Sun      },
    { id: "alto",     label: "Alto",     desc: "Mayor contraste visual",   icon: Moon     },
    { id: "muy_alto", label: "Máximo",   desc: "Fondo negro, texto amarillo", icon: Contrast },
  ]

  const textSizes = [
    { id: "normal"       as const, label: "Normal",     cls: "text-base" },
    { id: "large"        as const, label: "Grande",     cls: "text-lg"   },
    { id: "extra-large"  as const, label: "Muy Grande", cls: "text-xl"   },
  ]

  const tooltipOptions: { id: TooltipMode; label: string; desc: string }[] = [
    { id: "off",    label: "Desactivado", desc: "Sin descripción al pasar el cursor" },
    { id: "visual", label: "Solo texto",  desc: "Muestra un tooltip visual"          },
    { id: "voice",  label: "Solo voz",    desc: "Lee el elemento en voz alta"        },
    { id: "both",   label: "Texto y voz", desc: "Tooltip visual + lectura de voz"    },
  ]

  return (
    <div className="space-y-4">
      {/* Contraste */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Contrast className="w-5 h-5 text-primary" aria-hidden="true" />
            Modo de Contraste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {contrastOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  updateSettings({ contrastLevel: opt.id })
                  speak(`Contraste ${opt.label} activado`)
                }}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${
                  settings.contrastLevel === opt.id
                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
                aria-pressed={settings.contrastLevel === opt.id}
              >
                <opt.icon
                  className={`w-6 h-6 ${settings.contrastLevel === opt.id ? "text-primary" : "text-muted-foreground"}`}
                  aria-hidden="true"
                />
                <span className={`text-xs font-bold ${settings.contrastLevel === opt.id ? "text-primary" : "text-foreground"}`}>
                  {opt.label}
                </span>
                {settings.contrastLevel === opt.id && (
                  <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tamaño de texto */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" aria-hidden="true" />
            Tamaño de Texto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {textSizes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  updateSettings({ textSize: s.id })
                  speak(`Tamaño de texto cambiado a ${s.label}`)
                }}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${
                  settings.textSize === s.id
                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
                aria-pressed={settings.textSize === s.id}
              >
                <span className={`font-bold ${s.cls} ${settings.textSize === s.id ? "text-primary" : "text-foreground"}`}>
                  Aa
                </span>
                <span className={`text-xs font-medium ${settings.textSize === s.id ? "text-primary" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {settings.textSize === s.id && (
                  <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lectura por voz */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" aria-hidden="true" />
            Lectura por Voz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Activar lectura en voz alta</p>
              <p className="text-xs text-muted-foreground mt-0.5">Lee instrucciones y contenido</p>
            </div>
            <Switch
              checked={settings.voiceEnabled}
              onCheckedChange={(v) => {
                updateSettings({ voiceEnabled: v })
                if (v) setTimeout(() => speak("Lectura por voz activada"), 100)
              }}
              className="scale-125"
              aria-label="Activar lectura por voz"
            />
          </div>

          {settings.voiceEnabled && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
                    Velocidad
                  </label>
                  <span className="text-xs font-bold text-primary">{settings.voiceRate.toFixed(1)}x</span>
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
                  <span>Lento</span>
                  <span>Normal</span>
                  <span>Rápido</span>
                </div>
              </div>

              {user && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Voz del sistema
                  </label>
                  <select
                    value="neural2-google"
                    onChange={() => updateSettings({ voiceName: "neural2-google" })}
                    className="w-full h-10 px-3 text-sm border-2 border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Seleccionar voz"
                  >
                    <option value="neural2-google">Neural2 — Google TTS</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-2"
                    aria-label={testSpeakState === "playing" ? "Pausar prueba" : testSpeakState === "played" ? "Repetir prueba" : "Probar voz"}
                    onClick={async () => {
                      if (testSpeakState === "playing") {
                        stopSpeak()
                        setTestSpeakState("played")
                        return
                      }
                      const playId = ++testPlayIdRef.current
                      setTestSpeakState("playing")
                      await speak("Esta es una prueba de lectura en voz alta.")
                      if (testPlayIdRef.current === playId) setTestSpeakState("played")
                    }}
                  >
                    {testSpeakState === "playing"
                      ? <Pause className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
                      : <Volume2 className="w-3.5 h-3.5 mr-2" aria-hidden="true" />}
                    {testSpeakState === "playing" ? "Pausar" : testSpeakState === "played" ? "Repetir" : "Probar voz"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modo de tooltips */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
            Descripción de Elementos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {tooltipOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  updateSettings({ tooltipMode: opt.id })
                  speak(`Descripción de elementos: ${opt.label}`)
                }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  settings.tooltipMode === opt.id
                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
                aria-pressed={settings.tooltipMode === opt.id}
              >
                <p className={`font-bold text-xs ${settings.tooltipMode === opt.id ? "text-primary" : "text-foreground"}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interfaz simplificada */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" aria-hidden="true" />
            Interfaz Simplificada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Reducir elementos visuales</p>
              <p className="text-xs text-muted-foreground mt-0.5">Muestra solo lo esencial, menos distracciones</p>
            </div>
            <Switch
              checked={settings.simplifiedInterface}
              onCheckedChange={(v) => {
                updateSettings({ simplifiedInterface: v })
                speak(v ? "Interfaz simplificada activada" : "Interfaz simplificada desactivada")
              }}
              className="scale-125"
              aria-label="Interfaz simplificada"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}