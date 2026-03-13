"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// TIPOS
// ============================================================
// Se mantienen los mismos tipos que el prototipo.
// ============================================================

interface AccessibilitySettings {
  highContrast: boolean
  textSize: "normal" | "large" | "extra-large"
  voiceEnabled: boolean
  simplifiedInterface: boolean
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void
  speak: (text: string) => void
  loading: boolean
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  textSize: "normal",
  voiceEnabled: false,
  simplifiedInterface: false,
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

// ============================================================
// MAPEO: DB → Frontend
// ============================================================
// DB: contraste ('normal','alto','muy_alto'), tamano_fuente (16,24,32),
//     texto_a_voz_activo, interfaz_simplificada
// Frontend: highContrast (bool), textSize ('normal','large','extra-large'),
//           voiceEnabled (bool), simplifiedInterface (bool)
// ============================================================

function dbToSettings(row: any): AccessibilitySettings {
  return {
    highContrast: row.contraste !== "normal",
    textSize:
      row.tamano_fuente >= 32
        ? "extra-large"
        : row.tamano_fuente >= 24
          ? "large"
          : "normal",
    voiceEnabled: row.texto_a_voz_activo ?? false,
    simplifiedInterface: row.interfaz_simplificada ?? false,
  }
}

function settingsToDb(settings: AccessibilitySettings) {
  return {
    contraste: settings.highContrast ? "alto" : "normal",
    tamano_fuente:
      settings.textSize === "extra-large"
        ? 32
        : settings.textSize === "large"
          ? 24
          : 16,
    texto_a_voz_activo: settings.voiceEnabled,
    interfaz_simplificada: settings.simplifiedInterface,
  }
}

// ============================================================
// PROVIDER
// ============================================================

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // ----------------------------------------------------------
  // Cargar configuración desde la DB cuando el usuario cambia
  // ----------------------------------------------------------
  useEffect(() => {
    if (!user) {
      setSettings(defaultSettings)
      setLoading(false)
      return
    }

    const loadSettings = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("configuracion_accesibilidad")
        .select("*")
        .eq("id_perfil", user.id)
        .single()

      if (!error && data) {
        setSettings(dbToSettings(data))
      }
      setLoading(false)
    }

    loadSettings()
  }, [user])

  // ----------------------------------------------------------
  // Aplicar estilos CSS cuando cambian los settings
  // ----------------------------------------------------------
  useEffect(() => {
    // Alto contraste
    if (settings.highContrast) {
      document.documentElement.classList.add("high-contrast")
    } else {
      document.documentElement.classList.remove("high-contrast")
    }

    // Tamaño de fuente
    const sizes = {
      normal: "100%",
      large: "125%",
      "extra-large": "150%",
    }
    document.documentElement.style.fontSize = sizes[settings.textSize]
  }, [settings])

  // ----------------------------------------------------------
  // Actualizar settings (local + DB)
  // ----------------------------------------------------------
  const updateSettings = useCallback(
    (newSettings: Partial<AccessibilitySettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings }

        // Guardar en la DB de forma asíncrona
        if (user) {
          supabase
            .from("configuracion_accesibilidad")
            .update(settingsToDb(updated))
            .eq("id_perfil", user.id)
            .then(({ error }) => {
              if (error) {
                console.error("Error al guardar accesibilidad:", error.message)
              }
            })
        }

        return updated
      })
    },
    [user]
  )

  // ----------------------------------------------------------
  // TTS: Síntesis de voz (Web Speech API)
  // ----------------------------------------------------------
  const speak = useCallback(
    (text: string) => {
      if (settings.voiceEnabled && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = "es-ES"
        utterance.rate = 0.9
        window.speechSynthesis.speak(utterance)
      }
    },
    [settings.voiceEnabled]
  )

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings, speak, loading }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider")
  }
  return context
}
