"use client";

import { Sparkles, Eye, Volume2, Clock } from 'lucide-react';

interface TestIntroProps {
  onStart: () => void;
}

export function TestIntro({ onStart }: TestIntroProps) {
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

      {/* Start Button */}
      <button
        onClick={onStart}
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-8 rounded-full text-lg hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
      >
        ¡Comenzar Aventura! 🚀
      </button>

      <p className="text-sm text-gray-500 mt-4">
        Duración total: 6-8 minutos
      </p>
    </div>
  );
}
