import { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { StrictModeDroppable as Droppable } from '@/components/ui/StrictModeDroppable';
import { Plus } from 'lucide-react';
import { ListItem } from '@/types';
import { DraggableItem } from '@/components/ui/DraggableItem';
import { GroupCreator } from './GroupCreator';

export const DragBoard = ({
  availableLocGroups, setAvailableLocGroups,
  availableKwGroups, setAvailableKwGroups,
  locations, setLocations,
  keywords, setKeywords,
  addManualItem, removeItem, setStatus
}: any) => {
  const [manualLoc, setManualLoc] = useState('');
  const [manualKw, setManualKw] = useState('');

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // 1. SI PAS DE DESTINATION : Retour automatique à la place d'origine
    if (!destination) return;

    // 2. IDENTIFIER L'ITEM
    const allItems = [...availableLocGroups, ...availableKwGroups, ...locations, ...keywords];
    const draggedItem = allItems.find(i => i.id === draggableId);
    if (!draggedItem) return;

    // 3. VÉRIFICATION DU TYPE (Empêcher ville dans mots-clés et inversement)
    if (destination.droppableId === 'locations' && draggedItem.type !== 'location') {
      setStatus("❌ Impossible : ce groupe n'est pas une destination 'Ville'");
      return; // Retour à la place d'origine
    }
    if (destination.droppableId === 'keywords' && draggedItem.type !== 'keyword') {
      setStatus("❌ Impossible : ce groupe n'est pas une destination 'Mot-clé'");
      return; // Retour à la place d'origine
    }

    // 4. LOGIQUE DE MOUVEMENT (Extraction et Insertion)
    let item: ListItem | undefined;

    // Retirer de la source
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

    // Ajouter à la destination
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
      {/* On utilise items-stretch (par défaut en grid) pour que les 3 colonnes 
         aient la même hauteur totale 
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch">
        
        {/* COLONNE 1 : BIBLIOTHÈQUE */}
        <section className="flex flex-col gap-6">
          <GroupCreator setStatus={setStatus} onGroupCreated={(it: any) => it.type === 'location' ? setAvailableLocGroups((p: any) => [...p, it]) : setAvailableKwGroups((p: any) => [...p, it])} />
          
          <div className="space-y-4">
            <h3 className="text-xs font-black text-orange-500 uppercase px-2">📍 Groupes Villes</h3>
            <Droppable droppableId="available-locations">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="bg-orange-50/30 border-2 border-dashed border-orange-200 rounded-3xl p-5 min-h-[150px]">
                  {availableLocGroups.map((item: any, index: number) => (
                    <DraggableItem key={item.id} item={item} index={index} color="border-orange-100" />
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
                    <DraggableItem key={item.id} item={item} index={index} color="border-blue-100" />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </section>

        {/* COLONNE 2 : VILLES CIBLES */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-black text-orange-600 uppercase">🎯 Villes Cibles</h2>
          <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm">
            <input value={manualLoc} onChange={e => setManualLoc(e.target.value)} onKeyDown={e => e.key === 'Enter' && (addManualItem('location', manualLoc), setManualLoc(''))} className="flex-1 p-2 outline-none text-sm" placeholder="Ajouter ville..." />
            <button onClick={() => { addManualItem('location', manualLoc); setManualLoc(''); }} className="bg-orange-500 text-white p-2 rounded-xl"><Plus /></button>
          </div>
          
          <Droppable droppableId="locations">
            {(provided) => (
              /* flex-1 ici fait en sorte que ce bloc s'étire jusqu'en bas */
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="flex-1 bg-orange-50/50 border-2 border-orange-100 rounded-3xl p-5 min-h-[400px]"
              >
                {locations.map((item: any, index: number) => (
                  <DraggableItem key={item.id} item={item} index={index} color="border-orange-200" onRemove={() => removeItem(item.id, 'locations')} />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </section>

        {/* COLONNE 3 : MOTS-CLÉS CIBLES */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-black text-blue-600 uppercase">🎯 Mots-Clés</h2>
          <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm">
            <input value={manualKw} onChange={e => setManualKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && (addManualItem('keyword', manualKw), setManualKw(''))} className="flex-1 p-2 outline-none text-sm" placeholder="Ajouter mot..." />
            <button onClick={() => { addManualItem('keyword', manualKw); setManualKw(''); }} className="bg-blue-500 text-white p-2 rounded-xl"><Plus /></button>
          </div>
          
          <Droppable droppableId="keywords">
            {(provided) => (
              /* flex-1 ici aussi pour l'alignement */
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="flex-1 bg-blue-50/50 border-2 border-blue-100 rounded-3xl p-5 min-h-[400px]"
              >
                {keywords.map((item: any, index: number) => (
                  <DraggableItem key={item.id} item={item} index={index} color="border-blue-200" onRemove={() => removeItem(item.id, 'keywords')} />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </section>

      </div>
    </DragDropContext>
  );
};