"use client";

import { CheckCircle, Settings, Home } from 'lucide-react';

interface TestCompletedProps {
  onRestart: () => void;
}

export function TestCompleted({ onRestart }: TestCompletedProps) {
  return (
    <div className="text-center py-12">
      {/* Success Icon */}
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mb-4 animate-pulse">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          ¡Configuración Aplicada!
        </h1>
        <p className="text-lg text-gray-600">
          Tu experiencia ha sido personalizada para aprender mejor
        </p>
      </div>

      {/* Applied Settings */}
      <div className="bg-blue-50 rounded-2xl p-6 mb-8 max-w-2xl mx-auto border-2 border-blue-200">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full mb-4 mx-auto">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-bold text-gray-800 mb-3">Configuraciones Activadas</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-left">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Accesibilidad Visual</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Texto más grande</li>
              <li>• Alto contraste</li>
              <li>• Botones más visibles</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Apoyo Auditivo</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Subtítulos disponibles</li>
              <li>• Repetición de audio</li>
              <li>• Instrucciones visuales</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-green-50 rounded-2xl p-6 mb-8 max-w-2xl mx-auto border-2 border-green-200">
        <h3 className="font-bold text-gray-800 mb-3">¿Qué sigue?</h3>
        <p className="text-gray-600 mb-4">
          Ahora puedes comenzar a usar EduAccess con las configuraciones que mejor se adaptan a ti.
          Estas ayudas estarán disponibles siempre que las necesites.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">
            🎓 Comenzar Lecciones
          </span>
          <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
            🎮 Jugar Actividades
          </span>
          <span className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium">
            👤 Mi Perfil
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onRestart}
          className="bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-full hover:bg-gray-300 transition-all"
        >
          Ajustar Configuración
        </button>
        
        <button
          onClick={() => window.location.href = '/'}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-8 rounded-full hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center"
        >
          <Home className="w-5 h-5 mr-2" />
          Ir al Inicio
        </button>
      </div>

      <p className="text-sm text-gray-500 mt-6">
        Puedes cambiar estas configuraciones en cualquier momento desde ajustes
      </p>
    </div>
  );
}
