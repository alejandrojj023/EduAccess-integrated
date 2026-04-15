"use client";

import { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface ActivityA2Props {
  onComplete: (score: number, maxScore: number, errors: number) => void;
}

export function ActivityA2({ onComplete }: ActivityA2Props) {
  const [isTracking, setIsTracking] = useState(false);
  const [losses, setLosses] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pointPosition, setPointPosition] = useState({ x: 50, y: 50 });
  const [userPosition, setUserPosition] = useState({ x: 50, y: 50 });
  const [distance, setDistance] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTracking && !isComplete) {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isTracking, startTime, isComplete]);

  useEffect(() => {
    if (isTracking && !isComplete) {
      const moveInterval = setInterval(() => {
        setPointPosition(prev => {
          const newX = Math.max(5, Math.min(95, prev.x + (Math.random() - 0.5) * 15));
          const newY = Math.max(5, Math.min(95, prev.y + (Math.random() - 0.5) * 15));
          return { x: newX, y: newY };
        });
      }, 500);
      return () => clearInterval(moveInterval);
    }
  }, [isTracking, isComplete]);

  useEffect(() => {
    const dist = Math.sqrt(
      Math.pow(pointPosition.x - userPosition.x, 2) + 
      Math.pow(pointPosition.y - userPosition.y, 2)
    );
    setDistance(dist);

    if (isTracking && dist > 30) {
      setLosses(prev => prev + 1);
    }
  }, [pointPosition, userPosition, isTracking]);

  useEffect(() => {
    if (elapsedTime >= 15000 && !isComplete) { // 15 seconds
      setIsComplete(true);
      setIsTracking(false);
      
      // Calculate score based on losses
      const score = Math.max(0, 10 - losses);
      const errors = losses > 5 ? 1 : 0;
      onComplete(score, 10, errors);
    }
  }, [elapsedTime, losses, isComplete, onComplete]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTracking || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setUserPosition({ x, y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isTracking || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    setUserPosition({ x, y });
  };

  const startTracking = () => {
    setIsTracking(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setLosses(0);
    setPointPosition({ x: 50, y: 50 });
    setUserPosition({ x: 50, y: 50 });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  if (isComplete) {
    return (
      <div className="text-center py-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            ¡Actividad Completada! 🎯
          </h3>
          <p className="text-gray-600">
            Seguiste el punto durante {formatTime(elapsedTime)}
          </p>
        </div>
        
        <div className="bg-blue-50 rounded-xl p-6 mb-6">
          <h4 className="font-bold text-gray-800 mb-3">Resultados:</h4>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <span className="text-gray-600">Veces que perdiste el punto:</span>
              <span className="ml-2 font-bold text-blue-600">{losses}</span>
            </div>
            <div>
              <span className="text-gray-600">Puntuación:</span>
              <span className="ml-2 font-bold text-green-600">{Math.max(0, 10 - losses)}/10</span>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {losses <= 2 && "¡Excelente seguimiento visual! 👁️"}
          {losses > 2 && losses <= 5 && "Buen seguimiento, sigue practicando 😊"}
          {losses > 5 && "Recomendamos activar ayudas visuales"}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Sigue el punto con tu ratón o dedo 👆
        </h3>
        <p className="text-gray-600">
          Mantén el cursor sobre el punto rojo mientras se mueve
        </p>
      </div>

      {!isTracking ? (
        <div className="mb-6">
          <button
            onClick={startTracking}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all transform hover:scale-105"
          >
            Comenzar a Seguir 🎯
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Tiempo: {formatTime(elapsedTime)} / 15s
            </span>
            <span className="text-sm font-medium text-gray-600">
              Pérdidas: {losses}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(elapsedTime / 15000) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tracking Area */}
      <div
        ref={containerRef}
        className="relative bg-gray-100 rounded-2xl h-96 cursor-crosshair overflow-hidden border-2 border-gray-300"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {isTracking && (
          <>
            {/* Moving Point */}
            <div
              className="absolute w-6 h-6 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 shadow-lg z-10"
              style={{
                left: `${pointPosition.x}%`,
                top: `${pointPosition.y}%`,
              }}
            />
            
            {/* User Cursor */}
            <div
              className="absolute w-4 h-4 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100"
              style={{
                left: `${userPosition.x}%`,
                top: `${userPosition.y}%`,
              }}
            />
            
            {/* Connection Line */}
            {distance > 30 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
              >
                <line
                  x1={`${pointPosition.x}%`}
                  y1={`${pointPosition.y}%`}
                  x2={`${userPosition.x}%`}
                  y2={`${userPosition.y}%`}
                  stroke="rgba(239, 68, 68, 0.3)"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              </svg>
            )}
          </>
        )}
        
        {!isTracking && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">👁️</div>
              <p className="text-gray-600">
                Presiona "Comenzar" y sigue el punto rojo
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 text-sm text-gray-500">
        {isTracking ? (
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Mantén tu cursor sobre el punto rojo mientras se mueve</span>
          </div>
        ) : (
          <p>Usa tu ratón o dedo para seguir el punto cuando aparezca</p>
        )}
      </div>
    </div>
  );
}
