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

/** Devuelve la diferencia en días calendario entre dos fechas "YYYY-MM-DD" */
export function diferenciaDias(fechaVieja: string, fechaNueva: string): number {
  const vieja = new Date(fechaVieja + 'T00:00:00')
  const nueva = new Date(fechaNueva + 'T00:00:00')
  const ms = nueva.getTime() - vieja.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}
