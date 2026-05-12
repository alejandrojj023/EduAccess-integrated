"use client";

import { useState, useEffect } from 'react';
import { Volume2, VolumeX, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { getAudioManager } from '@/lib/audio-utils';

interface ActivityB1Props {
  onComplete: (score: number, maxScore: number, errors: number) => void;
  onAudioIssue: () => void;
}

const QUESTIONS = [
  {
    correctImage: "🐱",
    options: ["🐱", "🐶", "🐭", "🐹"],
    soundName: "gato",
    description: "la palabra 'Gato'",
    hasNoise: false,
    correctIndex: 0 // Will be randomized
  },
  {
    correctImage: "🚗",
    options: ["🚗", "🚕", "🚌", "🚙"],
    soundName: "auto",
    description: "la palabra 'Automóvil'",
    hasNoise: false,
    correctIndex: 0 // Will be randomized
  },
  {
    correctImage: "🌊",
    options: ["🌊", "💧", "🌧️", "⛈️"],
    soundName: "olas",
    description: "la palabra 'Olas'",
    hasNoise: false,
    correctIndex: 0 // Will be randomized
  },
  {
    correctImage: "🔔",
    options: ["🔔", "📢", "📣", "🎺"],
    soundName: "campana",
    description: "la palabra 'Campana'",
    hasNoise: false,
    correctIndex: 0 // Will be randomized
  },
  {
    correctImage: "🍎",
    options: ["🍎", "🍊", "🍋", "🍌"],
    soundName: "manzana",
    description: "la palabra 'Manzana'",
    hasNoise: false,
    correctIndex: 0 // Will be randomized
  },
  {
    correctImage: "🎵",
    options: ["🎵", "🎶", "🎤", "🎸"],
    soundName: "musica",
    description: "la palabra 'Música'",
    hasNoise: false,
    correctIndex: 0 // Will be randomized
  }
];

// Function to shuffle array and return shuffled version with correct index
function shuffleOptions(question: typeof QUESTIONS[0]) {
  const shuffledOptions = [...question.options];
  const correctImage = question.correctImage;
  
  // Fisher-Yates shuffle
  for (let i = shuffledOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
  }
  
  // Find new index of correct image
  const correctIndex = shuffledOptions.indexOf(correctImage);
  
  return {
    ...question,
    options: shuffledOptions,
    correctIndex
  };
}

export function ActivityB1({ onComplete, onAudioIssue }: ActivityB1Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<typeof QUESTIONS>([]);

  // Shuffle questions on mount
  useEffect(() => {
    const shuffled = QUESTIONS.map(shuffleOptions);
    setShuffledQuestions(shuffled);
  }, []);

  // Auto-play sound when question changes
  useEffect(() => {
    if (shuffledQuestions.length === 0) return; // Wait for questions to be shuffled
    if (showFeedback) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsPlaying(true);
      try {
        const audioManager = getAudioManager();
        await audioManager.playSound(shuffledQuestions[currentQuestion].soundName);
      } catch (error) {
        console.error('Error auto-playing sound:', error);
      } finally {
        if (!cancelled) setIsPlaying(false);
      }
    }, 300);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [currentQuestion, showFeedback, shuffledQuestions]);

  useEffect(() => {
    if (shuffledQuestions.length === 0) return; // Wait for questions to be shuffled
    
    if (showFeedback) {
      const timer = setTimeout(() => {
        if (currentQuestion < shuffledQuestions.length - 1) {
          setCurrentQuestion(prev => prev + 1);
          setSelectedAnswer(null);
          setShowFeedback(false);
        } else {
          // Calculate results
          const correctAnswers = answers.filter((answer, index) => 
            answer === shuffledQuestions[index].correctIndex
          ).length + (selectedAnswer === shuffledQuestions[currentQuestion].correctIndex ? 1 : 0);
          
          const errors = shuffledQuestions.length - correctAnswers;
          onComplete(correctAnswers, shuffledQuestions.length, errors);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback, currentQuestion, answers, selectedAnswer, onComplete, shuffledQuestions]);

  const playSound = async () => {
    if (shuffledQuestions.length === 0) return;
    
    setIsPlaying(true);
    
    try {
      const audioManager = getAudioManager();
      await audioManager.playSound(shuffledQuestions[currentQuestion].soundName);
    } catch (error) {
      console.error('Error playing sound:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (showFeedback) return;
    
    setAttempts(prev => prev + 1);
    setSelectedAnswer(answerIndex);
    setShowFeedback(true);
    
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);
  };

  if (shuffledQuestions.length === 0) {
    return <div className="flex justify-center items-center h-64">
      <div className="text-lg">Cargando actividad...</div>
    </div>;
  }

  const question = shuffledQuestions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctIndex;

  return (
    <div className="text-center">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Pregunta {currentQuestion + 1} de {shuffledQuestions.length}</span>
          <span>{Math.round(((currentQuestion + 1) / shuffledQuestions.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / shuffledQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Escucha el sonido y selecciona la imagen correcta
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Vas a escuchar {question.description}
        </p>
        
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
