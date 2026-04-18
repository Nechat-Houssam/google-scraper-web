import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ListItem } from '@/types';

interface GroupCreatorProps {
  setStatus: (msg: string) => void;
  onGroupCreated: (item: ListItem) => void;
}

export const GroupCreator = ({ setStatus, onGroupCreated }: GroupCreatorProps) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'location' | 'keyword'>('location');
  const [newGroupTags, setNewGroupTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !newGroupTags.includes(val)) {
        setNewGroupTags([...newGroupTags, val]);
      }
      setTagInput('');
    }
  };

  const handleTagPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const words = paste.split(/[\n,]+/).map(w => w.trim()).filter(w => w !== '');
    const uniqueWords = words.filter(w => !newGroupTags.includes(w));
    if (uniqueWords.length > 0) {
      setNewGroupTags([...newGroupTags, ...uniqueWords]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewGroupTags(newGroupTags.filter(tag => tag !== tagToRemove));
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || newGroupTags.length === 0) {
      setStatus("❌ Il faut un nom ET au moins une valeur.");
      return;
    }

    setStatus("⏳ Création du groupe et insertion des données...");
    const slug = newGroupName.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert([{ name: newGroupName.trim(), type: newGroupType, slug }])
        .select();

      if (groupError) throw groupError;

      if (groupData && groupData.length > 0) {
        const groupId = groupData[0].id;
        const insertPayload = newGroupTags.map(val => ({ group_id: groupId, value: val }));

        const { error: itemsError } = await supabase.from('group_items').insert(insertPayload);
        if (itemsError) throw itemsError;

        const formattedItem: ListItem = {
          id: `group:${groupData[0].slug}`,
          content: `${groupData[0].type === 'location' ? '📍' : '🔑'} ${groupData[0].name}`,
          type: groupData[0].type as 'location' | 'keyword',
          items: newGroupTags
        };

        onGroupCreated(formattedItem); // On renvoie l'item au parent !
        setNewGroupName('');
        setNewGroupTags([]);
        setTagInput('');
        setStatus(`✅ Groupe "${newGroupName}" créé avec ${newGroupTags.length} éléments.`);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Erreur lors de la création du groupe.");
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
      <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">🆕 Créer un Groupe</h2>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <select 
            value={newGroupType}
            onChange={e => setNewGroupType(e.target.value as 'location' | 'keyword')}
            className="w-1/3 bg-gray-50 border-none rounded-xl p-3 text-sm text-gray-900 outline-none cursor-pointer"
          >
            <option value="location">📍 Ville</option>
            <option value="keyword">🔑 Mot-clé</option>
          </select>
          <input 
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="Nom du groupe..."
            className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="flex flex-col gap-2">
          {newGroupTags.length > 0 && (
            <div className="flex flex-wrap gap-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100 max-h-32 overflow-y-auto">
              {newGroupTags.map(tag => (
                <div key={tag} className="flex items-center gap-1 bg-white border border-gray-200 px-3 py-1 rounded-lg shadow-sm text-sm font-medium text-gray-700">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500 transition-colors ml-1"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <input 
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onPaste={handleTagPaste}
            placeholder="Tapez un mot et appuyez sur Entrée..."
            className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        
        <button onClick={createGroup} className="bg-gray-900 text-white p-3 rounded-xl hover:bg-black transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 font-bold">
          <Plus size={18} /> Enregistrer le groupe
        </button>
      </div>
    </div>
  );
};