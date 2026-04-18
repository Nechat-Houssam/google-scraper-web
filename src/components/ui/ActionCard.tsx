import React from 'react';
import { Plus } from 'lucide-react';

interface ActionCardProps {
  title: string;
  icon: string | React.ReactNode;
  buttonText: string;
  onAction: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const ActionCard = ({ title, icon, buttonText, onAction, disabled, children }: ActionCardProps) => {
  return (
    <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between h-full">
      <div className="space-y-6">
        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="text-base">{icon}</span> {title}
        </h2>
        
        <div className="space-y-4">
          {children}
        </div>
      </div>

      {/* BOUTON CORRIGÉ : On utilise une condition pour les couleurs de base */}
      <button 
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onAction();
        }}
        disabled={disabled}
        className={`
          mt-8 w-full p-4 rounded-2xl font-bold flex items-center justify-center gap-2 
          transition-all duration-300 ease-out
          ${disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-dashed border-gray-200' 
            : 'bg-gray-900 text-white hover:bg-black hover:scale-105 hover:shadow-2xl active:scale-95 cursor-pointer shadow-md'
          }
        `}
      >
        <Plus size={20} />
        <span>{buttonText}</span>
      </button>
    </section>
  );
};