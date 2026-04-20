import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ListItem } from '@/types';
import { DraggableItem } from '@/components/ui/DraggableItem';
import { StrictModeDroppable as Droppable } from '@/components/ui/StrictModeDroppable';
import { useTracker } from '@/context/TrackerContext';

interface TargetColumnProps {
  type: 'location' | 'keyword';
  items: ListItem[];
  onRemove: (item: ListItem, listType: string) => void;
}

const CONFIG = {
  location: {
    label: '🎯 Villes Cibles',
    droppableId: 'locations',
    badgeColor: 'bg-orange-200',
    inputBorder: 'border-orange-100',
    inputBg: 'bg-orange-50/50 border-2 border-orange-100',
    btnColor: 'bg-orange-500',
    itemColor: 'border-orange-200',
    placeholder: 'Ajouter une ville...',
    titleColor: 'text-orange-600',
  },
  keyword: {
    label: '🎯 Mots-Clés',
    droppableId: 'keywords',
    badgeColor: 'bg-blue-200',
    inputBorder: 'border-blue-100',
    inputBg: 'bg-blue-50/50 border-2 border-blue-100',
    btnColor: 'bg-blue-500',
    itemColor: 'border-blue-200',
    placeholder: 'Ajouter un mot-clé...',
    titleColor: 'text-blue-600',
  },
};

export const TargetColumn = ({ type, items, onRemove }: TargetColumnProps) => {
  const { addManualItem } = useTracker();
  const [inputVal, setInputVal] = useState('');
  const c = CONFIG[type];
  const listType = type === 'location' ? 'locations' : 'keywords';

  const handleAdd = () => {
    addManualItem(type, inputVal);
    setInputVal('');
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className={`text-sm font-black ${c.titleColor} uppercase flex items-center gap-2 px-2`}>
        {c.label}
        <span className={`text-[10px] ${c.badgeColor} px-2 py-0.5 rounded-full`}>{items.length}</span>
      </h2>

      <div className={`flex gap-2 bg-white p-2 rounded-2xl shadow-sm border ${c.inputBorder}`}>
        <input
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 p-2 outline-none text-sm"
          placeholder={c.placeholder}
        />
        <button onClick={handleAdd} className={`${c.btnColor} text-white p-2 rounded-xl`}>
          <Plus size={20} />
        </button>
      </div>

      <Droppable droppableId={c.droppableId}>
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className={`flex-1 ${c.inputBg} rounded-3xl p-5 min-h-[450px]`}>
            {items.map((item, index) => (
              <DraggableItem key={item.id} item={item} index={index} color={c.itemColor} onRemove={() => onRemove(item, listType)} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </section>
  );
};
