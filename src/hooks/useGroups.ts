import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ListItem } from '@/types';

export const useGroups = (setStatus: (msg: string) => void) => {
  const [isMounted, setIsMounted] = useState(false);
  
  // Bibliothèque
  const [availableLocGroups, setAvailableLocGroups] = useState<ListItem[]>([]);
  const [availableKwGroups, setAvailableKwGroups] = useState<ListItem[]>([]);
  
  // Cibles
  const [locations, setLocations] = useState<ListItem[]>([]);
  const [keywords, setKeywords] = useState<ListItem[]>([]);

  // Chargement initial
  useEffect(() => {
    setIsMounted(true);
    fetchInitialGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInitialGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_items(value)')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        const locGroups = data.filter(g => g.type === 'location').map(g => ({
          id: `group:${g.slug}`,
          content: `📍 ${g.name}`,
          type: 'location' as const,
          items: g.group_items?.map((i: any) => i.value) || []
        }));
        
        const kwGroups = data.filter(g => g.type === 'keyword').map(g => ({
          id: `group:${g.slug}`,
          content: `🔑 ${g.name}`,
          type: 'keyword' as const,
          items: g.group_items?.map((i: any) => i.value) || []
        }));

        setAvailableLocGroups(locGroups);
        setAvailableKwGroups(kwGroups);
        setStatus("Prêt.");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Erreur Supabase");
    }
  };

  // Ajout manuel (depuis les inputs)
  const addManualItem = (type: 'location' | 'keyword', val: string) => {
    if (!val.trim()) return;
    const newItem: ListItem = { id: val.trim(), content: val.trim(), type };
    if (type === 'location') {
      setLocations(prev => [...prev, newItem]);
    } else {
      setKeywords(prev => [...prev, newItem]);
    }
  };

  // Suppression et retour en bibliothèque
  const removeItem = (id: string, listType: 'locations' | 'keywords') => {
    const currentList = listType === 'locations' ? locations : keywords;
    const setList = listType === 'locations' ? setLocations : setKeywords;
    const item = currentList.find(i => i.id === id);

    if (item) {
      if (id.startsWith('group:')) {
        if (item.type === 'location') {
          setAvailableLocGroups(prev => [...prev, item]);
        } else {
          setAvailableKwGroups(prev => [...prev, item]);
        }
      }
      setList(prev => prev.filter(i => i.id !== id));
    }
  };

  return {
    isMounted,
    availableLocGroups, setAvailableLocGroups,
    availableKwGroups, setAvailableKwGroups,
    locations, setLocations,
    keywords, setKeywords,
    addManualItem,
    removeItem
  };
};