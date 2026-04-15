"use client";

import { useState, useEffect } from 'react';
import { Volume2, VolumeX, RotateCcw, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface ActivityB3Props {
  onComplete: (score: number, maxScore: number, errors: number) => void;
  onAudioIssue: () => void;
}

const PATTERNS = [
  {
    name: "Sube y Baja",
    pattern: ["up", "down"],
    description: "Sonido que sube y luego baja"
  },
  {
    name: "Dos Subidas",
    pattern: ["up", "up"],
    description: "Dos sonidos que suben"
  },
  {
    name: "Dos Bajadas",
    pattern: ["down", "down"],
    description: "Dos sonidos que bajan"
  },
  {
    name: "Sube, Sube, Baja",
    pattern: ["up", "up", "down"],
    description: "Sube, sube y luego baja"
  },
  {
    name: "Alterna",
    pattern: ["up", "down", "up"],
    description: "Sube, baja y vuelve a subir"
  },
  {
    name: "Baja, Sube",
    pattern: ["down", "up"],
    description: "Sonido que baja y luego sube"
  }
];

export function ActivityB3({ onComplete, onAudioIssue }: ActivityB3Props) {
  const [currentPattern, setCurrentPattern] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => {
        if (currentPattern < PATTERNS.length - 1) {
          setCurrentPattern(prev => prev + 1);
          setSelectedAnswer([]);
          setShowFeedback(false);
        } else {
          // Calculate results
          const correctAnswers = answers.filter(Boolean).length;
          const errors = PATTERNS.length - correctAnswers;
          onComplete(correctAnswers, PATTERNS.length, errors);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback, currentPattern, answers, onComplete]);

  const playPattern = () => {
    setIsPlaying(true);
    const pattern = PATTERNS[currentPattern];
    
    // Simulate playing the pattern
    pattern.pattern.forEach((direction, index) => {
      setTimeout(() => {
        console.log(`Playing ${direction} sound`);
        // Sound would play here
      }, index * 1000);
    });

    setTimeout(() => {
      setIsPlaying(false);
    }, pattern.pattern.length * 1000 + 500);
  };

  const handleDirectionClick = (direction: 'up' | 'down') => {
    if (isPlaying || showFeedback) return;

    const newAnswer = [...selectedAnswer, direction];
    setSelectedAnswer(newAnswer);

    // Check if answer is complete
    if (newAnswer.length === PATTERNS[currentPattern].pattern.length) {
      setAttempts(prev => prev + 1);
      const isCorrect = newAnswer.every((dir, index) => dir === PATTERNS[currentPattern].pattern[index]);
      
      setAnswers(prev => [...prev, isCorrect]);
      setShowFeedback(true);
    }
  };

  const clearAnswer = () => {
    setSelectedAnswer([]);
  };

  const pattern = PATTERNS[currentPattern];
  const isCorrect = selectedAnswer.length === pattern.pattern.length && 
    selectedAnswer.every((dir, index) => dir === pattern.pattern[index]);

  return (
    <div className="text-center">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Patrón {currentPattern + 1} de {PATTERNS.length}</span>
          <span>{Math.round(((currentPattern + 1) / PATTERNS.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentPattern + 1) / PATTERNS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6">
          Escucha el patrón y repítelo
        </h3>
        
        <div className="bg-white rounded-2xl p-8 shadow-inner mb-6">
          <h4 className="text-lg font-medium text-gray-700 mb-4">
            {pattern.name}
          </h4>
          <p className="text-sm text-gray-600 mb-6">
            {pattern.description}
          </p>
          
          {/* Pattern Length */}
          <div className="mb-4">
            <span className="text-sm text-gray-600">Longitud: </span>
            <span className="font-bold text-purple-600">{pattern.pattern.length} sonidos</span>
          </div>

          {/* User Answer Display */}
          {selectedAnswer.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Tu respuesta:</p>
              <div className="flex justify-center gap-3">
                {selectedAnswer.map((direction, index) => (
                  <div
                    key={index}
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold bg-blue-100 border-2 border-blue-300"
                  >
                    {direction === 'up' ? (
                      <TrendingUp className="w-8 h-8 text-blue-600" />
                    ) : (
                      <TrendingDown className="w-8 h-8 text-blue-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual Pattern Preview */}
          <div className="text-center text-gray-500">
            <div className="flex justify-center gap-2 mb-4">
              {pattern.pattern.map((direction, index) => (
                <div
                  key={index}
                  className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-100 border border-gray-300"
                >
                  {direction === 'up' ? (
                    <TrendingUp className="w-6 h-6 text-gray-400" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs">Patrón a reproducir</p>
          </div>
        </div>
      </div>

      {/* Direction Buttons */}
      <div className="grid grid-cols-2 gap-6 mb-6 max-w-xs mx-auto">
        <button
          onClick={() => handleDirectionClick('up')}
          disabled={isPlaying || showFeedback}
          className={`p-8 rounded-2xl transition-all transform hover:scale-105 ${
            isPlaying || showFeedback
              ? 'bg-gray-200 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
          }`}
        >
          <TrendingUp className="w-12 h-12" />
          <p className="mt-2 font-medium">Sube ↑</p>
        </button>
        
        <button
          onClick={() => handleDirectionClick('down')}
          disabled={isPlaying || showFeedback}
          className={`p-8 rounded-2xl transition-all transform hover:scale-105 ${
            isPlaying || showFeedback
              ? 'bg-gray-200 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
          }`}
        >
          <TrendingDown className="w-12 h-12" />
          <p className="mt-2 font-medium">Baja ↓</p>
        </button>
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
          onClick={playPattern}
          disabled={isPlaying || showFeedback}
          className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-full flex items-center gap-2 transition-all"
        >
          {isPlaying ? (
            <>
              <VolumeX className="w-5 h-5" />
              Reproduciendo...
            </>
          ) : (
            <>
              <Volume2 className="w-5 h-5" />
              Reproducir Patrón
            </>
          )}
        </button>
        
        <button
          onClick={clearAnswer}
          disabled={isPlaying || showFeedback || selectedAnswer.length === 0}
          className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-full flex items-center gap-2 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Limpiar
        </button>
        
        <button
          onClick={onAudioIssue}
          className="bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium py-3 px-4 rounded-full transition-all"
        >
          No escucho bien
        </button>
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-500">
        Escucha el patrón de sonidos y presiona los botones en el mismo orden
      </p>
    </div>
  );
}
