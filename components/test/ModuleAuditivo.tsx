"use client";

import { useState, useCallback } from 'react';
import { TestResult } from '@/utils/test/scoring';
import { ActivityB1 } from './activities/ActivityB1';
import { ActivityB2 } from './activities/ActivityB2';
import { ActivityB3 } from './activities/ActivityB3';
import { Volume2, VolumeX } from 'lucide-react';

interface ModuleAuditivoProps {
  activityIndex: number;
  onComplete: (result: TestResult) => void;
}

export function ModuleAuditivo({ activityIndex, onComplete }: ModuleAuditivoProps) {
  const [startTime] = useState(Date.now());
  const [audioIssues, setAudioIssues] = useState(0);

  const handleAudioIssue = useCallback(() => {
    setAudioIssues(prev => prev + 1);
  }, []);

  const handleActivityComplete = useCallback((score: number, maxScore: number, errors: number = 0) => {
    const timeSpent = Date.now() - startTime;
    const warnings = audioIssues;
    
    const result: TestResult = {
      moduleId: 'auditivo',
      activityId: `B${activityIndex + 1}`,
      score,
      maxScore,
      timeSpent,
      errors,
      warnings
    };
    
    onComplete(result);
  }, [activityIndex, audioIssues, startTime, onComplete]);

  const renderActivity = () => {
    switch (activityIndex) {
      case 0:
        return <ActivityB1 onComplete={handleActivityComplete} onAudioIssue={handleAudioIssue} />;
      case 1:
        return <ActivityB2 onComplete={handleActivityComplete} onAudioIssue={handleAudioIssue} />;
      case 2:
        return <ActivityB3 onComplete={handleActivityComplete} onAudioIssue={handleAudioIssue} />;
      default:
        return <ActivityB1 onComplete={handleActivityComplete} onAudioIssue={handleAudioIssue} />;
    }
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center w-16 h-16 bg-purple-500 rounded-full mb-3 mx-auto">
          <Volume2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Módulo Auditivo
        </h2>
        <p className="text-gray-600">
          Actividad {activityIndex + 1} de 3
        </p>
      </div>

      {/* Audio Issue Button */}
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={handleAudioIssue}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
        >
          <VolumeX className="w-5 h-5" />
          No escucho bien 🎧
        </button>
        {audioIssues > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {audioIssues}
          </span>
        )}
      </div>

      {/* Activity Content */}
      <div className="bg-gray-50 rounded-2xl p-8">
        {renderActivity()}
      </div>

      {/* Instructions */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Usa audífonos para mejor experiencia
        </p>
      </div>
    </div>
  );
}
