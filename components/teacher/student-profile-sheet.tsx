"use client"

import { useState, useEffect } from "react"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Star, Flame, BookOpen } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { NIVELES } from "@/lib/utils"

// Solo se requieren los datos básicos que cualquier componente tiene disponible
export interface StudentProfileSheetStudent {
  alumnoId:    string
  name:        string
  colorPerfil: string | null
}

interface GamiData {
  nivel:      number
  estrellas:  number
  racha:      number
  nivelNombre: string
  nivelIcon:   string
}

interface Props {
  open:         boolean
  onOpenChange: (open: boolean) => void
  student:      StudentProfileSheetStudent | null
}

export function StudentProfileSheet({ open, onOpenChange, student }: Props) {
  const [gami,          setGami]          = useState<GamiData | null>(null)
  const [cursos,        setCursos]        = useState<{ id_curso: string; titulo: string }[]>([])
  const [loadingGami,   setLoadingGami]   = useState(false)
  const [loadingCursos, setLoadingCursos] = useState(false)

  // Cargar gamificación y cursos al abrir (lazy)
  useEffect(() => {
    if (!open || !student) return

    setLoadingGami(true)
    setLoadingCursos(true)
    setGami(null)
    setCursos([])

    // Gamificación
    supabase
      .from("gamificacion")
      .select("nivel, estrellas_totales, streaks_dias")
      .eq("id_alumno", student.alumnoId)
      .single()
      .then(({ data }) => {
        const nivel      = data?.nivel ?? 1
        const nivelInfo  = NIVELES[nivel] ?? NIVELES[1]
        setGami({
          nivel,
          estrellas:   data?.estrellas_totales ?? 0,
          racha:       data?.streaks_dias ?? 0,
          nivelNombre: nivelInfo.nombre,
          nivelIcon:   nivelInfo.icon,
        })
        setLoadingGami(false)
      })

    // Cursos inscritos
    supabase
      .from("alumno_curso")
      .select("curso:id_curso(id_curso, titulo)")
      .eq("id_alumno", student.alumnoId)
      .then(({ data }) => {
        setCursos(data?.map((d: any) => d.curso).filter(Boolean) ?? [])
        setLoadingCursos(false)
      })
  }, [open, student?.alumnoId])

  if (!student) return null

  const initials = student.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:max-w-sm p-0 overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Perfil de alumno
          </SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-6">

          {/* Avatar + nombre + nivel */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-md"
                style={{ backgroundColor: student.colorPerfil ?? "#93c5fd" }}
                aria-label={`Avatar de ${student.name}`}
              >
                {initials}
              </div>
              {loadingGami ? (
                <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-xl bg-muted animate-pulse border-2 border-background" />
              ) : gami && (
                <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-xl overflow-hidden border-2 border-background shadow-sm">
                  <img src={gami.nivelIcon} alt={gami.nivelNombre} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <p className="text-lg font-black text-foreground">{student.name}</p>
              {loadingGami ? (
                <div className="h-4 w-32 rounded-md bg-muted animate-pulse mx-auto mt-1" />
              ) : gami ? (
                <p className="text-sm text-muted-foreground">Nv. {gami.nivel} · {gami.nivelNombre}</p>
              ) : null}
            </div>
          </div>

          {/* Stats: estrellas y racha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
              <Star className="w-7 h-7 fill-amber-400 text-amber-400" aria-hidden="true" />
              {loadingGami
                ? <div className="h-8 w-10 rounded-lg bg-muted animate-pulse" />
                : <p className="text-2xl font-black text-foreground">{gami?.estrellas ?? 0}</p>
              }
              <p className="text-xs text-muted-foreground text-center leading-tight">Estrellas totales</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20 p-4">
              <Flame className="w-7 h-7 fill-orange-500 text-orange-500" aria-hidden="true" />
              {loadingGami
                ? <div className="h-8 w-10 rounded-lg bg-muted animate-pulse" />
                : <p className="text-2xl font-black text-foreground">{gami?.racha ?? 0}</p>
              }
              <p className="text-xs text-muted-foreground text-center leading-tight">Días de racha</p>
            </div>
          </div>

          {/* Cursos inscritos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-bold text-foreground">
                Cursos inscritos
                {!loadingCursos && (
                  <span className="text-muted-foreground font-normal ml-1">({cursos.length})</span>
                )}
              </p>
            </div>

            {loadingCursos ? (
              <div className="space-y-2" aria-busy="true" aria-label="Cargando cursos">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : cursos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cursos inscritos</p>
            ) : (
              <ul className="space-y-2" aria-label="Lista de cursos inscritos">
                {cursos.map((c) => (
                  <li
                    key={c.id_curso}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 py-2.5"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" aria-hidden="true" />
                    <span className="text-sm font-medium text-foreground">{c.titulo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}
