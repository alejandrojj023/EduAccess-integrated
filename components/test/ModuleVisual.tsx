"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { TestResult } from '@/utils/test/scoring';
import { ActivityA1 } from './activities/ActivityA1';
import { ActivityA2 } from './activities/ActivityA2';
import { ActivityA3 } from './activities/ActivityA3';
import { Eye, AlertCircle } from 'lucide-react';

interface ModuleVisualProps {
  activityIndex: number;
  onComplete: (result: TestResult) => void;
}

export function ModuleVisual({ activityIndex, onComplete }: ModuleVisualProps) {
  const startTimeRef = useRef(Date.now());
  const [noVeoBienCount, setNoVeoBienCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const handleNoVeoBien = useCallback(() => {
    setNoVeoBienCount(prev => prev + 1);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 2000);
  }, []);

  const handleActivityComplete = useCallback((score: number, maxScore: number, errors: number = 0) => {
    const timeSpent = Date.now() - startTimeRef.current;
    const warnings = noVeoBienCount;

    const result: TestResult = {
      moduleId: 'visual',
      activityId: `A${activityIndex + 1}`,
      score,
      maxScore,
      timeSpent,
      errors,
      warnings
    };

    onComplete(result);
  }, [activityIndex, noVeoBienCount, onComplete]);

  const renderActivity = () => {
    switch (activityIndex) {
      case 0:
        return <ActivityA1 onComplete={handleActivityComplete} />;
      case 1:
        return <ActivityA2 onComplete={handleActivityComplete} />;
      case 2:
        return <ActivityA3 onComplete={handleActivityComplete} />;
      default:
        return <ActivityA1 onComplete={handleActivityComplete} />;
    }
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-3 mx-auto">
          <Eye className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Módulo Visual
        </h2>
        <p className="text-gray-600">
          Actividad {activityIndex + 1} de 3
        </p>
      </div>

      {/* Persistent "No veo bien" Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleNoVeoBien}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
        >
          <AlertCircle className="w-5 h-5" />
          No veo bien 😕
        </button>
        {noVeoBienCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {noVeoBienCount}
          </span>
        )}
      </div>

      {/* Warning Message */}
      {showWarning && (
        <div className="fixed top-4 right-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 shadow-lg z-50 max-w-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              ¡Gracias por avisarnos! Tomaremos nota para ayudarte mejor.
            </span>
          </div>
        </div>
      )}

      {/* Activity Content */}
      <div className="bg-gray-50 rounded-2xl p-8">
        {renderActivity()}
      </div>

      {/* Instructions */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Si tienes dificultad para ver algo, presiona el botón "No veo bien" 
        </p>
      </div>
    </div>
  );
}
