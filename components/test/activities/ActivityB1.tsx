"use client";

import { useState, useEffect } from 'react';
import { Volume2, VolumeX, RotateCcw, CheckCircle, XCircle } from 'lucide-react';

interface ActivityB1Props {
  onComplete: (score: number, maxScore: number, errors: number) => void;
  onAudioIssue: () => void;
}

const QUESTIONS = [
  {
    correctImage: "🐱",
    options: ["🐱", "🐶", "🐭", "🐹"],
    soundName: "gato",
    hasNoise: false,
    correctIndex: 0
  },
  {
    correctImage: "🚗",
    options: ["🚗", "🚕", "🚌", "🚙"],
    soundName: "auto",
    hasNoise: false,
    correctIndex: 0
  },
  {
    correctImage: "🌊",
    options: ["🌊", "💧", "🌧️", "⛈️"],
    soundName: "olas",
    hasNoise: true,
    correctIndex: 0
  },
  {
    correctImage: "🔔",
    options: ["🔔", "📢", "📣", "🎺"],
    soundName: "campana",
    hasNoise: true,
    correctIndex: 0
  },
  {
    correctImage: "🍎",
    options: ["🍎", "🍊", "🍋", "🍌"],
    soundName: "manzana",
    hasNoise: false,
    correctIndex: 0
  },
  {
    correctImage: "🎵",
    options: ["🎵", "🎶", "🎤", "🎸"],
    soundName: "musica",
    hasNoise: true,
    correctIndex: 0
  }
];

export function ActivityB1({ onComplete, onAudioIssue }: ActivityB1Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [attempts, setAttempts] = useState(0);

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
            answer === QUESTIONS[index].correctIndex
          ).length + (selectedAnswer === QUESTIONS[currentQuestion].correctIndex ? 1 : 0);
          
          const errors = QUESTIONS.length - correctAnswers;
          onComplete(correctAnswers, QUESTIONS.length, errors);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback, currentQuestion, answers, selectedAnswer, onComplete]);

  const playSound = () => {
    setIsPlaying(true);
    
    // Simulate sound playing
    setTimeout(() => {
      setIsPlaying(false);
    }, 2000);
  };

  const handleAnswer = (answerIndex: number) => {
    if (showFeedback) return;
    
    setAttempts(prev => prev + 1);
    setSelectedAnswer(answerIndex);
    setShowFeedback(true);
    
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);
  };

  const question = QUESTIONS[currentQuestion];
  const isCorrect = selectedAnswer === question.correctIndex;

  
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
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6">
          Escucha el sonido y selecciona la imagen correcta
        </h3>
        
        {question.hasNoise && (
          <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Esta pregunta tiene ruido de fondo
            </p>
          </div>
        )}
        
        {/* Sound Player */}
        <div className="bg-white rounded-2xl p-8 shadow-inner mb-6">
          <button
            onClick={playSound}
            disabled={isPlaying}
            className="mx-auto bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-full p-6 transition-all transform hover:scale-105 disabled:scale-100"
          >
            {isPlaying ? (
              <VolumeX className="w-8 h-8" />
            ) : (
              <Volume2 className="w-8 h-8" />
            )}
          </button>
          <p className="mt-4 text-gray-600">
            {isPlaying ? 'Reproduciendo sonido...' : 'Presiona para escuchar'}
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={showFeedback}
            className={`p-6 rounded-2xl text-6xl transition-all transform hover:scale-105 ${
              showFeedback
                ? index === question.correctIndex
                  ? 'bg-green-500 border-4 border-green-600'
                  : index === selectedAnswer
                  ? 'bg-red-500 border-4 border-red-600'
                  : 'bg-gray-200 border-2 border-gray-300'
                : 'bg-white border-4 border-gray-300 hover:border-purple-500 hover:bg-purple-50'
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
              <span className="font-medium">¡Excelente! 🎉</span>
            </>
          ) : (
            <>
              <XCircle className="w-6 h-6" />
              <span className="font-medium">Intenta de nuevo 😊</span>
            </>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={playSound}
          disabled={isPlaying}
          className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-full flex items-center gap-2 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Repetir sonido
        </button>
        
        <button
          onClick={onAudioIssue}
          className="bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium py-2 px-4 rounded-full transition-all"
        >
          No escucho bien
        </button>
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-500">
        Escucha atentamente y selecciona la imagen que corresponde al sonido
      </p>
    </div>
  );
}
