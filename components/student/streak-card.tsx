"use client"

import { Card, CardContent } from "@/components/ui/card"
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
        : `Llevas ${streakDays} ${streakDays === 1 ? "día seguido" : "días seguidos"}. Tu racha cuenta los días consecutivos en que completas al menos una lección. ¡No la pierdas!`
      speak(msg)
    }
  }

  return (
    <Card className="border-2 shadow-lg h-full transition-transform duration-200 hover:scale-105" onMouseEnter={handleHover}>
      <CardContent className="p-6 flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
          style={{
            background: streakDays > 0
              ? `linear-gradient(135deg, var(--accent) 0%, var(--success) 100%)`
              : `linear-gradient(135deg, var(--muted) 0%, var(--muted-foreground) 100%)`,
          }}
          aria-hidden="true"
        >
          <Flame className="w-9 h-9 text-white fill-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold text-foreground leading-none">{streakDays}</span>
            <Flame
              className={`w-6 h-6 shrink-0 ${
                streakDays > 0 ? "text-accent fill-accent" : "text-muted-foreground fill-muted-foreground"
              }`}
              aria-hidden="true"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <p className="text-base font-semibold text-muted-foreground">
              {streakDays === 1 ? "Día seguido" : "Días seguidos"}
            </p>
            {streakDays > 1 && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent bg-accent/10 rounded-full px-2.5 py-0.5">
                🔥 ¡Sigue así!
              </span>
            )}
            {streakDays === 1 && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent bg-accent/10 rounded-full px-2.5 py-0.5">
                🔥 ¡Buen inicio!
              </span>
            )}
            {streakDays === 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
                ¡Recupera tu racha!
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
