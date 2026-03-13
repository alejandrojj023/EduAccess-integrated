"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAccessibility } from "@/lib/accessibility-context"
import {
  ArrowLeft,
  Volume2,
  Mic,
  MicOff,
  RefreshCw,
  Check,
  X,
  HelpCircle,
  Loader2,
} from "lucide-react"

interface VoiceActivityProps {
  onBack: () => void
  onComplete: () => void
}

export function VoiceActivity({ onBack, onComplete }: VoiceActivityProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedText, setRecordedText] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { speak, settings } = useAccessibility()
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const question = "Como se llama el animal que ladra?"
  const correctAnswer = "perro"

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "es-ES"

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript.toLowerCase()
        setRecordedText(transcript)
        setIsProcessing(true)
        
        // Check answer after a short delay
        setTimeout(() => {
          const correct = transcript.includes(correctAnswer)
          setIsCorrect(correct)
          setShowResult(true)
          setIsProcessing(false)
          
          if (correct) {
            speak("Muy bien! Tu respuesta es correcta. Dijiste: " + transcript)
          } else {
            speak("Intentalo de nuevo. Tu respuesta fue: " + transcript)
          }
        }, 1000)
      }

      recognitionRef.current.onerror = () => {
        setIsRecording(false)
        speak("No se pudo escuchar tu voz. Intentalo de nuevo.")
      }

      recognitionRef.current.onend = () => {
        setIsRecording(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const handleStartRecording = () => {
    if (recognitionRef.current) {
      setRecordedText("")
      setShowResult(false)
      setIsRecording(true)
      recognitionRef.current.start()
      speak("Escuchando. Habla ahora.")
    } else {
      speak("Tu navegador no soporta reconocimiento de voz.")
    }
  }

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleReadInstructions = () => {
    speak(`Actividad de respuesta por voz. ${question}. Presiona el boton del microfono y di tu respuesta en voz alta.`)
  }

  const handleRetry = () => {
    setRecordedText("")
    setShowResult(false)
    setIsCorrect(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="secondary"
            size="lg"
            onClick={onBack}
            className="h-12 w-12 p-0"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Respuesta por Voz</h1>
          {settings.voiceEnabled && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleReadInstructions}
              className="h-12 w-12 p-0"
              aria-label="Escuchar instrucciones"
            >
              <Volume2 className="w-6 h-6" />
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Instructions */}
        <Card className="border-2 shadow-xl mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <HelpCircle className="w-7 h-7 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Instrucciones</h2>
                <p className="text-xl text-muted-foreground">
                  Presiona el boton del microfono y responde la pregunta en voz alta.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question */}
        <Card className="border-2 shadow-xl mb-8 bg-primary/5">
          <CardContent className="p-8 text-center">
            <h3 className="text-3xl font-bold text-foreground">{question}</h3>
          </CardContent>
        </Card>

        {/* Microphone Button */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isProcessing}
            className={`w-40 h-40 rounded-full flex items-center justify-center transition-all shadow-xl ${
              isRecording
                ? "bg-destructive animate-pulse"
                : isProcessing
                ? "bg-muted"
                : "bg-primary hover:bg-primary/90"
            }`}
            aria-label={isRecording ? "Detener grabacion" : "Comenzar grabacion"}
          >
            {isProcessing ? (
              <Loader2 className="w-20 h-20 text-primary-foreground animate-spin" aria-hidden="true" />
            ) : isRecording ? (
              <MicOff className="w-20 h-20 text-destructive-foreground" aria-hidden="true" />
            ) : (
              <Mic className="w-20 h-20 text-primary-foreground" aria-hidden="true" />
            )}
          </button>
          <p className="text-xl text-muted-foreground mt-6">
            {isRecording
              ? "Escuchando... Habla ahora"
              : isProcessing
              ? "Procesando tu respuesta..."
              : "Toca para hablar"}
          </p>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 mt-4">
              <div className="w-4 h-4 bg-destructive rounded-full animate-pulse" />
              <span className="text-lg font-medium text-destructive">Grabando</span>
            </div>
          )}
        </div>

        {/* Recognized Text */}
        {recordedText && (
          <Card className="border-2 shadow-xl mb-8">
            <CardContent className="p-6">
              <p className="text-lg text-muted-foreground mb-2">Tu respuesta:</p>
              <p className="text-2xl font-bold text-foreground text-center p-4 bg-muted rounded-xl">
                "{recordedText}"
              </p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {showResult && (
          <Card
            className={`border-4 shadow-xl mb-8 ${
              isCorrect ? "border-success bg-success/5" : "border-destructive bg-destructive/5"
            }`}
          >
            <CardContent className="p-6 text-center">
              <div
                className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  isCorrect ? "bg-success" : "bg-destructive"
                }`}
              >
                {isCorrect ? (
                  <Check className="w-10 h-10 text-success-foreground" aria-hidden="true" />
                ) : (
                  <X className="w-10 h-10 text-destructive-foreground" aria-hidden="true" />
                )}
              </div>
              <h3
                className={`text-3xl font-bold mb-4 ${
                  isCorrect ? "text-success" : "text-destructive"
                }`}
              >
                {isCorrect ? "Excelente!" : "Intentalo de nuevo"}
              </h3>
              <p className="text-xl text-muted-foreground mb-6">
                {isCorrect
                  ? "Tu respuesta es correcta!"
                  : `La respuesta correcta es: "${correctAnswer}"`}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!isCorrect && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-16 text-xl border-2"
                    onClick={handleRetry}
                  >
                    <RefreshCw className="w-6 h-6 mr-3" aria-hidden="true" />
                    Intentar de Nuevo
                  </Button>
                )}
                <Button size="lg" className="h-16 text-xl" onClick={onComplete}>
                  {isCorrect ? "Siguiente Actividad" : "Continuar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <p className="text-center text-muted-foreground">
          Si tienes problemas con el microfono, asegurate de dar permiso al navegador para usar el
          microfono.
        </p>
      </main>
    </div>
  )
}
