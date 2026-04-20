import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { ListItem } from '@/types';
import { GroupCreator } from './GroupCreator';
import { BatchPlanner } from './BatchPlanner';
import { LibraryColumn } from './LibraryColumn';
import { TargetColumn } from './TargetColumn';
import { useTracker } from '@/context/TrackerContext';
import { groupService } from '@/services/group.service';

export const DragBoard = () => {
  const {
    availableLocGroups, setAvailableLocGroups,
    availableKwGroups, setAvailableKwGroups,
    locations, setLocations,
    keywords, setKeywords,
    setStatus
  } = useTracker();

  const handleRemoveAction = async (item: ListItem, listType: string) => {
    if (listType === 'available-locations' || listType === 'available-keywords') {
      if (!window.confirm(`🔥 Supprimer "${item.content}" ?`)) return;
      try {
        setStatus("⏳ Suppression...");
        await groupService.deleteGroup(item.id);
        if (listType === 'available-locations') setAvailableLocGroups(p => p.filter(i => i.id !== item.id));
        else setAvailableKwGroups(p => p.filter(i => i.id !== item.id));
        setStatus("✅ Supprimé.");
      } catch {
        setStatus("❌ Erreur suppression.");
      }
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
    if (!draggedItem) return;
    if (destination.droppableId === 'locations' && draggedItem.type !== 'location') return;
    if (destination.droppableId === 'keywords' && draggedItem.type !== 'keyword') return;

    const lists: Record<string, [ListItem[], React.Dispatch<React.SetStateAction<ListItem[]>>]> = {
      'available-locations': [availableLocGroups, setAvailableLocGroups],
      'available-keywords': [availableKwGroups, setAvailableKwGroups],
      'locations': [locations, setLocations],
      'keywords': [keywords, setKeywords],
    };

    const [srcList, setSrc] = lists[source.droppableId];
    const [dstList, setDst] = lists[destination.droppableId];

    const srcCopy = [...srcList];
    const [removed] = srcCopy.splice(source.index, 1);
    setSrc(srcCopy);

    const dstCopy = source.droppableId === destination.droppableId ? srcCopy : [...dstList];
    dstCopy.splice(destination.index, 0, removed);
    setDst(dstCopy);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <GroupCreator />
          <BatchPlanner />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch">
          <LibraryColumn
            locGroups={availableLocGroups}
            kwGroups={availableKwGroups}
            onRemove={handleRemoveAction}
          />
          <TargetColumn type="location" items={locations} onRemove={handleRemoveAction} />
          <TargetColumn type="keyword" items={keywords} onRemove={handleRemoveAction} />
        </div>
      </div>
    </DragDropContext>
  );
};
