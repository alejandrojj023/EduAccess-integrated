/**
 * Serializa y parsea la configuración completa de una actividad.
 *
 * El campo `instrucciones` en la tabla `actividad` almacena un JSON con:
 *   { instrucciones, opciones?, respuesta_correcta? }
 *
 * Retrocompatible: si el valor no es JSON válido, se trata como texto plano.
 */

export interface ActivityConfig {
  instrucciones: string
  opciones?: { texto: string; correcta: boolean }[]
  respuesta_correcta?: string
}

export function parseActivityConfig(raw: string | null | undefined): ActivityConfig {
  if (!raw) return { instrucciones: "" }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && "instrucciones" in parsed) {
      return {
        instrucciones: parsed.instrucciones ?? "",
        opciones: Array.isArray(parsed.opciones) ? parsed.opciones : undefined,
        respuesta_correcta: parsed.respuesta_correcta ?? undefined,
      }
    }
    // Legacy: plain text
    return { instrucciones: raw }
  } catch {
    return { instrucciones: raw }
  }
}

export function serializeActivityConfig(config: ActivityConfig): string {
  const obj: Record<string, unknown> = { instrucciones: config.instrucciones }
  if (config.opciones && config.opciones.length > 0) obj.opciones = config.opciones
  if (config.respuesta_correcta) obj.respuesta_correcta = config.respuesta_correcta
  return JSON.stringify(obj)
}
