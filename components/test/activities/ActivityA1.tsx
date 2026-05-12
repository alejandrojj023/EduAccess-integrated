"use client";

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ActivityA1Props {
  onComplete: (score: number, maxScore: number, errors: number) => void;
}

const QUESTIONS = [
  {
    question: "¿Qué animal ves en la imagen?",
    image: "🐱",
    options: ["Gato", "Perro", "Pájaro", "Pez"],
    correct: 0
  },
  {
    question: "¿Cuál es la forma correcta?",
    image: "🔺",
    options: ["Círculo", "Cuadrado", "Triángulo", "Rectángulo"],
    correct: 2
  },
  {
    question: "¿Qué color es principal?",
    image: "🍎",
    options: ["Amarillo", "Verde", "Azul", "Rojo"],
    correct: 3
  },
  {
    question: "¿Cuántos objetos ves?",
    image: "🍎🍌🍊",
    options: ["1", "2", "3", "4"],
    correct: 2
  },
  {
    question: "¿Qué vehículo es?",
    image: "🚗",
    options: ["Bicicleta", "Auto", "Avión", "Barco"],
    correct: 1
  },
  {
    question: "¿Qué fruta ves?",
    image: "🍌",
    options: ["Manzana", "Naranja", "Plátano", "Uva"],
    correct: 2
  }
];

export function ActivityA1({ onComplete }: ActivityA1Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);

  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => {
        if (currentQuestion < QUESTIONS.length - 1) {
          setCurrentQuestion(prev => prev + 1);
          setSelectedAnswer(null);
          setShowFeedback(false);
        } else {
          // Calculate results
          const correctAnswers = answers.filter((answer, index) => 
            answer === QUESTIONS[index].correct
          ).length + (selectedAnswer === QUESTIONS[currentQuestion].correct ? 1 : 0);
          
          const errors = QUESTIONS.length - correctAnswers;
          onComplete(correctAnswers, QUESTIONS.length, errors);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback, currentQuestion, answers, selectedAnswer, onComplete]);

  const handleAnswer = (answerIndex: number) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answerIndex);
    setShowFeedback(true);
    
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);
  };

  const question = QUESTIONS[currentQuestion];
  const isCorrect = selectedAnswer === question.correct;

  return (
    <div className="text-center">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Pregunta {currentQuestion + 1} de {QUESTIONS.length}</span>
          <span>{Math.round(((currentQuestion + 1) / QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6">
          {question.question}
        </h3>
        
        {/* Image */}
        <div className="text-8xl mb-8 bg-white rounded-2xl p-8 shadow-inner">
          {question.image}
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={showFeedback}
            className={`p-4 rounded-xl font-medium transition-all transform hover:scale-105 ${
              showFeedback
                ? index === question.correct
                  ? 'bg-green-500 text-white'
                  : index === selectedAnswer
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-600'
                : 'bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className={`rounded-xl p-4 mb-6 flex items-center justify-center gap-2 ${
          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isCorrect ? (
            <>
              <CheckCircle className="w-6 h-6" />
              <span className="font-medium">¡Muy bien! 🎉</span>
            </>
          ) : (
            <>
              <XCircle className="w-6 h-6" />
              <span className="font-medium">Intenta otra vez 😊</span>
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      <p className="text-sm text-gray-500">
        Selecciona la respuesta correcta
      </p>
    </div>
  );
}
