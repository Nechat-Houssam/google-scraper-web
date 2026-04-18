import { Play, ServerCog, Database, X } from 'lucide-react';

interface HeaderProps {
  loading: boolean;
  onScanAction: (action: 'start' | 'stop') => void;
}

export const Header = ({ loading, onScanAction }: HeaderProps) => (
  <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
    <div>
      <h1 className="text-4xl font-black flex items-center gap-3 text-gray-900">
        <ServerCog className="text-blue-600 w-10 h-10" />Tracker Studio
      </h1>
      <p className="text-gray-500 flex items-center gap-2 mt-1">
        <Database size={16} /> Supabase Live Data
      </p>
    </div>
    
    <button 
      onClick={() => onScanAction(loading ? 'stop' : 'start')}
      className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-xl shadow-xl transition-all active:scale-95 ${loading ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
    >
      {loading ? <><X size={24}/> ANNULER</> : <><Play fill="currentColor"/> LANCER LE SCAN</>}
    </button>
  </header>
);