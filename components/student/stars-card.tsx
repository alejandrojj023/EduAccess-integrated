"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useAccessibility } from "@/lib/accessibility-context"
import { Star } from "lucide-react"

interface StarsCardProps {
  estrellasTotales: number
}

export function StarsCard({ estrellasTotales }: StarsCardProps) {
  const { speak, settings } = useAccessibility()

  function handleHover() {
    if (settings.voiceEnabled) speak(`Estrellas totales: ${estrellasTotales}. Aquí se muestran todas las estrellas que has ganado completando actividades y lecciones.`)
  }

  return (
    <Card className="border-2 shadow-lg h-full transition-transform duration-200 hover:scale-105" onMouseEnter={handleHover}>
      <CardContent className="p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md" style={{ background: `linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%)` }} aria-hidden="true">
          <Star className="w-9 h-9 text-white fill-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold text-foreground leading-none">{estrellasTotales}</span>
            <Star className="w-6 h-6 text-accent fill-accent shrink-0" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-muted-foreground mt-0.5">Estrellas totales</p>
        </div>
      </CardContent>
    </Card>
  )
}
