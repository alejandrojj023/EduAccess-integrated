"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAccessibility } from "@/lib/accessibility-context"
import { supabase } from "@/lib/supabase"
import {
  Volume2,
  Check,
  ChevronRight,
  Eye,
  Music,
  Brain,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react"

interface InitialTestProps {
  onComplete: () => void
}

interface TestQuestion {
  id: string
  type: "visual" | "audio" | "cognitive"
  question: string
  options: { id: string; label: string; isCorrect: boolean }[]
}

const testQuestions: TestQuestion[] = [
  {
    id: "1",
    type: "visual",
    question: "Que color es este?",
    options: [
      { id: "a", label: "Rojo", isCorrect: true },
      { id: "b", label: "Azul", isCorrect: false },
      { id: "c", label: "Verde", isCorrect: false },
    ],
  },
  {
    id: "2",
    type: "visual",
    question: "Cuantos circulos ves?",
    options: [
      { id: "a", label: "2", isCorrect: false },
      { id: "b", label: "3", isCorrect: true },
      { id: "c", label: "4", isCorrect: false },
    ],
  },
  {
    id: "3",
    type: "audio",
    question: "Que sonido escuchaste?",
    options: [
      { id: "a", label: "Perro", isCorrect: true },
      { id: "b", label: "Gato", isCorrect: false },
      { id: "c", label: "Pajaro", isCorrect: false },
    ],
  },
  {
    id: "4",
    type: "cognitive",
    question: "Que numero sigue: 1, 2, 3, ___",
    options: [
      { id: "a", label: "5", isCorrect: false },
      { id: "b", label: "4", isCorrect: true },
      { id: "c", label: "6", isCorrect: false },
    ],
  },
  {
    id: "5",
    type: "cognitive",
    question: "Cual es mas grande?",
    options: [
      { id: "a", label: "Hormiga", isCorrect: false },
      { id: "b", label: "Elefante", isCorrect: true },
      { id: "c", label: "Raton", isCorrect: false },
    ],
  },
]

export function InitialTest({ onComplete }: InitialTestProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isComplete, setIsComplete] = useState(false)
  const { speak, settings } = useAccessibility()

  const question = testQuestions[currentQuestion]
  const totalQuestions = testQuestions.length
  const progress = ((currentQuestion + 1) / totalQuestions) * 100

  const handleReadInstructions = () => {
    speak(
      `Test inicial. Pregunta ${currentQuestion + 1} de ${totalQuestions}. ${question.question}`
    )
  }

  const handleSelectAnswer = (optionId: string) => {
    setSelectedAnswer(optionId)
  }

  const handleNextQuestion = async () => {
    if (!selectedAnswer) return

    const newAnswers = { ...answers, [question.id]: selectedAnswer }
    setAnswers(newAnswers)

    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
    } else {
      // Test completado — enviar resultados al backend
      const respuestas = testQuestions.map((q) => {
        const answerId = newAnswers[q.id]
        const selectedOption = q.options.find((o) => o.id === answerId)
        return {
          pregunta: q.question,
          respuesta: selectedOption?.label ?? "",
          puntaje: selectedOption?.isCorrect ? 1 : 0,
        }
      })

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.access_token) {
          await fetch("/api/test-inicial", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ respuestas }),
          })
        }
      } catch (error) {
        console.error("Error al enviar test:", error)
      }

      setIsComplete(true)
      speak(
        "Has completado el test inicial. Vamos a preparar tu experiencia de aprendizaje personalizada."
      )
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "visual":
        return Eye
      case "audio":
        return Music
      case "cognitive":
        return Brain
      default:
        return Eye
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "visual":
        return "Identificacion Visual"
      case "audio":
        return "Reconocimiento de Sonidos"
      case "cognitive":
        return "Actividad Cognitiva"
      default:
        return "Actividad"
    }
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-2 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-24 h-24 mx-auto bg-success rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-12 h-12 text-success-foreground" aria-hidden="true" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Test Completado!</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Gracias por completar el test inicial. Hemos preparado una experiencia de aprendizaje
              personalizada para ti.
            </p>
            <Button size="lg" className="h-16 text-xl w-full" onClick={onComplete}>
              Comenzar a Aprender
              <ChevronRight className="w-6 h-6 ml-3" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const TypeIcon = getTypeIcon(question.type)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TypeIcon className="w-6 h-6" aria-hidden="true" />
              <span className="font-medium">{getTypeLabel(question.type)}</span>
            </div>
            {settings.voiceEnabled && (
              <Button
                variant="secondary"
                size="lg"
                onClick={handleReadInstructions}
                className="h-12"
              >
                <Volume2 className="w-5 h-5 mr-2" aria-hidden="true" />
                Escuchar
              </Button>
            )}
          </div>

          {/* Progress */}
          <div className="flex items-center gap-4">
            <span className="text-lg font-medium">
              Pregunta {currentQuestion + 1} de {totalQuestions}
            </span>
            <Progress value={progress} className="flex-1 h-4 bg-primary-foreground/20" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Info Card */}
        {currentQuestion === 0 && (
          <Card className="border-2 border-primary/50 bg-primary/5 shadow-lg mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-2">Test Inicial</h2>
              <p className="text-lg text-muted-foreground">
                Este test nos ayudara a conocerte mejor y personalizar tu experiencia de
                aprendizaje. Responde cada pregunta lo mejor que puedas.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Visual Example */}
        {question.type === "visual" && (
          <Card className="border-2 shadow-xl mb-8">
            <CardContent className="p-8">
              <div className="w-full h-40 bg-muted rounded-2xl flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-muted-foreground" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audio Example */}
        {question.type === "audio" && (
          <Card className="border-2 shadow-xl mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                  <Music className="w-12 h-12 text-accent-foreground" aria-hidden="true" />
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 text-lg border-2"
                  onClick={() => speak("Guau guau guau")}
                >
                  <Volume2 className="w-6 h-6 mr-3" aria-hidden="true" />
                  Escuchar Sonido
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question */}
        <Card className="border-2 shadow-xl mb-8 bg-primary/5">
          <CardContent className="p-8 text-center">
            <h3 className="text-3xl font-bold text-foreground">{question.question}</h3>
          </CardContent>
        </Card>

        {/* Options */}
        <div className="grid gap-4 mb-8">
          {question.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelectAnswer(option.id)}
              className={`p-6 rounded-2xl border-4 text-2xl font-bold transition-all text-left flex items-center gap-4 ${
                selectedAnswer === option.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-muted"
              }`}
              aria-pressed={selectedAnswer === option.id}
            >
              <span
                className={`w-12 h-12 rounded-full border-4 flex items-center justify-center shrink-0 ${
                  selectedAnswer === option.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border"
                }`}
              >
                {selectedAnswer === option.id && <Check className="w-6 h-6" />}
              </span>
              {option.label}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <Button
          size="lg"
          className="w-full h-16 text-xl"
          onClick={handleNextQuestion}
          disabled={!selectedAnswer}
        >
          {currentQuestion < totalQuestions - 1 ? "Siguiente" : "Terminar Test"}
          <ChevronRight className="w-6 h-6 ml-3" aria-hidden="true" />
        </Button>
      </main>
    </div>
  )
}
