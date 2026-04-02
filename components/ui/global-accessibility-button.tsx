"use client"

import { useState } from "react"
import { Settings2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AccessibilityQuickPanel } from "@/components/ui/accessibility-quick-panel"

export function GlobalAccessibilityButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir configuración de accesibilidad"
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition-all duration-200 flex items-center justify-center"
      >
        <Settings2 className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Configuración de accesibilidad"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border-2 border-border shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Accesibilidad</h2>
                  <p className="text-xs text-muted-foreground">Ajusta la app a tus necesidades</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-xl"
                onClick={() => setOpen(false)}
                aria-label="Cerrar ajustes de accesibilidad"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            {/* Scrollable content */}
            <div className="overflow-y-auto p-5">
              <AccessibilityQuickPanel />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
