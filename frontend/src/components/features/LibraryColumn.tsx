import { ListItem } from '@/types';
import { DraggableItem } from '@/components/ui/DraggableItem';
import { StrictModeDroppable as Droppable } from '@/components/ui/StrictModeDroppable';

interface LibraryColumnProps {
  locGroups: ListItem[];
  kwGroups: ListItem[];
  onRemove: (item: ListItem, listType: string) => void;
}

export const LibraryColumn = ({ locGroups, kwGroups, onRemove }: LibraryColumnProps) => (
  <section className="flex flex-col gap-6">
    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">📚 Bibliothèque</h2>

    <div className="space-y-4">
      <h3 className="text-xs font-black text-orange-500 uppercase px-2">📍 Villes</h3>
      <Droppable droppableId="available-locations">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="bg-orange-50/30 border-2 border-dashed border-orange-200 rounded-3xl p-5 min-h-[150px]">
            {locGroups.map((item, index) => (
              <DraggableItem key={item.id} item={item} index={index} color="border-orange-100" onRemove={() => onRemove(item, 'available-locations')} />
            ))}
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
            {kwGroups.map((item, index) => (
              <DraggableItem key={item.id} item={item} index={index} color="border-blue-100" onRemove={() => onRemove(item, 'available-keywords')} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  </section>
);
