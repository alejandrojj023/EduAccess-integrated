import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Devuelve la fecha en formato "YYYY-MM-DD" según zona horaria America/Mexico_City */
export function fechaTijuana(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

export const NIVELES: Record<number, { nombre: string; emoji: string; icon: string; min: number; max: number }> = {
  1:  { nombre: "Semilla Dormida",     emoji: "💤", icon: "/Semilla%20Dormida.svg",          min: 0,   max: 9        },
  2:  { nombre: "Semilla Saltarina",   emoji: "🌱", icon: "/Semilla%20Saltarina.svg",        min: 10,  max: 29       },
  3:  { nombre: "Brote Brillante",     emoji: "🌿", icon: "/Brote%20Brillante.svg",          min: 30,  max: 59       },
  4:  { nombre: "Trébol de la Suerte", emoji: "🍀", icon: "/Trebol%20de%20la%20Suerte.svg", min: 60,  max: 99       },
  5:  { nombre: "Girasol Sonriente",   emoji: "🌻", icon: "/Girasol%20Sonrriente.svg",      min: 100, max: 144      },
  6:  { nombre: "Cactus Valiente",     emoji: "🌵", icon: "/Cactus%20Valiente.svg",         min: 145, max: 195      },
  7:  { nombre: "Árbol Alegre",        emoji: "🌳", icon: "/Arbol%20Alegre.svg",            min: 196, max: 251      },
  8:  { nombre: "Flor Guardiana",      emoji: "🌸", icon: "/Flor%20Guardiana.svg",          min: 252, max: 312      },
  9:  { nombre: "Gran Roble",          emoji: "🌲", icon: "/Gran%20Roble.svg",              min: 313, max: 378      },
  10: { nombre: "Bosque Mágico",       emoji: "✨", icon: "/Bosque%20Magico.svg",           min: 379, max: Infinity },
}

/** Devuelve la diferencia en días calendario entre dos fechas "YYYY-MM-DD" */
export function diferenciaDias(fechaVieja: string, fechaNueva: string): number {
  const vieja = new Date(fechaVieja + 'T00:00:00')
  const nueva = new Date(fechaNueva + 'T00:00:00')
  const ms = nueva.getTime() - vieja.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}
