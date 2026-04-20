import { useState } from 'react';
import { ActionCard } from '@/components/ui/ActionCard';
import { groupService } from '@/services/group.service';
import { useTracker } from '@/context/TrackerContext';

export const GroupCreator = () => {
  const { setStatus, setAvailableLocGroups, setAvailableKwGroups } = useTracker();
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'location' | 'keyword'>('location');
  const [newItemText, setNewItemText] = useState('');
  const [newGroupItems, setNewGroupItems] = useState<string[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newItemText.trim() !== '') {
      e.preventDefault();
      if (!newGroupItems.includes(newItemText.trim())) setNewGroupItems([...newGroupItems, newItemText.trim()]);
      setNewItemText('');
    }
  };

  const handleCreateGroup = async () => {
    try {
      setStatus("⏳ Sauvegarde...");
      const newGroup = await groupService.createGroup(newGroupName, newGroupType, newGroupItems);
      const uiGroup = { id: `group:${newGroup.slug}`, type: newGroup.type, content: (newGroupType === 'location' ? '📍 ' : '🔑 ') + newGroup.name, items: newGroupItems };
      if (newGroupType === 'location') setAvailableLocGroups(prev => [...prev, uiGroup]);
      else setAvailableKwGroups(prev => [...prev, uiGroup]);
      setStatus("✅ Groupe sauvegardé !");
      setNewGroupName(''); setNewGroupItems([]);
    } catch (error: any) {
      setStatus(error.message === "ALREADY_EXISTS" ? "❌ Ce nom existe déjà." : "❌ Erreur création.");
    }
  };

  return (
    <ActionCard title="CRÉER UN GROUPE" icon="🆕" buttonText="Enregistrer" onAction={handleCreateGroup} disabled={!newGroupName || newGroupItems.length === 0}>
      <div className="flex gap-4">
        <select value={newGroupType} onChange={(e: any) => setNewGroupType(e.target.value)} className="p-4 rounded-2xl bg-slate-50 outline-none w-32 shadow-inner">
          <option value="location">📍 Ville</option>
          <option value="keyword">🔑 Mot</option>
        </select>
        <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="flex-1 p-4 rounded-2xl bg-slate-50 outline-none shadow-inner" placeholder="Nom..." />
      </div>
      <input value={newItemText} onChange={(e) => setNewItemText(e.target.value)} onKeyDown={handleKeyDown} className="w-full mt-4 p-4 rounded-2xl bg-slate-50 outline-none shadow-inner" placeholder="Appuyez sur Entrée..." />
      {newGroupItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 p-4 bg-slate-50/50 rounded-2xl border min-h-[60px]">
          {newGroupItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border text-sm font-medium">
              {item} <button onClick={() => setNewGroupItems(p => p.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500">×</button>
            </div>
          ))}
        </div>
      )}
    </ActionCard>
  );
};