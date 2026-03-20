"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// TIPOS
// ============================================================

export type ContrastLevel = "normal" | "alto" | "muy_alto"
export type TooltipMode   = "off" | "voice" | "visual" | "both"

export interface AccessibilitySettings {
  highContrast: boolean          // derivado: contrastLevel !== 'normal'
  contrastLevel: ContrastLevel   // guardado en DB (contraste column)
  textSize: "normal" | "large" | "extra-large"
  voiceEnabled: boolean
  simplifiedInterface: boolean
  tooltipMode: TooltipMode       // localStorage
  voiceRate: number              // localStorage, default 0.9
  voiceName: string              // localStorage, nombre de la voz seleccionada
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void
  speak: (text: string) => void
  loading: boolean
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  contrastLevel: "normal",
  textSize: "normal",
  voiceEnabled: false,
  simplifiedInterface: false,
  tooltipMode: "off",
  voiceRate: 0.9,
  voiceName: "",
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

// ============================================================
// MAPEO DB ↔ FRONTEND
// ============================================================

function dbToSettings(row: any, local: Partial<AccessibilitySettings>): AccessibilitySettings {
  const contrastLevel: ContrastLevel =
    row.contraste === "muy_alto" ? "muy_alto"
    : row.contraste === "alto"  ? "alto"
    : "normal"
  return {
    highContrast: contrastLevel !== "normal",
    contrastLevel,
    textSize:
      row.tamano_fuente >= 32 ? "extra-large"
      : row.tamano_fuente >= 24 ? "large"
      : "normal",
    voiceEnabled: row.texto_a_voz_activo ?? false,
    simplifiedInterface: row.interfaz_simplificada ?? false,
    tooltipMode: local.tooltipMode ?? "off",
    voiceRate: local.voiceRate ?? 0.9,
    voiceName: local.voiceName ?? "",
  }
}

function settingsToDb(s: AccessibilitySettings) {
  return {
    contraste: s.contrastLevel,
    tamano_fuente: s.textSize === "extra-large" ? 32 : s.textSize === "large" ? 24 : 16,
    texto_a_voz_activo: s.voiceEnabled,
    interfaz_simplificada: s.simplifiedInterface,
  }
}

// ============================================================
// LOCALSTORAGE helpers (configuracion local del dispositivo)
// ============================================================

const LS = {
  tooltipMode: "ea_tooltipMode",
  voiceRate:   "ea_voiceRate",
  voiceName:   "ea_voiceName",
}

function loadLocal(): Partial<AccessibilitySettings> {
  if (typeof window === "undefined") return {}
  return {
    tooltipMode: (localStorage.getItem(LS.tooltipMode) as TooltipMode | null) ?? "off",
    voiceRate:   parseFloat(localStorage.getItem(LS.voiceRate) ?? "0.9"),
    voiceName:   localStorage.getItem(LS.voiceName) ?? "",
  }
}

function saveLocal(s: Partial<AccessibilitySettings>) {
  if (typeof window === "undefined") return
  if (s.tooltipMode !== undefined) localStorage.setItem(LS.tooltipMode, s.tooltipMode)
  if (s.voiceRate   !== undefined) localStorage.setItem(LS.voiceRate,   String(s.voiceRate))
  if (s.voiceName   !== undefined) localStorage.setItem(LS.voiceName,   s.voiceName)
}

// ============================================================
// PROVIDER
// ============================================================

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)
  const [loading, setLoading]   = useState(true)
  const { user } = useAuth()

  // ── Cargar configuración ──────────────────────────────────
  useEffect(() => {
    const local = loadLocal()
    if (!user) {
      setSettings({ ...defaultSettings, ...local })
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("configuracion_accesibilidad")
        .select("*")
        .eq("id_perfil", user.id)
        .single()
      setSettings(error || !data ? { ...defaultSettings, ...local } : dbToSettings(data, local))
      setLoading(false)
    }
    load()
  }, [user])

  // ── Aplicar clases CSS cuando cambian los settings ────────
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove("high-contrast", "very-high-contrast")
    if (settings.contrastLevel === "alto")     html.classList.add("high-contrast")
    if (settings.contrastLevel === "muy_alto") html.classList.add("very-high-contrast")

    const sizes: Record<string, string> = { normal: "100%", large: "125%", "extra-large": "150%" }
    html.style.fontSize = sizes[settings.textSize]
  }, [settings])

  // ── Actualizar settings ───────────────────────────────────
  const updateSettings = useCallback(
    (newSettings: Partial<AccessibilitySettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings }
        // Mantener highContrast sincronizado
        if (newSettings.contrastLevel !== undefined) {
          updated.highContrast = newSettings.contrastLevel !== "normal"
        }
        if (user) {
          supabase
            .from("configuracion_accesibilidad")
            .update(settingsToDb(updated))
            .eq("id_perfil", user.id)
            .then(({ error }) => {
              if (error) console.error("Error guardando accesibilidad:", error.message)
            })
        }
        saveLocal(updated)
        return updated
      })
    },
    [user]
  )

  // ── TTS ───────────────────────────────────────────────────
  const speak = useCallback(
    (text: string) => {
      if (!settings.voiceEnabled || !("speechSynthesis" in window)) return
      window.speechSynthesis.cancel()
      const utt       = new SpeechSynthesisUtterance(text)
      utt.lang        = "es-ES"
      utt.rate        = settings.voiceRate
      if (settings.voiceName) {
        const voice = window.speechSynthesis.getVoices().find((v) => v.name === settings.voiceName)
        if (voice) utt.voice = voice
      }
      window.speechSynthesis.speak(utt)
    },
    [settings.voiceEnabled, settings.voiceRate, settings.voiceName]
  )

  // ── Listener global hover-to-speak ────────────────────────
  // Ref para acceder al settings más reciente sin re-crear el listener
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])

  useEffect(() => {
    // Tags de texto que se deben leer al hover
    const TEXT_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "SPAN", "LI", "LABEL", "TD", "TH", "CAPTION"])

    let hoverTimer: ReturnType<typeof setTimeout>
    let lastTarget: EventTarget | null = null

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target === lastTarget) return
      lastTarget = target

      const mode = settingsRef.current.tooltipMode
      if (mode === "off") return

      // Solo leer elementos de texto, no contenedores ni interactivos
      if (!TEXT_TAGS.has(target.tagName)) return
      if (target.closest("button, a, [role='button'], input, select, textarea")) return

      const text = target.textContent?.trim()
      if (!text) return

      // Indicador visual: data-tts-hover
      document.querySelectorAll("[data-tts-hover]").forEach((el) => el.removeAttribute("data-tts-hover"))
      if (mode === "visual" || mode === "both") {
        target.setAttribute("data-tts-hover", "true")
      }

      // Voz con pequeño debounce (evita lecturas al mover rápido el cursor)
      clearTimeout(hoverTimer)
      if ((mode === "voice" || mode === "both") && settingsRef.current.voiceEnabled) {
        hoverTimer = setTimeout(() => speak(text), 180)
      }
    }

    const onOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      target.removeAttribute("data-tts-hover")
      clearTimeout(hoverTimer)
      if (target === lastTarget) lastTarget = null
    }

    document.addEventListener("mouseover", onOver)
    document.addEventListener("mouseout", onOut)
    return () => {
      document.removeEventListener("mouseover", onOver)
      document.removeEventListener("mouseout", onOut)
      clearTimeout(hoverTimer)
    }
  }, [speak]) // speak es estable (useCallback), el resto usa settingsRef

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings, speak, loading }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error("useAccessibility must be used within an AccessibilityProvider")
  return ctx
}
