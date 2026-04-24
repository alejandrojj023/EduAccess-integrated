"use client"

import { useAccessibility } from "@/lib/accessibility-context"
import { Star } from "lucide-react"

interface StarsCardProps {
  estrellasTotales: number
}

export function StarsCard({ estrellasTotales }: StarsCardProps) {
  const { speak, settings } = useAccessibility()

  function handleHover() {
    if (settings.voiceEnabled)
      speak(`Estrellas totales: ${estrellasTotales}. Ganas estrellas completando actividades y lecciones.`)
  }

  return (
    <div
      onMouseEnter={handleHover}
      className="relative overflow-hidden rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-400 to-orange-500 p-5 shadow-lg shadow-amber-200/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/60 h-full"
    >
      {/* Background glow */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/20 blur-xl" aria-hidden />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/15 blur-lg" aria-hidden />

      <div className="relative flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center shadow-inner shrink-0">
          <Star className="w-8 h-8 text-white fill-white drop-shadow" aria-hidden />
        </div>
        <div>
          <div className="flex items-end gap-1.5">
            <span className="text-4xl font-black text-white leading-none drop-shadow-sm">{estrellasTotales}</span>
            <Star className="w-5 h-5 text-amber-200 fill-amber-100 mb-1 shrink-0" aria-hidden />
          </div>
          <p className="text-sm font-bold text-amber-100 mt-0.5">Estrellas totales</p>
        </div>
      </div>

      {/* Decorative stars */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-50" aria-hidden>
        {[12, 8, 10].map((s, i) => (
          <Star key={i} style={{ width: s, height: s }} className="text-white fill-white" />
        ))}
      </div>
    </div>
  )
}
