"use client"

import { useState } from "react"
import { useAccessibility } from "@/lib/accessibility-context"

// ──────────────────────────────────────────────────────────────────────────────
// AccessibleTooltip — para botones de solo icono
// ──────────────────────────────────────────────────────────────────────────────

interface AccessibleTooltipProps {
  /** Texto que se mostrará como tooltip y/o se leerá en voz */
  label: string
  children: React.ReactNode
  className?: string
  /** Posición del tooltip: "top" (default) | "bottom" | "left" | "right" */
  position?: "top" | "bottom" | "left" | "right"
}

/**
 * Wrapper para elementos interactivos (especialmente botones de solo icono).
 * Comportamiento según settings.tooltipMode:
 *   - "off"    → nada
 *   - "voice"  → lee el label al pasar el cursor (si voiceEnabled)
 *   - "visual" → muestra tooltip visual
 *   - "both"   → ambos
 */
export function AccessibleTooltip({
  label,
  children,
  className = "",
  position = "top",
}: AccessibleTooltipProps) {
  const { settings, speak } = useAccessibility()
  const [visible, setVisible] = useState(false)

  const handleEnter = () => {
    const mode = settings.tooltipMode
    if (mode === "off") return
    if ((mode === "voice" || mode === "both") && settings.voiceEnabled) speak(label)
    if (mode === "visual" || mode === "both") setVisible(true)
  }

  const positionClasses = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
  }

  const arrowClasses = {
    top:    "top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-foreground",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-b-[5px] border-b-foreground",
    left:   "left-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-l-[5px] border-l-foreground",
    right:  "right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-foreground",
  }

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setVisible(false)}
      onFocus={handleEnter}
      onBlur={() => setVisible(false)}
    >
      {children}

      {visible && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses[position]} px-3 py-1.5 text-sm font-semibold bg-foreground text-background rounded-lg whitespace-nowrap z-50 shadow-lg pointer-events-none`}
          style={{ animation: "tooltipIn 0.15s ease" }}
        >
          {label}
          <div className={`absolute w-0 h-0 ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// useSpeakOnHover — hook para botones/elementos con texto visible
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Hook ligero para añadir hover-to-speak a botones con texto visible.
 * No muestra tooltip visual (el texto ya es legible).
 * Uso: <Button {...useSpeakOnHover("Ir a Mi Progreso")}>Mi Progreso</Button>
 */
export function useSpeakOnHover(label: string) {
  const { settings, speak } = useAccessibility()
  return {
    onMouseEnter: () => {
      const mode = settings.tooltipMode
      if ((mode === "voice" || mode === "both") && settings.voiceEnabled) {
        speak(label)
      }
    },
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SpeakableText — para bloques de texto de contenido (instrucciones, párrafos)
// ──────────────────────────────────────────────────────────────────────────────

type SpeakableTextProps<T extends keyof React.JSX.IntrinsicElements = "p"> = {
  /** Texto que se leerá en voz alta. Si se omite, usa el contenido children (solo funciona si es string). */
  speakText?: string
  /** Tag HTML a renderizar: p, h1, h2, h3, span, li, etc. Default: "p" */
  as?: T
  className?: string
  children: React.ReactNode
} & Omit<React.JSX.IntrinsicElements[T], "children" | "className">

/**
 * Envuelve cualquier bloque de texto (párrafo, título, ítem de lista) y lo
 * hace legible en voz alta al pasar el cursor, igual que lectores de pantalla.
 *
 * - Modo "voice" o "both": lee el texto en voz alta al hover (si voiceEnabled)
 * - Modo "visual" o "both": muestra un subrayado sutil para indicar que es leíble
 * - Modo "off": sin cambios visuales ni voz
 *
 * Uso:
 *   <SpeakableText as="p" className="text-xl">Mira la imagen y selecciona...</SpeakableText>
 *   <SpeakableText as="h3" speakText="Pregunta: ¿Cuánto es 2 más 3?">¿Cuánto es 2 + 3?</SpeakableText>
 */
export function SpeakableText<T extends keyof React.JSX.IntrinsicElements = "p">({
  speakText,
  as,
  className = "",
  children,
  ...props
}: SpeakableTextProps<T>) {
  const { settings, speak } = useAccessibility()
  const [hovered, setHovered] = useState(false)

  const Tag = (as ?? "p") as keyof React.JSX.IntrinsicElements

  const handleEnter = () => {
    const mode = settings.tooltipMode
    if (mode === "off") return
    const text = speakText ?? (typeof children === "string" ? children : "")
    if ((mode === "voice" || mode === "both") && settings.voiceEnabled && text) {
      speak(text)
    }
    if (mode === "visual" || mode === "both") setHovered(true)
  }

  // Indicador visual sutil: subrayado punteado en color primario al hover
  const hoverClass = hovered && settings.tooltipMode !== "off"
    ? "underline decoration-dotted decoration-primary/60 decoration-2"
    : ""

  return (
    <Tag
      className={`${className} ${hoverClass} transition-all cursor-default`}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
      {...(props as any)}
    >
      {children}
    </Tag>
  )
}
