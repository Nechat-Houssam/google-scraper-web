import { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { StrictModeDroppable as Droppable } from '@/components/ui/StrictModeDroppable';
import { Plus, ChevronDown } from 'lucide-react';
import { ListItem } from '@/types';
import { DraggableItem } from '@/components/ui/DraggableItem';
import { ActionCard } from '@/components/ui/ActionCard';
import { batchService, groupService } from '@/services/batch.service';

export const DragBoard = ({
  availableLocGroups, setAvailableLocGroups,
  availableKwGroups, setAvailableKwGroups,
  locations, setLocations,
  keywords, setKeywords,
  addManualItem, setStatus
}: any) => {
  // --- STATES LOCAUX ---
  const [manualLoc, setManualLoc] = useState('');
  const [manualKw, setManualKw] = useState('');
  
  const [batchName, setBatchName] = useState('');
  const [schedule, setSchedule] = useState('daily');
  
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'location' | 'keyword'>('location');
  const [newItemText, setNewItemText] = useState('');
  const [newGroupItems, setNewGroupItems] = useState<string[]>([]);

  // --- 1. CRÉATION DE GROUPE ---
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

  const handleCreateGroup = async () => {
    try {
      setStatus("⏳ Sauvegarde du groupe en base...");
      
      const newGroup = await groupService.createGroup(newGroupName, newGroupType, newGroupItems);

      const uiGroup = {
        id: newGroup.id,
        type: newGroup.type,
        content: newGroup.name,
      };

      if (newGroupType === 'location') {
        setAvailableLocGroups((prev: any) => [...prev, uiGroup]);
      } else {
        setAvailableKwGroups((prev: any) => [...prev, uiGroup]);
      }

      setStatus("✅ Groupe créé et sauvegardé !");
      setNewGroupName('');
      setNewGroupItems([]);
      
    } catch (error) {
      console.error(error);
      setStatus("❌ Erreur lors de la création du groupe.");
    }
  };

  // --- 2. SUPPRESSION / DÉSASSIGNATION ---
  const handleRemoveAction = async (item: ListItem, listType: string) => {
    if (listType === 'available-locations' || listType === 'available-keywords') {
      const confirm = window.confirm(`🔥 Voulez-vous supprimer DÉFINITIVEMENT "${item.content}" de la base de données ?`);
      if (!confirm) return;

      try {
        setStatus("⏳ Suppression en base...");
        await groupService.deleteGroup(item.id);

        if (listType === 'available-locations') {
          setAvailableLocGroups((p: any) => p.filter((i: any) => i.id !== item.id));
        } else {
          setAvailableKwGroups((p: any) => p.filter((i: any) => i.id !== item.id));
        }
        setStatus("✅ Supprimé définitivement.");
      } catch (err) {
        console.error(err);
        setStatus("❌ Erreur de suppression en base.");
      }
    } 
    else {
      if (listType === 'locations') {
        setLocations((p: any) => p.filter((i: any) => i.id !== item.id));
        setAvailableLocGroups((p: any) => [...p, item]);
      } else {
        setKeywords((p: any) => p.filter((i: any) => i.id !== item.id));
        setAvailableKwGroups((p: any) => [...p, item]);
      }
      setStatus("🔄 Remis en bibliothèque");
    }
  };

  // --- 3. SAUVEGARDE ROBOT ---
  const handleSaveBatch = async () => {
    try {
      setStatus("⏳ Enregistrement du robot...");
      await batchService.saveBatch(batchName, locations, keywords, schedule);
      setStatus("✅ Robot activé avec succès !");
      setBatchName('');
    } catch (err) {
      setStatus("❌ Erreur lors de la planification");
    }
  };

  // --- 4. DRAG & DROP ---
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const allItems = [...availableLocGroups, ...availableKwGroups, ...locations, ...keywords];
    const draggedItem = allItems.find(i => i.id === draggableId);
    if (!draggedItem) return;

    if (destination.droppableId === 'locations' && draggedItem.type !== 'location') return;
    if (destination.droppableId === 'keywords' && draggedItem.type !== 'keyword') return;

    let item: ListItem | undefined;
    const removeFromSource = (list: ListItem[], setList: any) => {
      const copy = [...list];
      const [removed] = copy.splice(source.index, 1);
      setList(copy);
      return removed;
    };

    if (source.droppableId === 'available-locations') item = removeFromSource(availableLocGroups, setAvailableLocGroups);
    else if (source.droppableId === 'available-keywords') item = removeFromSource(availableKwGroups, setAvailableKwGroups);
    else if (source.droppableId === 'locations') item = removeFromSource(locations, setLocations);
    else if (source.droppableId === 'keywords') item = removeFromSource(keywords, setKeywords);

    if (!item) return;

    const addToDest = (list: ListItem[], setList: any) => {
      const copy = [...list];
      copy.splice(destination.index, 0, item!);
      setList(copy);
    };

    if (destination.droppableId === 'available-locations') addToDest(availableLocGroups, setAvailableLocGroups);
    else if (destination.droppableId === 'available-keywords') addToDest(availableKwGroups, setAvailableKwGroups);
    else if (destination.droppableId === 'locations') addToDest(locations, setLocations);
    else if (destination.droppableId === 'keywords') addToDest(keywords, setKeywords);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-10">
        
        {/* HAUT : WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
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

          <ActionCard 
            title="PLANIFIER UN ROBOT" 
            icon="🤖" 
            buttonText="Enregistrer le Robot"
            onAction={handleSaveBatch}
            disabled={!batchName || (locations.length === 0 && keywords.length === 0)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input 
                value={batchName}
                onChange={e => setBatchName(e.target.value)}
                className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-medium outline-none placeholder:text-slate-400 shadow-inner"
                placeholder="Nom du projet..."
              />
              <div className="relative">
                <select 
                  value={schedule}
                  onChange={e => setSchedule(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-medium outline-none appearance-none cursor-pointer shadow-inner"
                >
                  <option value="daily">Chaque jour (02:00)</option>
                  <option value="weekly">Chaque Lundi (02:00)</option>
                  <option value="manual">Sauvegarder uniquement</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
          </ActionCard>
        </div>

        {/* BAS : DRAG & DROP */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch">
          
          <section className="flex flex-col gap-6">
            <h2 className="text-sm font-black text-slate-400 uppercase px-2 tracking-widest">📚 Bibliothèque</h2>
            
            <div className="space-y-4">
              <h3 className="text-xs font-black text-orange-500 uppercase px-2 tracking-wider">📍 Groupes Villes</h3>
              <Droppable droppableId="available-locations">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="bg-orange-50/30 border-2 border-dashed border-orange-200 rounded-3xl p-5 min-h-[150px]">
                    {availableLocGroups.map((item: any, index: number) => (
                      <DraggableItem key={item.id} item={item} index={index} color="border-orange-100" onRemove={() => handleRemoveAction(item, 'available-locations')} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-blue-500 uppercase px-2 tracking-wider">🔑 Groupes Mots-clés</h3>
              <Droppable droppableId="available-keywords">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="bg-blue-50/30 border-2 border-dashed border-blue-200 rounded-3xl p-5 min-h-[150px]">
                    {availableKwGroups.map((item: any, index: number) => (
                      <DraggableItem key={item.id} item={item} index={index} color="border-blue-100" onRemove={() => handleRemoveAction(item, 'available-keywords')} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-black text-orange-600 uppercase flex items-center gap-2 px-2">
              🎯 Villes Cibles <span className="text-[10px] bg-orange-200 px-2 py-0.5 rounded-full">{locations.length}</span>
            </h2>
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-orange-100">
              <input 
                value={manualLoc} 
                onChange={e => setManualLoc(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && (addManualItem('location', manualLoc), setManualLoc(''))}
                className="flex-1 p-2 outline-none text-sm text-slate-900" 
                placeholder="Ajouter ville..." 
              />
              <button onClick={() => { addManualItem('location', manualLoc); setManualLoc(''); }} className="bg-orange-500 text-white p-2 rounded-xl shadow-sm">
                <Plus size={20} />
              </button>
            </div>
            <Droppable droppableId="locations">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 bg-orange-50/50 border-2 border-orange-100 rounded-3xl p-5 min-h-[450px]">
                  {locations.map((item: any, index: number) => (
                    <DraggableItem key={item.id} item={item} index={index} color="border-orange-200" onRemove={() => handleRemoveAction(item, 'locations')} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-black text-blue-600 uppercase flex items-center gap-2 px-2">
              🎯 Mots-Clés <span className="text-[10px] bg-blue-200 px-2 py-0.5 rounded-full">{keywords.length}</span>
            </h2>
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-blue-100">
              <input 
                value={manualKw} 
                onChange={e => setManualKw(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && (addManualItem('keyword', manualKw), setManualKw(''))}
                className="flex-1 p-2 outline-none text-sm text-slate-900" 
                placeholder="Ajouter mot..." 
              />
              <button onClick={() => { addManualItem('keyword', manualKw); setManualKw(''); }} className="bg-blue-500 text-white p-2 rounded-xl shadow-sm">
                <Plus size={20} />
              </button>
            </div>
            <Droppable droppableId="keywords">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 bg-blue-50/50 border-2 border-blue-100 rounded-3xl p-5 min-h-[450px]">
                  {keywords.map((item: any, index: number) => (
                    <DraggableItem key={item.id} item={item} index={index} color="border-blue-200" onRemove={() => handleRemoveAction(item, 'keywords')} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </section>

        </div>
      </div>
    </DragDropContext>
  );
};