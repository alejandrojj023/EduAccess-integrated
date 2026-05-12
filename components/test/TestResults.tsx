"use client";

import { TestSummary } from '@/utils/test/scoring';
import { Eye, Volume2, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react';

interface TestResultsProps {
  summary: TestSummary;
  onComplete: () => void;
  onRetry: () => void;
}

export function TestResults({ summary, onComplete, onRetry }: TestResultsProps) {
  const hasVisualAlerts = summary.visual.totalErrors >= 2 || summary.visual.totalWarnings >= 3;
  const hasAudioAlerts = summary.auditivo.totalErrors >= 2 || summary.auditivo.totalWarnings >= 3;

  return (
    <div className="text-center py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          ¡Test Completado!
        </h1>
        <p className="text-lg text-gray-600">
          Gracias por participar. Aquí están tus resultados:
        </p>
      </div>

      {/* Results Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
        {/* Visual Module Results */}
        <div className={`rounded-2xl p-6 border-2 ${
          hasVisualAlerts 
            ? 'bg-yellow-50 border-yellow-300' 
            : 'bg-green-50 border-green-300'
        }`}>
          <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full mb-4 mx-auto">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-gray-800 mb-2">Módulo Visual</h3>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Aciertos:</span>
              <span className="font-medium">
                {summary.visual.activities.reduce((sum, a) => sum + a.score, 0)}/
                {summary.visual.activities.reduce((sum, a) => sum + a.maxScore, 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Dificultades:</span>
              <span className={`font-medium ${hasVisualAlerts ? 'text-yellow-600' : 'text-green-600'}`}>
                {summary.visual.totalErrors + summary.visual.totalWarnings}
              </span>
            </div>
          </div>

          {hasVisualAlerts && (
            <div className="bg-yellow-100 rounded-lg p-3 text-sm text-yellow-800">
              <div className="flex items-center mb-1">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="font-medium">Recomendación</span>
              </div>
              <p>Activar modo de alta visibilidad para mejor comodidad</p>
            </div>
          )}
        </div>

        {/* Audio Module Results */}
        <div className={`rounded-2xl p-6 border-2 ${
          hasAudioAlerts 
            ? 'bg-yellow-50 border-yellow-300' 
            : 'bg-green-50 border-green-300'
        }`}>
          <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-full mb-4 mx-auto">
            <Volume2 className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-gray-800 mb-2">Módulo Auditivo</h3>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Aciertos:</span>
              <span className="font-medium">
                {summary.auditivo.activities.reduce((sum, a) => sum + a.score, 0)}/
                {summary.auditivo.activities.reduce((sum, a) => sum + a.maxScore, 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Dificultades:</span>
              <span className={`font-medium ${hasAudioAlerts ? 'text-yellow-600' : 'text-green-600'}`}>
                {summary.auditivo.totalErrors + summary.auditivo.totalWarnings}
              </span>
            </div>
          </div>

          {hasAudioAlerts && (
            <div className="bg-yellow-100 rounded-lg p-3 text-sm text-yellow-800">
              <div className="flex items-center mb-1">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="font-medium">Recomendación</span>
              </div>
              <p>Activar apoyo auditivo para mejor experiencia</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Summary */}
      {summary.recommendations.length > 0 && (
        <div className="bg-blue-50 rounded-2xl p-6 mb-8 max-w-2xl mx-auto border-2 border-blue-200">
          <h3 className="font-bold text-gray-800 mb-3">Configuraciones Recomendadas</h3>
          <div className="flex flex-wrap gap-3 justify-center">
            {summary.recommendations.map((rec) => (
              <span
                key={rec}
                className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                {rec === 'ALTA_VISIBILIDAD' && '👁️ Alta Visibilidad'}
                {rec === 'APOYO_AUDITIVO' && '🔊 Apoyo Auditivo'}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Estas configuraciones se aplicarán automáticamente para ayudarte a aprender mejor
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onRetry}
          className="bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-full hover:bg-gray-300 transition-all flex items-center justify-center"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Volver a Hacer Test
        </button>
        
        <button
          onClick={onComplete}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-8 rounded-full hover:from-blue-600 hover:to-purple-700 transition-all"
        >
          Aplicar Configuraciones y Continuar
        </button>
      </div>

      <p className="text-sm text-gray-500 mt-6">
        Estos resultados son orientativos y ayudan a personalizar tu experiencia
      </p>
    </div>
  );
}
