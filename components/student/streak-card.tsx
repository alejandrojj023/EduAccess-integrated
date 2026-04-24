"use client"

import { useAccessibility } from "@/lib/accessibility-context"
import { Flame } from "lucide-react"

interface StreakCardProps {
  streakDays: number
}

export function StreakCard({ streakDays }: StreakCardProps) {
  const { speak, settings } = useAccessibility()

  function handleHover() {
    if (settings.voiceEnabled) {
      const msg = streakDays === 0
        ? "Llevas cero días seguidos. Completa una lección hoy para comenzar tu racha."
        : `Llevas ${streakDays} ${streakDays === 1 ? "día seguido" : "días seguidos"}. ¡No la pierdas!`
      speak(msg)
    }
  }

  const active = streakDays > 0

  return (
    <div
      onMouseEnter={handleHover}
      className={`relative overflow-hidden rounded-3xl border-2 p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl h-full ${
        active
          ? "border-orange-200 bg-gradient-to-br from-orange-400 to-red-500 shadow-orange-200/50 hover:shadow-orange-200/60"
          : "border-slate-200 bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-200/50"
      }`}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/20 blur-xl" aria-hidden />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/15 blur-lg" aria-hidden />

      <div className="relative flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${active ? "bg-white/25" : "bg-white/20"}`}>
          <Flame
            className={`w-8 h-8 text-white drop-shadow ${active ? "fill-white" : "fill-white/50"}`}
            aria-hidden
          />
        </div>
        <div>
          <div className="flex items-end gap-1.5">
            <span className="text-4xl font-black text-white leading-none drop-shadow-sm">{streakDays}</span>
            {active && (
              <span className="text-xl mb-0.5 leading-none" aria-hidden>🔥</span>
            )}
          </div>
          <p className="text-sm font-bold text-white/90 mt-0.5">
            {streakDays === 1 ? "Día seguido" : "Días seguidos"}
          </p>
          {streakDays >= 3 && (
            <span className="inline-block mt-1 text-[11px] font-bold text-orange-100 bg-white/20 rounded-full px-2 py-0.5">
              ¡Racha en llamas!
            </span>
          )}
          {streakDays === 0 && (
            <span className="inline-block mt-1 text-[11px] font-bold text-slate-100 bg-white/20 rounded-full px-2 py-0.5">
              ¡Recupera tu racha!
            </span>
          )}
        </div>
      </div>

      {/* Animated flame dots */}
      {active && (
        <div className="absolute top-2.5 right-3 flex gap-1 opacity-40" aria-hidden>
          {[10, 7, 9].map((s, i) => (
            <Flame key={i} style={{ width: s, height: s }} className="text-white fill-white" />
          ))}
        </div>
      )}
    </div>
  )
}
