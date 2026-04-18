import { useState, useRef } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { GripVertical, X } from 'lucide-react';
import { ListItem } from '@/types';

interface DraggableItemProps {
  item: ListItem;
  index: number;
  color: string;
  onRemove?: () => void;
}

export const DraggableItem = ({ item, index, color, onRemove }: DraggableItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Gestion de l'entrée : on attend 300ms avant d'ouvrir
  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(true);
    }, 150); // 0.3s
  };

  // Gestion de la sortie : on attend 300ms avant de fermer
  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 0); // 0
  };

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`relative bg-white border-2 p-4 rounded-xl shadow-sm mb-3 transition-all duration-300 ease-in-out cursor-grab active:cursor-grabbing ${color} ${
            snapshot.isDragging ? 'opacity-50 ring-2 ring-blue-400 shadow-xl scale-105 rotate-1' : 'hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <GripVertical size={18} className={`transition-colors ${isExpanded ? 'text-blue-400' : 'text-gray-300'}`} />
              
              <div className="flex flex-col">
                <span className="font-bold text-gray-700 truncate">{item.content}</span>
                {/* Petit badge qui disparaît quand c'est ouvert */}
                {!isExpanded && item.items && item.items.length > 0 && (
                  <span className="text-[10px] text-blue-400 font-medium animate-in fade-in">
                    {item.items.length} éléments...
                  </span>
                )}
              </div>
            </div>

            {onRemove && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }} 
                className="text-gray-300 hover:text-red-500 transition-colors p-1 relative z-10"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* ZONE D'EXTENSION (Conditionnée par l'état isExpanded) */}
          {item.items && item.items.length > 0 && (
            <div 
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                isExpanded ? 'max-h-64 mt-4 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                {item.items.map((subItem, idx) => (
                  <span 
                    key={idx} 
                    className="bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-md border border-gray-100"
                  >
                    {subItem}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};