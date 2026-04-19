import { useState } from 'react';
import { ActionCard } from '@/components/ui/ActionCard';
import { groupService } from '@/services/batch.service';

export const GroupCreator = ({ onGroupCreated, setStatus }: any) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'location' | 'keyword'>('location');
  const [newItemText, setNewItemText] = useState('');
  const [newGroupItems, setNewGroupItems] = useState<string[]>([]);

  // Ajout de mots dans les blocs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newItemText.trim() !== '') {
      e.preventDefault();
      if (!newGroupItems.includes(newItemText.trim())) {
        setNewGroupItems([...newGroupItems, newItemText.trim()]);
      }
      setNewItemText('');
    }
  };

  const handleRemovePendingItem = (indexToRemove: number) => {
    setNewGroupItems(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Création en base de données
  const handleCreateGroup = async () => {
    try {
      setStatus("⏳ Sauvegarde du groupe en base...");
      
      const newGroup = await groupService.createGroup(newGroupName, newGroupType, newGroupItems);

      const uiGroup = {
        id: newGroup.id,
        type: newGroup.type,
        content: newGroup.name,
      };

      // On prévient le parent (DragBoard) que c'est prêt
      onGroupCreated(uiGroup, newGroupType);

      setStatus("✅ Groupe créé et sauvegardé !");
      setNewGroupName('');
      setNewGroupItems([]);
      
    } catch (error) {
      console.error(error);
      setStatus("❌ Erreur lors de la sauvegarde du groupe.");
    }
  };

  return (
    <ActionCard 
      title="CRÉER UN GROUPE" 
      icon="🆕" 
      buttonText="Enregistrer le groupe" 
      onAction={handleCreateGroup} 
      disabled={!newGroupName || newGroupItems.length === 0}
    >
      <div className="flex gap-4">
        <select 
          value={newGroupType} 
          onChange={(e: any) => setNewGroupType(e.target.value)} 
          className="p-4 rounded-2xl bg-slate-50 border-none font-medium outline-none w-32 text-slate-900 shadow-inner"
        >
          <option value="location">📍 Ville</option>
          <option value="keyword">🔑 Mot</option>
        </select>
        <input 
          value={newGroupName} 
          onChange={(e) => setNewGroupName(e.target.value)} 
          className="flex-1 p-4 rounded-2xl bg-slate-50 border-none font-medium outline-none text-slate-900 placeholder:text-slate-400 shadow-inner" 
          placeholder="Nom du groupe..." 
        />
      </div>

      <input 
        value={newItemText}
        onChange={(e) => setNewItemText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full mt-4 p-4 rounded-2xl bg-slate-50 border-none font-medium outline-none text-slate-900 placeholder:text-slate-400 shadow-inner" 
        placeholder="Tapez un mot et appuyez sur Entrée..." 
      />

      {newGroupItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[60px]">
          {newGroupItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-sm font-medium text-slate-700">
              {item}
              <button 
                onClick={() => handleRemovePendingItem(idx)}
                className="text-slate-400 hover:text-red-500 font-bold transition-colors"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </ActionCard>
  );
};