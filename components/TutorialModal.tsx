import React from 'react';
import { CameraIcon, SparklesIcon, ChartBarIcon } from './icons';

interface TutorialModalProps {
  onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative border border-gray-700">
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Bem-vindo ao Flavos Healthy!</h2>
        <p className="text-gray-300 mb-6">Seu assistente de nutrição pessoal com IA. Veja como começar:</p>
        
        <ul className="space-y-4 text-left mb-8">
          <li className="flex items-center gap-4">
            <div className="bg-emerald-900/50 p-3 rounded-full">
              <CameraIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200">1. Tire uma Foto</h3>
              <p className="text-sm text-gray-400">Envie foto de uma refeição, ingrediente ou embalagem de produto.</p>
            </div>
          </li>
          <li className="flex items-center gap-4">
            <div className="bg-blue-900/50 p-3 rounded-full">
              <SparklesIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200">2. Deixe a IA Fazer a Mágica</h3>
              <p className="text-sm text-gray-400">Nossa IA analisa a comida para estimar as calorias.</p>
            </div>
          </li>
          <li className="flex items-center gap-4">
            <div className="bg-purple-900/50 p-3 rounded-full">
              <ChartBarIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200">3. Acompanhe seu Progresso</h3>
              <p className="text-sm text-gray-400">Veja seu histórico de refeições e acompanhe seus objetivos.</p>
            </div>
          </li>
        </ul>

        <button
          onClick={onClose}
          className="w-full bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-emerald-600 transition-colors"
        >
          Vamos Começar!
        </button>
      </div>
    </div>
  );
};

export default TutorialModal;