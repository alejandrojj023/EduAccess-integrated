"use client";

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';

interface ActivityA3Props {
  onComplete: (score: number, maxScore: number, errors: number) => void;
}

const PATTERNS = [
  {
    name: "Círculo Grande",
    shapes: [
      { type: 'circle', size: 80, color: 'bg-blue-500' },
      { type: 'circle', size: 60, color: 'bg-green-500' },
      { type: 'circle', size: 40, color: 'bg-red-500' },
    ]
  },
  {
    name: "Cuadrados Pequeños",
    shapes: [
      { type: 'square', size: 40, color: 'bg-purple-500' },
      { type: 'square', size: 30, color: 'bg-yellow-500' },
      { type: 'square', size: 20, color: 'bg-pink-500' },
    ]
  },
  {
    name: "Triángulos",
    shapes: [
      { type: 'triangle', size: 70, color: 'bg-orange-500' },
      { type: 'triangle', size: 50, color: 'bg-teal-500' },
      { type: 'triangle', size: 30, color: 'bg-indigo-500' },
    ]
  },
  {
    name: "Mezcla de Formas",
    shapes: [
      { type: 'circle', size: 50, color: 'bg-red-500' },
      { type: 'square', size: 60, color: 'bg-blue-500' },
      { type: 'triangle', size: 40, color: 'bg-green-500' },
    ]
  },
  {
    name: "Círculos de Colores",
    shapes: [
      { type: 'circle', size: 45, color: 'bg-yellow-500' },
      { type: 'circle', size: 45, color: 'bg-red-500' },
      { type: 'circle', size: 45, color: 'bg-blue-500' },
    ]
  },
  {
    name: "Formas Grandes",
    shapes: [
      { type: 'square', size: 70, color: 'bg-purple-500' },
      { type: 'circle', size: 70, color: 'bg-orange-500' },
      { type: 'triangle', size: 70, color: 'bg-teal-500' },
    ]
  }
];

const OPTIONS = [
  { type: 'circle', size: 60, color: 'bg-blue-500' },
  { type: 'square', size: 60, color: 'bg-green-500' },
  { type: 'triangle', size: 60, color: 'bg-red-500' },
  { type: 'circle', size: 40, color: 'bg-yellow-500' },
  { type: 'square', size: 40, color: 'bg-purple-500' },
  { type: 'triangle', size: 40, color: 'bg-pink-500' },
];

export function ActivityA3({ onComplete }: ActivityA3Props) {
  const [currentPattern, setCurrentPattern] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => {
        if (currentPattern < PATTERNS.length - 1) {
          setCurrentPattern(prev => prev + 1);
          setSelectedAnswer(null);
          setShowFeedback(false);
        } else {
          // Calculate results
          const correctAnswers = answers.filter((answer, index) => {
            const pattern = PATTERNS[index];
            const option = OPTIONS[answer];
            return pattern.shapes[0].type === option.type;
          }).length + (selectedAnswer !== null ? 
            PATTERNS[currentPattern].shapes[0].type === OPTIONS[selectedAnswer].type ? 1 : 0 : 0
          );
          
          const errors = PATTERNS.length - correctAnswers;
          onComplete(correctAnswers, PATTERNS.length, errors);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback, currentPattern, answers, selectedAnswer, onComplete]);

  const handleAnswer = (answerIndex: number) => {
    if (showFeedback) return;
    
    setAttempts(prev => prev + 1);
    setSelectedAnswer(answerIndex);
    setShowFeedback(true);
    
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);
  };

  const pattern = PATTERNS[currentPattern];
  const selectedOption = selectedAnswer !== null ? OPTIONS[selectedAnswer] : null;
  const isCorrect = selectedOption && pattern.shapes[0].type === selectedOption.type;

  const renderShape = (shape: any, index: number) => {
    const baseClasses = `inline-block mx-2 ${shape.color}`;
    
    if (shape.type === 'circle') {
      return (
        <div
          key={index}
          className={`${baseClasses} rounded-full`}
          style={{ width: shape.size, height: shape.size }}
        />
      );
    } else if (shape.type === 'square') {
      return (
        <div
          key={index}
          className={`${baseClasses} rounded-lg`}
          style={{ width: shape.size, height: shape.size }}
        />
      );
    } else if (shape.type === 'triangle') {
      return (
        <div
          key={index}
          className="inline-block mx-2"
          style={{ 
            width: 0, 
            height: 0, 
            borderLeft: `${shape.size/2}px solid transparent`,
            borderRight: `${shape.size/2}px solid transparent`,
            borderBottom: `${shape.size}px solid`,
            borderBottomColor: shape.color.replace('bg-', '#').replace('500', '500')
          }}
        />
      );
    }
    return null;
  };

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
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentPattern + 1) / PATTERNS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6">
          ¿Cuál es la forma principal en este patrón?
        </h3>
        
        {/* Pattern Display */}
        <div className="bg-white rounded-2xl p-8 shadow-inner mb-6">
          <h4 className="text-lg font-medium text-gray-700 mb-4">
            {pattern.name}
          </h4>
          <div className="flex items-center justify-center min-h-[120px]">
            {pattern.shapes.map((shape, index) => renderShape(shape, index))}
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {OPTIONS.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={showFeedback}
            className={`p-4 rounded-xl transition-all transform hover:scale-105 ${
              showFeedback
                ? index === selectedAnswer
                  ? isCorrect
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-600'
                : 'bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center justify-center">
              {renderShape(option, 0)}
            </div>
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
              <span className="font-medium">¡Correcto! 🎉</span>
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
      <div className="text-sm text-gray-500">
        <p>Selecciona la forma principal que ves en el patrón</p>
        {attempts > PATTERNS.length && (
          <p className="mt-2 text-orange-600">
            <RotateCcw className="inline w-4 h-4 mr-1" />
            No te preocupes si cometes errores, ¡sigue intentando!
          </p>
        )}
      </div>
    </div>
  );
}
