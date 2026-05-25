"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTestState } from '@/hooks/test/useTestState';
import { TestResult } from '@/utils/test/scoring';
import { TestIntro } from './TestIntro';
import { ModuleVisual } from './ModuleVisual';
import { ModuleAuditivo } from './ModuleAuditivo';
import { TestResults } from './TestResults';
import { TestCompleted } from './TestCompleted';

export function TestContainer() {
  const router = useRouter();
  const [showExitModal, setShowExitModal] = useState(false);
  const {
    state,
    startTest,
    startVisualTest,
    startAuditivoTest,
    nextActivity,
    addResult,
    completeTest,
    resetTest,
    getTestSummary
  } = useTestState();

  const isInProgress = state.currentStep === 'visual' || state.currentStep === 'auditivo';

  const handleBack = () => {
    if (isInProgress) {
      setShowExitModal(true);
    } else {
      router.push("/");
    }
  };

  const handleTestComplete = () => {
    const summary = getTestSummary();
    completeTest();
    
    // Apply accessibility settings based on recommendations
    summary.recommendations.forEach((recommendation: string) => {
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
        return <TestIntro 
          onStart={startTest} 
          onStartVisual={startVisualTest}
          onStartAuditivo={startAuditivoTest}
        />;
      
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
        return <TestIntro 
          onStart={startTest} 
          onStartVisual={startVisualTest}
          onStartAuditivo={startAuditivoTest}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="mx-auto max-w-4xl">

        {/* Botón regresar */}
        {state.currentStep !== 'completed' && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Regresar"
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Regresar
            </button>
          </div>
        )}
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

      {/* Modal confirmación al salir durante el test */}
      {showExitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-test-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white border border-gray-200 shadow-2xl p-6 space-y-4">
            <div className="space-y-1">
              <h2 id="exit-test-title" className="text-base font-bold text-gray-900">
                ¿Salir del test?
              </h2>
              <p className="text-sm text-gray-500">
                Perderás tu avance en este módulo si sales ahora.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full h-11 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 active:scale-[0.98] transition-all"
              >
                Continuar el test
              </button>
              <button
                type="button"
                onClick={() => { setShowExitModal(false); router.push("/"); }}
                className="w-full h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                Salir de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
