"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAccessibility } from "@/lib/accessibility-context"
import { Star } from "lucide-react"

interface LevelCardProps {
  nivelActual: number
  nivelNombre: string
  nivelEmoji: string
  nivelMax: number
  estrellasTotales: number
  progressToNext: number
}

export function LevelCard({
  nivelActual,
  nivelNombre,
  nivelEmoji,
  nivelMax,
  estrellasTotales,
  progressToNext,
}: LevelCardProps) {
  const { speak, settings } = useAccessibility()

  function handleHover() {
    if (settings.voiceEnabled) speak(`Nivel ${nivelActual}: ${nivelNombre}. Llevas ${estrellasTotales} estrellas. Tu nivel sube conforme acumulas estrellas. ¡Sigue completando lecciones para avanzar!`)
  }

  return (
    <Card className="border-2 shadow-lg h-full transition-transform duration-200 hover:scale-105" onMouseEnter={handleHover}>
      <CardContent className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-success rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-md" aria-hidden="true">
            {nivelEmoji}
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-tight">
              Nivel <span className="text-primary">{nivelActual}</span>
            </p>
            <p className="text-base font-semibold text-muted-foreground">{nivelNombre}</p>
          </div>
        </div>
        {nivelMax !== Infinity && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="flex items-center gap-1 text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                {estrellasTotales}
              </span>
              <span className="text-muted-foreground text-xs">
                Meta: <span className="text-amber-500 font-semibold">{nivelMax + 1}</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline ml-0.5 -mt-0.5" aria-hidden="true" />
              </span>
            </div>
            <Progress value={progressToNext} className="h-3" aria-label={`${progressToNext}% hacia el siguiente nivel`} />
            <p className="text-xs text-right text-muted-foreground">{progressToNext}% hacia el siguiente nivel</p>
          </div>
        )}
        {nivelMax === Infinity && (
          <p className="text-sm font-semibold text-muted-foreground">✨ Nivel máximo alcanzado</p>
        )}
      </CardContent>
    </Card>
  )
}
