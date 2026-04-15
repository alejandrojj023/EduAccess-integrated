"use client";

import { useState, useEffect } from 'react';
import { Volume2, VolumeX, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { getAudioManager } from '@/lib/audio-utils';

interface ActivityB2Props {
  onComplete: (score: number, maxScore: number, errors: number) => void;
  onAudioIssue: () => void;
}

const SEQUENCES = [
  {
    name: "Sonidos de Animales",
    sounds: ["🐱", "🐶"],
    icons: ["🐱", "🐶"],
    maxLength: 4
  },
  {
    name: "Sonidos de Instrumentos",
    sounds: ["🔔", "🎵"],
    icons: ["🔔", "🎵"],
    maxLength: 4
  },
  {
    name: "Sonidos de Naturaleza",
    sounds: ["🌊", "🌧️"],
    icons: ["🌊", "🌧️"],
    maxLength: 4
  },
  {
    name: "Sonidos Mixtos",
    sounds: ["🐱", "🔔", "🌊"],
    icons: ["🐱", "🔔", "🌊"],
    maxLength: 3
  },
  {
    name: "Sonidos de Transporte",
    sounds: ["🚗", "✈️"],
    icons: ["🚗", "✈️"],
    maxLength: 4
  },
  {
    name: "Sonidos de Objetos",
    sounds: ["📱", "⏰"],
    icons: ["📱", "⏰"],
    maxLength: 3
  }
];

export function ActivityB2({ onComplete, onAudioIssue }: ActivityB2Props) {
  const [currentSequence, setCurrentSequence] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(2);
  const [maxLevelReached, setMaxLevelReached] = useState(1);
  const [attempts, setAttempts] = useState(0);
  const [hasPlayedSequence, setHasPlayedSequence] = useState(false);
  const [showVisualHints, setShowVisualHints] = useState(false);

  // Auto-play sequence when round starts
  useEffect(() => {
    if (!hasPlayedSequence && !isPlaying && !showFeedback && sequence.length === 0) {
      const timer = setTimeout(() => {
        playSequence();
        setHasPlayedSequence(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentSequence, hasPlayedSequence, isPlaying, showFeedback, sequence.length]);

  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => {
        if (currentSequence < SEQUENCES.length - 1) {
          setCurrentSequence(prev => prev + 1);
          resetRound();
        } else {
          // Calculate results based on max level reached
          const score = maxLevelReached * 2;
          const errors = maxLevelReached < 3 ? 1 : 0;
          onComplete(score, 8, errors);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback, currentSequence, maxLevelReached, onComplete]);

  const resetRound = () => {
    setSequence([]);
    setUserSequence([]);
    setHasPlayedSequence(false);
    setIsPlaying(false);
    setShowFeedback(false);
    setCurrentLevel(2);
  };

  const generateSequence = (length: number) => {
    const seqData = SEQUENCES[currentSequence];
    const newSequence: number[] = [];
    for (let i = 0; i < length; i++) {
      newSequence.push(Math.floor(Math.random() * seqData.sounds.length));
    }
    return newSequence;
  };

  const playSequence = async () => {
    const seqData = SEQUENCES[currentSequence];
    const newSequence = generateSequence(currentLevel);
    setSequence(newSequence);
    setUserSequence([]);
    setIsPlaying(true);

    try {
      const audioManager = getAudioManager();
      const soundsToPlay = newSequence.map(index => seqData.sounds[index]);
      await audioManager.playRandomSequence(soundsToPlay, 500);
    } catch (error) {
      console.error('Error playing sequence:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleSoundClick = (soundIndex: number) => {
    if (isPlaying || showFeedback) return;

    const newUserSequence = [...userSequence, soundIndex];
    setUserSequence(newUserSequence);

    // Check if sequence is complete
    if (newUserSequence.length === sequence.length) {
      setAttempts(prev => prev + 1);
      const isCorrect = newUserSequence.every((sound, index) => sound === sequence[index]);
      
      if (isCorrect && currentLevel < SEQUENCES[currentSequence].maxLength) {
        // Move to next level
        setCurrentLevel(prev => prev + 1);
        setMaxLevelReached(prev => Math.max(prev, currentLevel));
        setTimeout(() => playSequence(), 1500);
      } else {
        setShowFeedback(true);
      }
    }
  };

  const seqData = SEQUENCES[currentSequence];
  const isSequenceCorrect = userSequence.length === sequence.length && 
    userSequence.every((sound, index) => sound === sequence[index]);

  return (
    <div className="text-center">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Secuencia {currentSequence + 1} de {SEQUENCES.length}</span>
          <span>{Math.round(((currentSequence + 1) / SEQUENCES.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentSequence + 1) / SEQUENCES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6">
          Escucha y repite la secuencia de sonidos
        </h3>
        
        <div className="bg-white rounded-2xl p-8 shadow-inner mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-medium text-gray-700">
                {seqData.name}
              </h4>
              <div className="text-sm text-gray-600">
                Nivel: <span className="font-bold text-purple-600">{currentLevel}</span>
                <span className="text-gray-600">/{seqData.maxLength}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowVisualHints(prev => !prev)}
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              {showVisualHints ? 'Ocultar pistas visuales' : 'Mostrar pistas visuales'}
            </button>
          </div>

          {/* Sequence Display */}
          <div className="flex justify-center items-center min-h-[80px] mb-6">
            {sequence.length > 0 ? (
              showVisualHints ? (
                <div className="flex gap-2">
                  {sequence.map((sound, index) => (
                    <div
                      key={index}
                      className="text-4xl p-3 bg-purple-100 rounded-lg border-2 border-purple-300"
                    >
                      {seqData.icons[sound]}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">
                  La secuencia se reproduce en audio. Activa las pistas visuales si quieres ver los animales.
                </p>
              )
            ) : (
              <p className="text-gray-500">
                Presiona "Reproducir" para escuchar la secuencia
              </p>
            )}
          </div>

          {/* User Input Display */}
          {userSequence.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Tu secuencia:</p>
                <button
                  type="button"
                  onClick={() => setShowVisualHints(prev => !prev)}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  {showVisualHints ? 'Ocultar pistas visuales' : 'Mostrar pistas visuales'}
                </button>
              </div>
              <div className="flex justify-center gap-2">
                {showVisualHints ? (
                  userSequence.map((sound, index) => (
                    <div
                      key={index}
                      className="text-3xl p-2 bg-blue-100 rounded-lg border-2 border-blue-300"
                    >
                      {seqData.icons[sound]}
                    </div>
                  ))
                ) : (
                  userSequence.map((_, index) => (
                    <div
                      key={index}
                      className="w-10 h-10 flex items-center justify-center text-sm font-semibold bg-blue-100 rounded-lg border-2 border-blue-300"
                    >
                      {index + 1}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sound Buttons */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {seqData.sounds.map((sound, index) => (
          <button
            key={index}
            onClick={() => handleSoundClick(index)}
            disabled={isPlaying || showFeedback}
            className={`p-6 rounded-2xl text-5xl transition-all transform hover:scale-105 ${
              isPlaying || showFeedback
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white border-4 border-gray-300 hover:border-purple-500 hover:bg-purple-50'
            }`}
          >
            {seqData.icons[index]}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className={`rounded-xl p-4 mb-6 flex items-center justify-center gap-2 ${
          isSequenceCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isSequenceCorrect ? (
            <>
              <CheckCircle className="w-6 h-6" />
              <span className="font-medium">¡Perfecto! 🎉</span>
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
          onClick={playSequence}
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
              Reproducir Secuencia
            </>
          )}
        </button>
        
        <button
          onClick={() => {
            setUserSequence([]);
            setCurrentLevel(2);
          }}
          disabled={isPlaying || showFeedback}
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
        Escucha la secuencia y presiona los botones en el mismo orden
      </p>
    </div>
  );
}
