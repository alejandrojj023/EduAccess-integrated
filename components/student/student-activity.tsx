"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAccessibility } from "@/lib/accessibility-context"
import {
  ArrowLeft,
  Volume2,
  RefreshCw,
  Check,
  X,
  Star,
  ChevronRight,
  Mic,
  Image as ImageIcon,
  HelpCircle,
} from "lucide-react"

interface StudentActivityProps {
  activityType: string | null
  onBack: () => void
  onComplete: () => void
  onVoiceActivity: () => void
}

interface ActivityOption {
  id: string
  label: string
  imageUrl?: string
  isCorrect: boolean
}

const sampleActivities = {
  image: {
    instruction: "Mira la imagen y selecciona el animal que ves",
    question: "Que animal es este?",
    options: [
      { id: "1", label: "Perro", isCorrect: true },
      { id: "2", label: "Gato", isCorrect: false },
      { id: "3", label: "Conejo", isCorrect: false },
      { id: "4", label: "Pajaro", isCorrect: false },
    ],
  },
  multiple: {
    instruction: "Lee la pregunta y selecciona la respuesta correcta",
    question: "Cuanto es 2 + 3?",
    options: [
      { id: "1", label: "4", isCorrect: false },
      { id: "2", label: "5", isCorrect: true },
      { id: "3", label: "6", isCorrect: false },
      { id: "4", label: "7", isCorrect: false },
    ],
  },
}

export function StudentActivity({
  activityType,
  onBack,
  onComplete,
  onVoiceActivity,
}: StudentActivityProps) {
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const totalQuestions = 5
  const { speak, settings } = useAccessibility()

  const activity = sampleActivities.image

  const handleReadInstructions = () => {
    speak(`${activity.instruction}. ${activity.question}`)
  }

  const handleSelectAnswer = (option: ActivityOption) => {
    if (showResult) return
    
    setSelectedAnswer(option.id)
    setShowResult(true)
    setIsCorrect(option.isCorrect)
    
    if (option.isCorrect) {
      setScore(score + 1)
      speak("Muy bien! Respuesta correcta!")
    } else {
      speak("Intentalo de nuevo. La respuesta no es correcta.")
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    } else {
      speak(`Felicidades! Completaste la actividad con ${score} de ${totalQuestions} respuestas correctas.`)
      onComplete()
    }
  }

  const handleRepeatInstructions = () => {
    speak(activity.instruction)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={onBack}
              className="h-12 w-12 p-0"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-accent" aria-hidden="true" />
              <span className="text-xl font-bold">{score}</span>
            </div>
          </div>
          
          {/* Progress */}
          <div className="flex items-center gap-4">
            <span className="text-lg font-medium">
              Pregunta {currentQuestion} de {totalQuestions}
            </span>
            <Progress
              value={(currentQuestion / totalQuestions) * 100}
              className="flex-1 h-4 bg-primary-foreground/20"
            />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Instructions */}
        <Card className="border-2 shadow-xl mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <HelpCircle className="w-7 h-7 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Instrucciones</h2>
                <p className="text-xl text-muted-foreground">{activity.instruction}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {settings.voiceEnabled && (
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 text-lg border-2"
                  onClick={handleReadInstructions}
                >
                  <Volume2 className="w-6 h-6 mr-3" aria-hidden="true" />
                  Escuchar instrucciones
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-lg border-2"
                onClick={handleRepeatInstructions}
              >
                <RefreshCw className="w-6 h-6 mr-3" aria-hidden="true" />
                Repetir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Visual Example / Question */}
        <Card className="border-2 shadow-xl mb-8">
          <CardContent className="p-8">
            {/* Image placeholder */}
            <div className="w-full h-48 bg-muted rounded-2xl flex items-center justify-center mb-6">
              <ImageIcon className="w-20 h-20 text-muted-foreground" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold text-center text-foreground">
              {activity.question}
            </h3>
          </CardContent>
        </Card>

        {/* Answer Options */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {activity.options.map((option) => {
            const isSelected = selectedAnswer === option.id
            const showCorrect = showResult && option.isCorrect
            const showWrong = showResult && isSelected && !option.isCorrect

            return (
              <button
                key={option.id}
                onClick={() => handleSelectAnswer(option)}
                disabled={showResult}
                className={`p-6 rounded-2xl border-4 text-2xl font-bold transition-all ${
                  showCorrect
                    ? "bg-success/10 border-success text-success"
                    : showWrong
                    ? "bg-destructive/10 border-destructive text-destructive"
                    : isSelected
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-muted"
                }`}
                aria-label={option.label}
              >
                <div className="flex items-center justify-center gap-3">
                  {showCorrect && <Check className="w-8 h-8" aria-hidden="true" />}
                  {showWrong && <X className="w-8 h-8" aria-hidden="true" />}
                  {option.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* Result and Next */}
        {showResult && (
          <Card className={`border-4 shadow-xl mb-8 ${isCorrect ? "border-success bg-success/5" : "border-destructive bg-destructive/5"}`}>
            <CardContent className="p-6 text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${isCorrect ? "bg-success" : "bg-destructive"}`}>
                {isCorrect ? (
                  <Check className="w-10 h-10 text-success-foreground" aria-hidden="true" />
                ) : (
                  <X className="w-10 h-10 text-destructive-foreground" aria-hidden="true" />
                )}
              </div>
              <h3 className={`text-3xl font-bold mb-4 ${isCorrect ? "text-success" : "text-destructive"}`}>
                {isCorrect ? "Excelente!" : "Intentalo de nuevo"}
              </h3>
              <p className="text-xl text-muted-foreground mb-6">
                {isCorrect
                  ? "Has ganado una estrella!"
                  : "No te preocupes, sigue practicando!"}
              </p>
              <Button
                size="lg"
                className="h-16 text-xl px-12"
                onClick={handleNextQuestion}
              >
                {currentQuestion < totalQuestions ? "Siguiente Pregunta" : "Terminar"}
                <ChevronRight className="w-6 h-6 ml-3" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Voice Activity Button */}
        <Button
          variant="outline"
          size="lg"
          className="w-full h-16 text-xl border-2"
          onClick={onVoiceActivity}
        >
          <Mic className="w-6 h-6 mr-3" aria-hidden="true" />
          Actividad con Voz
        </Button>
      </main>
    </div>
  )
}
