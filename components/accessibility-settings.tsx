"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useAccessibility } from "@/lib/accessibility-context"
import {
  ArrowLeft,
  Volume2,
  Sun,
  Moon,
  Type,
  Eye,
  Mic,
  Sparkles,
  Check,
} from "lucide-react"

interface AccessibilitySettingsProps {
  onBack: () => void
}

export function AccessibilitySettings({ onBack }: AccessibilitySettingsProps) {
  const { settings, updateSettings, speak } = useAccessibility()

  const textSizes = [
    { id: "normal" as const, label: "Normal", size: "text-base" },
    { id: "large" as const, label: "Grande", size: "text-lg" },
    { id: "extra-large" as const, label: "Muy Grande", size: "text-xl" },
  ]

  const handleReadInstructions = () => {
    speak(
      "Configuracion de accesibilidad. Aqui puedes ajustar el modo de alto contraste, el tamano del texto, activar la lectura por voz, y activar la interfaz simplificada."
    )
  }

  const handleToggleHighContrast = () => {
    const newValue = !settings.highContrast
    updateSettings({ highContrast: newValue })
    speak(newValue ? "Alto contraste activado" : "Alto contraste desactivado")
  }

  const handleToggleVoice = () => {
    const newValue = !settings.voiceEnabled
    updateSettings({ voiceEnabled: newValue })
    if (newValue) {
      setTimeout(() => speak("Lectura por voz activada"), 100)
    }
  }

  const handleToggleSimplified = () => {
    const newValue = !settings.simplifiedInterface
    updateSettings({ simplifiedInterface: newValue })
    speak(newValue ? "Interfaz simplificada activada" : "Interfaz simplificada desactivada")
  }

  const handleChangeTextSize = (size: "normal" | "large" | "extra-large") => {
    updateSettings({ textSize: size })
    const labels = { normal: "normal", large: "grande", "extra-large": "muy grande" }
    speak(`Tamano de texto cambiado a ${labels[size]}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              className="h-12 w-12 p-0"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Accesibilidad</h1>
          </div>
          {settings.voiceEnabled && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleReadInstructions}
              className="h-12"
            >
              <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
              Escuchar
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* High Contrast */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              {settings.highContrast ? (
                <Moon className="w-6 h-6 text-primary" aria-hidden="true" />
              ) : (
                <Sun className="w-6 h-6 text-primary" aria-hidden="true" />
              )}
              Modo Alto Contraste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-foreground">
                  Aumenta el contraste de colores para mejorar la visibilidad
                </p>
                <p className="text-muted-foreground mt-1">
                  Recomendado para usuarios con baja vision
                </p>
              </div>
              <Switch
                checked={settings.highContrast}
                onCheckedChange={handleToggleHighContrast}
                className="scale-150"
                aria-label="Activar modo alto contraste"
              />
            </div>
          </CardContent>
        </Card>

        {/* Text Size */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              <Type className="w-6 h-6 text-primary" aria-hidden="true" />
              Tamano de Texto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-foreground mb-4">
              Ajusta el tamano del texto en toda la aplicacion
            </p>
            <div className="grid grid-cols-3 gap-4">
              {textSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => handleChangeTextSize(size.id)}
                  className={`p-5 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${
                    settings.textSize === size.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }`}
                  aria-pressed={settings.textSize === size.id}
                >
                  <span className={`font-bold ${size.size} ${
                    settings.textSize === size.id ? "text-primary" : "text-foreground"
                  }`}>
                    Aa
                  </span>
                  <span className={`text-sm font-medium ${
                    settings.textSize === size.id ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {size.label}
                  </span>
                  {settings.textSize === size.id && (
                    <Check className="w-5 h-5 text-primary" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Voice Reading */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              <Mic className="w-6 h-6 text-primary" aria-hidden="true" />
              Lectura por Voz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-foreground">
                  Activa el boton de lectura en voz alta
                </p>
                <p className="text-muted-foreground mt-1">
                  El sistema leera las instrucciones y contenido importante
                </p>
              </div>
              <Switch
                checked={settings.voiceEnabled}
                onCheckedChange={handleToggleVoice}
                className="scale-150"
                aria-label="Activar lectura por voz"
              />
            </div>
          </CardContent>
        </Card>

        {/* Simplified Interface */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              <Eye className="w-6 h-6 text-primary" aria-hidden="true" />
              Interfaz Simplificada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-foreground">
                  Muestra solo los elementos esenciales
                </p>
                <p className="text-muted-foreground mt-1">
                  Reduce distracciones visuales para mejor enfoque
                </p>
              </div>
              <Switch
                checked={settings.simplifiedInterface}
                onCheckedChange={handleToggleSimplified}
                className="scale-150"
                aria-label="Activar interfaz simplificada"
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card className="border-2 border-primary/50 shadow-lg bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" aria-hidden="true" />
              Vista Previa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-card rounded-xl border-2 border-border">
              <h3 className="text-xl font-bold text-foreground mb-2">Texto de Ejemplo</h3>
              <p className="text-muted-foreground mb-4">
                Asi se vera el texto con tu configuracion actual.
              </p>
              <div className="flex gap-4">
                <Button size="lg">Boton Principal</Button>
                <Button variant="outline" size="lg">
                  Boton Secundario
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Voice Button */}
        {settings.voiceEnabled && (
          <Button
            size="lg"
            className="w-full h-16 text-xl"
            onClick={() => speak("Prueba de lectura por voz. La configuracion esta funcionando correctamente.")}
          >
            <Volume2 className="w-6 h-6 mr-3" aria-hidden="true" />
            Probar Lectura por Voz
          </Button>
        )}

        {/* Info */}
        <div className="text-center text-muted-foreground p-4 bg-muted rounded-lg">
          <p>
            Los cambios se guardan automaticamente y se aplicaran en toda la plataforma.
          </p>
        </div>
      </main>
    </div>
  )
}
