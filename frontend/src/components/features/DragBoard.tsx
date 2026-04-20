import { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { StrictModeDroppable as Droppable } from '@/components/ui/StrictModeDroppable';
import { Plus } from 'lucide-react';
import { ListItem } from '@/types';
import { DraggableItem } from '@/components/ui/DraggableItem';
import { GroupCreator } from './GroupCreator';
import { BatchPlanner } from './BatchPlanner';
import { useTracker } from '@/context/TrackerContext';
import { groupService } from '@/services/group.service';

export const DragBoard = () => {
  const {
    availableLocGroups, setAvailableLocGroups,
    availableKwGroups, setAvailableKwGroups,
    locations, setLocations,
    keywords, setKeywords,
    addManualItem, setStatus
  } = useTracker();

  const [manualLoc, setManualLoc] = useState('');
  const [manualKw, setManualKw] = useState('');

  const handleRemoveAction = async (item: ListItem, listType: string) => {
    if (listType === 'available-locations' || listType === 'available-keywords') {
      const confirm = window.confirm(`🔥 Supprimer "${item.content}" ?`);
      if (!confirm) return;
      try {
        setStatus("⏳ Suppression...");
        await groupService.deleteGroup(item.id);
        if (listType === 'available-locations') setAvailableLocGroups(p => p.filter(i => i.id !== item.id));
        else setAvailableKwGroups(p => p.filter(i => i.id !== item.id));
        setStatus("✅ Supprimé.");
      } catch { setStatus("❌ Erreur suppression."); }
    } else {
      if (listType === 'locations') {
        setLocations(p => p.filter(i => i.id !== item.id));
        if (item.id.startsWith('group:')) setAvailableLocGroups(p => [...p, item]);
      } else {
        setKeywords(p => p.filter(i => i.id !== item.id));
        if (item.id.startsWith('group:')) setAvailableKwGroups(p => [...p, item]);
      }
      setStatus("🔄 Remis en bibliothèque");
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const allItems = [...availableLocGroups, ...availableKwGroups, ...locations, ...keywords];
    const draggedItem = allItems.find(i => i.id === draggableId);
    if (!draggedItem || (destination.droppableId === 'locations' && draggedItem.type !== 'location') || (destination.droppableId === 'keywords' && draggedItem.type !== 'keyword')) return;

    const removeFromSource = (list: ListItem[], setList: any) => {
      const copy = [...list];
      const [removed] = copy.splice(source.index, 1);
      setList(copy);
      return removed;
    };

    let item: ListItem | undefined;
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <GroupCreator />
          <BatchPlanner />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch">
          <section className="flex flex-col gap-6">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">📚 Bibliothèque</h2>
            <div className="space-y-4">
              <h3 className="text-xs font-black text-orange-500 uppercase px-2">📍 Villes</h3>
              <Droppable droppableId="available-locations">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="bg-orange-50/30 border-2 border-dashed border-orange-200 rounded-3xl p-5 min-h-[150px]">
                    {availableLocGroups.map((item, index) => <DraggableItem key={item.id} item={item} index={index} color="border-orange-100" onRemove={() => handleRemoveAction(item, 'available-locations')} />)}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-black text-blue-500 uppercase px-2">🔑 Mots</h3>
              <Droppable droppableId="available-keywords">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="bg-blue-50/30 border-2 border-dashed border-blue-200 rounded-3xl p-5 min-h-[150px]">
                    {availableKwGroups.map((item, index) => <DraggableItem key={item.id} item={item} index={index} color="border-blue-100" onRemove={() => handleRemoveAction(item, 'available-keywords')} />)}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </section>
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-black text-orange-600 uppercase flex items-center gap-2 px-2">🎯 Villes Cibles <span className="text-[10px] bg-orange-200 px-2 py-0.5 rounded-full">{locations.length}</span></h2>
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-orange-100">
              <input value={manualLoc} onChange={e => setManualLoc(e.target.value)} onKeyDown={e => e.key === 'Enter' && (addManualItem('location', manualLoc), setManualLoc(''))} className="flex-1 p-2 outline-none text-sm" placeholder="Ajouter..." />
              <button onClick={() => { addManualItem('location', manualLoc); setManualLoc(''); }} className="bg-orange-500 text-white p-2 rounded-xl"><Plus size={20} /></button>
            </div>
            <Droppable droppableId="locations">{(provided) => (<div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 bg-orange-50/50 border-2 border-orange-100 rounded-3xl p-5 min-h-[450px]">{locations.map((item, index) => <DraggableItem key={item.id} item={item} index={index} color="border-orange-200" onRemove={() => handleRemoveAction(item, 'locations')} />)}{provided.placeholder}</div>)}</Droppable>
          </section>
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-black text-blue-600 uppercase flex items-center gap-2 px-2">🎯 Mots-Clés <span className="text-[10px] bg-blue-200 px-2 py-0.5 rounded-full">{keywords.length}</span></h2>
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-blue-100">
              <input value={manualKw} onChange={e => setManualKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && (addManualItem('keyword', manualKw), setManualKw(''))} className="flex-1 p-2 outline-none text-sm" placeholder="Ajouter..." />
              <button onClick={() => { addManualItem('keyword', manualKw); setManualKw(''); }} className="bg-blue-500 text-white p-2 rounded-xl"><Plus size={20} /></button>
            </div>
            <Droppable droppableId="keywords">{(provided) => (<div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 bg-blue-50/50 border-2 border-blue-100 rounded-3xl p-5 min-h-[450px]">{keywords.map((item, index) => <DraggableItem key={item.id} item={item} index={index} color="border-blue-200" onRemove={() => handleRemoveAction(item, 'keywords')} />)}{provided.placeholder}</div>)}</Droppable>
          </section>
        </div>
      </div>
    </DragDropContext>
  );
};