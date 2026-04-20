import React, { createContext, useContext, useState, useEffect } from 'react';
import { ListItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/services/api.client';

interface TrackerContextType {
  locations: ListItem[];
  keywords: ListItem[];
  availableLocGroups: ListItem[];
  availableKwGroups: ListItem[];
  status: string;
  loading: boolean;
  setLocations: React.Dispatch<React.SetStateAction<ListItem[]>>;
  setKeywords: React.Dispatch<React.SetStateAction<ListItem[]>>;
  setAvailableLocGroups: React.Dispatch<React.SetStateAction<ListItem[]>>;
  setAvailableKwGroups: React.Dispatch<React.SetStateAction<ListItem[]>>;
  setStatus: (msg: string) => void;
  setLoading: (val: boolean) => void;
  refreshLibrary: () => Promise<void>;
  addManualItem: (type: 'location' | 'keyword', val: string) => void;
  handleScanAction: (action: 'start' | 'stop') => Promise<void>;
}

const TrackerContext = createContext<TrackerContextType | undefined>(undefined);

export const TrackerProvider = ({ children }: { children: React.ReactNode }) => {
  const [locations, setLocations] = useState<ListItem[]>([]);
  const [keywords, setKeywords] = useState<ListItem[]>([]);
  const [availableLocGroups, setAvailableLocGroups] = useState<ListItem[]>([]);
  const [availableKwGroups, setAvailableKwGroups] = useState<ListItem[]>([]);
  const [status, setStatus] = useState("Prêt.");
  const [loading, setLoading] = useState(false);

  const refreshLibrary = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*, group_items(value)')
      .order('name', { ascending: true });
    
    if (data) {
      const format = (type: string) => data.filter(g => g.type === type).map(g => ({
        id: `group:${g.slug}`,
        content: (type === 'location' ? '📍 ' : '🔑 ') + g.name,
        type: type as any,
        items: g.group_items?.map((i: any) => i.value) || []
      }));
      setAvailableLocGroups(format('location'));
      setAvailableKwGroups(format('keyword'));
    }
  };

  useEffect(() => { refreshLibrary(); }, []);

  const addManualItem = (type: 'location' | 'keyword', val: string) => {
    if (!val.trim()) return;
    const newItem: ListItem = { id: val.trim(), content: val.trim(), type };
    type === 'location' ? setLocations(p => [...p, newItem]) : setKeywords(p => [...p, newItem]);
  };

  const handleScanAction = async (action: 'start' | 'stop') => {
    if (action === 'start') {
      if (!locations.length || !keywords.length) {
        setStatus("❌ Sélection incomplète");
        return;
      }
      setLoading(true);
      setStatus("🚀 Envoi au bot...");
      try {
        const data = await apiClient.startScan(locations, keywords);
        if (data.status === "cancelled") {
          setStatus("🛑 Annulation confirmée. Aucune donnée enregistrée.");
        } else {
          setStatus(`✅ ${data.message}`);
        }
      } catch {
        setStatus("❌ Erreur de connexion au serveur.");
      } finally {
        setLoading(false);
      }
    } else {
      setStatus("🛑 Demande d'arrêt envoyée...");
      try {
        await apiClient.stopScan();
      } catch {
        setStatus("❌ Impossible de joindre le bot.");
      }
    }
  };

  return (
    <TrackerContext.Provider value={{ 
      locations, keywords, availableLocGroups, availableKwGroups, 
      status, loading, setLocations, setKeywords, setAvailableLocGroups, setAvailableKwGroups,
      setStatus, setLoading, refreshLibrary, addManualItem, handleScanAction 
    }}>
      {children}
    </TrackerContext.Provider>
  );
};

export const useTracker = () => {
  const context = useContext(TrackerContext);
  if (!context) throw new Error("useTracker must be used within TrackerProvider");
  return context;
};