"use client"

import { useAccessibility } from "@/lib/accessibility-context"
import { Star, Trophy } from "lucide-react"

interface LevelCardProps {
  nivelActual: number
  nivelNombre: string
  nivelEmoji: string
  nivelIcon: string
  nivelMax: number
  estrellasTotales: number
  progressToNext: number
}

export function LevelCard({
  nivelActual,
  nivelNombre,
  nivelEmoji,
  nivelIcon,
  nivelMax,
  estrellasTotales,
  progressToNext,
}: LevelCardProps) {
  const { speak, settings } = useAccessibility()

  function handleHover() {
    if (settings.voiceEnabled)
      speak(`Nivel ${nivelActual}: ${nivelNombre}. Llevas ${estrellasTotales} estrellas. ¡Sigue completando lecciones para avanzar!`)
  }

  const isMax = nivelMax === Infinity

  return (
    <div
      onMouseEnter={handleHover}
      className="relative overflow-hidden rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-400 to-teal-600 p-5 shadow-lg shadow-emerald-200/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-200/60 h-full"
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/20 blur-xl" aria-hidden />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/15 blur-lg" aria-hidden />

      <div className="relative space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/25 shadow-inner shrink-0 overflow-hidden" aria-hidden>
            <img src={nivelIcon} alt={nivelNombre} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-2xl font-black text-white leading-none">
              Nivel {nivelActual}
            </p>
            <p className="text-sm font-bold text-emerald-100 mt-0.5">{nivelNombre}</p>
          </div>
        </div>

        {!isMax ? (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-emerald-100">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-300 text-amber-300" aria-hidden />
                {estrellasTotales}
              </span>
              <span>Meta: {nivelMax + 1} ⭐</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-700 shadow-sm"
                style={{ width: `${progressToNext}%` }}
                role="progressbar"
                aria-valuenow={progressToNext}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${progressToNext}% hacia el siguiente nivel`}
              />
            </div>
            <p className="text-xs text-emerald-100 text-right">{progressToNext}% al siguiente nivel</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-white/20 rounded-2xl px-3 py-2">
            <Trophy className="w-4 h-4 text-amber-200" aria-hidden />
            <p className="text-sm font-bold text-white">¡Nivel máximo!</p>
          </div>
        )}
      </div>
    </div>
  )
}
