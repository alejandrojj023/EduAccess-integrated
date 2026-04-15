"use client";

import { useState } from 'react';
import { useTestState } from '@/hooks/test/useTestState';
import { TestResult } from '@/utils/test/scoring';
import { TestIntro } from './TestIntro';
import { ModuleVisual } from './ModuleVisual';
import { ModuleAuditivo } from './ModuleAuditivo';
import { TestResults } from './TestResults';
import { TestCompleted } from './TestCompleted';

export function TestContainer() {
  const {
    state,
    startTest,
    nextActivity,
    addResult,
    completeTest,
    resetTest,
    getTestSummary
  } = useTestState();

  const handleTestComplete = () => {
    const summary = getTestSummary();
    completeTest();
    
    // Apply accessibility settings based on recommendations
    summary.recommendations.forEach(recommendation => {
      if (recommendation === 'ALTA_VISIBILIDAD') {
        document.documentElement.classList.add('high-contrast');
        document.documentElement.style.fontSize = '18px';
      }
      if (recommendation === 'APOYO_AUDITIVO') {
        // Enable audio support settings
        localStorage.setItem('audioSupport', 'true');
      }
    });
  };

  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 'intro':
        return <TestIntro onStart={startTest} />;
      
      case 'visual':
        return (
          <ModuleVisual
            activityIndex={state.currentActivity}
            onComplete={(result: TestResult) => {
              addResult(result);
              nextActivity();
            }}
          />
        );
      
      case 'auditivo':
        return (
          <ModuleAuditivo
            activityIndex={state.currentActivity}
            onComplete={(result: TestResult) => {
              addResult(result);
              nextActivity();
            }}
          />
        );
      
      case 'results':
        return (
          <TestResults
            summary={getTestSummary()}
            onComplete={handleTestComplete}
            onRetry={resetTest}
          />
        );
      
      case 'completed':
        return <TestCompleted onRestart={resetTest} />;
      
      default:
        return <TestIntro onStart={startTest} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Progress Bar */}
        {state.currentStep !== 'intro' && state.currentStep !== 'completed' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                {state.currentStep === 'visual' && 'Módulo Visual'}
                {state.currentStep === 'auditivo' && 'Módulo Auditivo'}
                {state.currentStep === 'results' && 'Resultados'}
              </span>
              <span className="text-sm font-medium text-gray-600">
                {state.currentStep === 'visual' && `${state.currentActivity + 1}/3`}
                {state.currentStep === 'auditivo' && `${state.currentActivity + 1}/3`}
                {state.currentStep === 'results' && 'Finalizado'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: state.currentStep === 'visual' 
                    ? `${((state.currentActivity + 1) / 3) * 50}%`
                    : state.currentStep === 'auditivo'
                    ? `${50 + ((state.currentActivity + 1) / 3) * 50}%`
                    : '100%'
                }}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
}
