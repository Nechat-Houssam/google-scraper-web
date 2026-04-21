import { useState } from 'react';
import { ListItem } from '@/types';
import { apiClient } from '@/services/api.client';
import { useAuth } from '@/context/AuthContext';

export const useScanner = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Connexion...");
  const { user } = useAuth();

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
      if (!user) {
        setStatus("❌ Non connecté");
        return;
      }
      setLoading(true);
      setStatus("🚀 Envoi au bot...");
      try {
        const data = await apiClient.startScan(locations, keywords, user.id);
        setStatus(data.job_id
          ? `⏳ Job créé — en attente d'exécution`
          : `✅ ${data.message}`
        );
      } catch {
        setStatus("❌ Erreur de connexion");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await apiClient.stopScan();
        setStatus("🛑 Arrêt demandé...");
      } catch {
        setStatus("❌ Erreur d'arrêt");
      }
    }
  };

  return { loading, status, setStatus, handleScanAction };
};
