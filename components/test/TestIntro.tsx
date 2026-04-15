"use client";

import { Sparkles, Eye, Volume2, Clock, Zap } from 'lucide-react';

interface TestIntroProps {
  onStart: () => void;
  onStartVisual: () => void;
  onStartAuditivo: () => void;
}

export function TestIntro({ onStart, onStartVisual, onStartAuditivo }: TestIntroProps) {
  return (
    <div className="text-center py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Test Educativo Inicial
        </h1>
        <p className="text-lg text-gray-600">
          ¡Vamos a descubrir cómo aprendes mejor!
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
        <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full mb-4 mx-auto">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-gray-800 mb-2">Módulo Visual</h3>
          <p className="text-sm text-gray-600">
            Juegos con imágenes y figuras para ver cómo percibes las cosas
          </p>
          <div className="flex items-center justify-center mt-3 text-sm text-blue-600">
            <Clock className="w-4 h-4 mr-1" />
            3-4 minutos
          </div>
        </div>

        <div className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-full mb-4 mx-auto">
            <Volume2 className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-gray-800 mb-2">Módulo Auditivo</h3>
          <p className="text-sm text-gray-600">
            Actividades con sonidos para descubrir cómo escuchas mejor
          </p>
          <div className="flex items-center justify-center mt-3 text-sm text-purple-600">
            <Clock className="w-4 h-4 mr-1" />
            3-4 minutos
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 rounded-2xl p-6 mb-8 max-w-2xl mx-auto border-2 border-yellow-200">
        <h3 className="font-bold text-gray-800 mb-3">¡Importante!</h3>
        <ul className="text-left text-sm text-gray-600 space-y-2">
          <li className="flex items-start">
            <span className="text-yellow-500 mr-2">•</span>
            No hay respuestas correctas o incorrectas
          </li>
          <li className="flex items-start">
            <span className="text-yellow-500 mr-2">•</span>
            Tómate tu tiempo y diviértete
          </li>
          <li className="flex items-start">
            <span className="text-yellow-500 mr-2">•</span>
            Si algo no se ve bien, ¡dinoslo!
          </li>
          <li className="flex items-start">
            <span className="text-yellow-500 mr-2">•</span>
            Usa audífonos para mejor experiencia
          </li>
        </ul>
      </div>

      {/* Start Buttons - Individual Tests */}
      <div className="mb-8 max-w-2xl mx-auto">
        <p className="text-sm font-semibold text-gray-600 mb-4">
          ¿Quieres hacer un test específico o ambos?
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <button
            onClick={onStartVisual}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg"
          >
            <Eye className="w-5 h-5" />
            Solo Test Visual
          </button>

          <button
            onClick={onStartAuditivo}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg"
          >
            <Volume2 className="w-5 h-5" />
            Solo Test Auditivo
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center justify-center gap-4 mb-6 max-w-2xl mx-auto">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="text-sm text-gray-500">O</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      {/* Start Button - Full Test */}
      <div className="mb-6 max-w-2xl mx-auto">
        <p className="text-sm text-gray-600 mb-3">
          Haz ambos tests para una evaluación completa
        </p>
        <button
          onClick={onStart}
          className="bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold py-4 px-8 rounded-full text-lg hover:from-pink-600 hover:to-rose-700 transition-all transform hover:scale-105 shadow-lg inline-flex items-center gap-2"
        >
          <Zap className="w-5 h-5" />
          ¡Aventura Completa! 🚀
        </button>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        Duración: Visual solo 3-4 min | Auditivo solo 3-4 min | Ambos 6-8 min
      </p>
    </div>
  );
}
