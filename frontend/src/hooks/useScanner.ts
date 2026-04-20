import { useState } from 'react';
import { ListItem } from '@/types';

export const useScanner = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Connexion...");

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
        const res = await fetch("http://localhost:8000/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            locations: locations.map(l => l.id), 
            keywords: keywords.map(k => k.id) 
          })
        });
        const data = await res.json();
        setStatus(res.ok ? `✅ ${data.message}` : "❌ Erreur Worker");
      } catch { 
        setStatus("❌ Erreur de connexion"); 
      } finally { 
        setLoading(false); 
      }
    } else {
      try {
        await fetch("http://localhost:8000/api/scan/stop", { method: "POST" });
        setStatus("🛑 Arrêt demandé...");
      } catch { 
        setStatus("❌ Erreur d'arrêt"); 
      }
    }
  };

  return { loading, status, setStatus, handleScanAction };
};