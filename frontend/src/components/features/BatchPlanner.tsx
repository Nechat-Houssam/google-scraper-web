import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ActionCard } from '@/components/ui/ActionCard';
import { batchService } from '@/services/batch.service';
import { useTracker } from '@/context/TrackerContext';

export const BatchPlanner = () => {
  const { locations, keywords, setStatus } = useTracker();
  const [batchName, setBatchName] = useState('');
  const [schedule, setSchedule] = useState('daily');

  const handleSaveBatch = async () => {
    if (!batchName.trim()) return;
    try {
      setStatus("⏳ Enregistrement...");
      await batchService.saveBatch(batchName, locations, keywords, schedule);
      setStatus("✅ Robot activé !");
      setBatchName('');
    } catch { setStatus("❌ Erreur planification."); }
  };

  return (
    <ActionCard title="PLANIFIER UN ROBOT" icon="🤖" buttonText="Enregistrer" onAction={handleSaveBatch} disabled={!batchName || (locations.length === 0 && keywords.length === 0)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input value={batchName} onChange={e => setBatchName(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 outline-none shadow-inner" placeholder="Nom..." />
        <div className="relative">
          <select value={schedule} onChange={e => setSchedule(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 outline-none appearance-none shadow-inner">
            <option value="daily">Chaque jour (02:00)</option>
            <option value="weekly">Chaque Lundi (02:00)</option>
            <option value="manual">Sauvegarder</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
        </div>
      </div>
      <div className="mt-2 px-2 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span>{locations.length} Villes</span> <span>{keywords.length} Mots</span>
      </div>
    </ActionCard>
  );
};