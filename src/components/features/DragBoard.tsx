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

  // --- 1. LOGIQUE DE SUPPRESSION HYBRIDE ---
  const handleRemoveAction = async (item: ListItem, listType: string) => {
    // CAS : Suppression définitive depuis la Bibliothèque
    if (listType === 'available-locations' || listType === 'available-keywords') {
        const confirm = window.confirm(`Supprimer définitivement le groupe "${item.content}" ?`);
        if (!confirm) return;

        try {
        setStatus("⏳ Suppression...");

        // ON ATTEND LA BDD ICI 👇
        await groupService.deleteGroup(item.id);

        // Une fois que c'est supprimé en BDD, on l'enlève de l'écran
        if (listType === 'available-locations') {
            setAvailableLocGroups((prev: any) => prev.filter((i: any) => i.id !== item.id));
        } else {
            setAvailableKwGroups((prev: any) => prev.filter((i: any) => i.id !== item.id));
        }

        setStatus("✅ Supprimé définitivement.");
        } catch (err) {
        console.error(err);
        setStatus("❌ Erreur de suppression en base.");
        }
    }
    // CAS 2 : DÉSASSIGNATION (Depuis Town ou Keyword) -> Retour en bibliothèque
    else {
      if (listType === 'locations') {
        setLocations((p: any) => p.filter((i: any) => i.id !== item.id));
        setAvailableLocGroups((p: any) => [...p, item]);
        setStatus("🔄 Ville remise en bibliothèque");
      } else {
        setKeywords((p: any) => p.filter((i: any) => i.id !== item.id));
        setAvailableKwGroups((p: any) => [...p, item]);
        setStatus("🔄 Mot-clé remis en bibliothèque");
      }
    }
  };

  // --- 2. SAUVEGARDE DU ROBOT ---
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

  // --- 3. DRAG & DROP (Logique de transfert) ---
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
        
        {/* --- PARTIE HAUTE : LES ACTION CARDS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          
          {/* CRÉER UN GROUPE */}
          <ActionCard 
            title="CRÉER UN GROUPE" 
            icon="🆕" 
            buttonText="Enregistrer le groupe" 
            onAction={() => {}} 
            disabled={!newGroupName}
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
                className="flex-1 p-4 rounded-2xl bg-slate-50 border-none font-medium outline-none text-slate-900 placeholder:text-slate-400" 
                placeholder="Nom du groupe..." 
              />
            </div>
            <input 
              className="w-full p-4 rounded-2xl bg-slate-50 border-none font-medium outline-none text-slate-900 placeholder:text-slate-400" 
              placeholder="Tapez un mot et appuyez sur Entrée..." 
            />
          </ActionCard>

          {/* PLANIFIER UN ROBOT */}
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
                className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-medium outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-100 transition-all shadow-inner" 
                placeholder="Nom du projet..." 
              />
              <div className="relative">
                <select 
                  value={schedule} 
                  onChange={e => setSchedule(e.target.value)} 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-medium outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-slate-100 transition-all shadow-inner"
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

        {/* --- PARTIE BASSE : LES 3 COLONNES DANS L'ORDRE --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch">
          
          {/* COLONNE 1 : BIBLIOTHÈQUE (Suppression définitive) */}
          <section className="flex flex-col gap-6">
            <h2 className="text-sm font-black text-slate-400 uppercase px-2 tracking-widest">📚 Bibliothèque</h2>
            
            <div className="space-y-4">
              <h3 className="text-xs font-black text-orange-500 uppercase px-2">📍 Groupes Villes</h3>
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
              <h3 className="text-xs font-black text-blue-500 uppercase px-2">🔑 Groupes Mots-clés</h3>
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

          {/* COLONNE 2 : TOWN (Désassignation) */}
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
              <button onClick={() => { addManualItem('location', manualLoc); setManualLoc(''); }} className="bg-orange-500 text-white p-2 rounded-xl">
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

          {/* COLONNE 3 : KEYWORD (Désassignation) */}
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
              <button onClick={() => { addManualItem('keyword', manualKw); setManualKw(''); }} className="bg-blue-500 text-white p-2 rounded-xl">
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