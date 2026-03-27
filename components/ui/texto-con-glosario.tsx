"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useAccessibility } from "@/lib/accessibility-context"
import { Volume2 } from "lucide-react"

export interface GlosarioEntry {
  palabra: string
  definicion: string
}

interface TextoConGlosarioProps {
  texto: string
  glosario: GlosarioEntry[]
  className?: string
}

function resaltarPalabras(texto: string, glosario: GlosarioEntry[]) {
  if (!glosario.length) return [{ texto, esGlosario: false, definicion: "", key: 0 }]

  const palabrasMap = new Map(
    glosario.map((g) => [g.palabra.toLowerCase().trim(), g.definicion])
  )

  return texto.split(/(\s+)/).map((token, index) => {
    const limpia = token.replace(/[.,;:!?¿¡()«»""'']/g, "").toLowerCase()
    const definicion = palabrasMap.get(limpia)
    return {
      texto: token,
      esGlosario: !!definicion,
      definicion: definicion ?? "",
      key: index,
    }
  })
}

export function TextoConGlosario({ texto, glosario, className }: TextoConGlosarioProps) {
  const { speak, settings } = useAccessibility()
  const tokens = resaltarPalabras(texto, glosario)

  return (
    <span className={className}>
      {tokens.map((token) =>
        token.esGlosario ? (
          <Popover key={token.key}>
            <PopoverTrigger asChild>
              <span
                className="font-bold text-primary underline decoration-dotted decoration-2 cursor-pointer hover:text-primary/80 transition-colors"
                onClick={() => {
                  if (settings.voiceEnabled) speak(token.definicion)
                }}
                role="button"
                tabIndex={0}
                aria-label={`Definición de: ${token.texto.replace(/[.,;:!?¿¡()]/g, "")}`}
                onMouseEnter={() => {
                  // El listener global omite role="button", así que leemos la palabra manualmente
                  if (
                    settings.voiceEnabled &&
                    (settings.tooltipMode === "voice" || settings.tooltipMode === "both")
                  ) {
                    speak(token.texto.replace(/[.,;:!?¿¡()«»""'']/g, ""))
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    if (settings.voiceEnabled) speak(token.definicion)
                  }
                }}
              >
                {token.texto}
              </span>
            </PopoverTrigger>
            <PopoverContent className="max-w-xs p-4" side="top">
              <p className="font-bold text-base text-foreground mb-1 capitalize">
                {token.texto.replace(/[.,;:!?¿¡()]/g, "")}
              </p>
              <p className="text-base text-muted-foreground leading-snug">
                {token.definicion}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 h-9 text-sm w-full justify-start"
                onClick={() => speak(token.definicion)}
              >
                <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" />
                Escuchar definición
              </Button>
            </PopoverContent>
          </Popover>
        ) : (
          <span key={token.key}>{token.texto}</span>
        )
      )}
    </span>
  )
}
