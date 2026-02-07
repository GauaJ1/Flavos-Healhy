import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      fill="none" 
      className={className}
    >
      <defs>
        <linearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      
      {/* Círculo de Fundo Suave */}
      <circle cx="50" cy="50" r="48" fill="url(#leafGradient)" fillOpacity="0.2" stroke="url(#leafGradient)" strokeWidth="2" />
      
      {/* Folha Estilizada (Formato Orgânico) */}
      <path 
        d="M50 20 C50 20, 80 20, 80 50 C80 80, 50 80, 50 80 C50 80, 20 80, 20 50 C20 20, 50 20, 50 20 Z" 
        fill="url(#leafGradient)" 
      />
      
      {/* Detalhe da Folha (Veia Central) */}
      <path 
        d="M50 25 C50 25, 55 45, 50 75" 
        stroke="white" 
        strokeWidth="3" 
        strokeLinecap="round" 
        opacity="0.6"
      />
      
      {/* Ícone de Foco/Câmera sutil no centro */}
      <circle cx="50" cy="50" r="12" stroke="white" strokeWidth="3" fill="none" opacity="0.8" />
    </svg>
  );
};