import { useState } from 'react';
import { ListItem } from '@/types';
import { apiClient } from '@/services/api.client';

export const useScan = (setStatus: (msg: string) => void) => {
  const [loading, setLoading] = useState(false);

  const handleScanAction = async (
    action: 'start' | 'stop',
    locations: ListItem[],
    keywords: ListItem[]
  ) => {
    if (action === 'start') {
      if (!locations.length || !keywords.length) {
        setStatus("❌ Sélection incomplète");
        return;
      }
      setLoading(true);
      setStatus("🚀 Envoi au bot...");
      try {
        const data = await apiClient.startScan(locations, keywords);
        setStatus(data.status === 'cancelled'
          ? "🛑 Annulation confirmée. Aucune donnée enregistrée."
          : `✅ ${data.message}`
        );
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

  return { loading, handleScanAction };
};
