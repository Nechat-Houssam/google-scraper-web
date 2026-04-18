import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const batchService = {
  async saveBatch(name: string, locations: any[], keywords: any[], schedule: string) {
    const { data, error } = await supabase
      .from('scraper_batches')
      .insert([{
          name,
          config: {
            locationGroups: locations.map(l => ({ id: l.id, content: l.content })),
            keywordGroups: keywords.map(k => ({ id: k.id, content: k.content }))
          },
          schedule_type: schedule,
          is_active: true
      }])
      .select();
    if (error) throw error;
    return data;
  }
};

export const groupService = {
  async deleteGroup(groupId: string) {
    // 1. On nettoie l'ID (on enlève "group:", "loc:", etc.)
    const cleanValue = groupId.includes(':') ? groupId.split(':')[1] : groupId;

    console.log("🚀 Tentative de suppression pour :", cleanValue);

    // 2. On tente de supprimer :
    // - Soit là où l'ID correspond (si cleanValue est un UUID)
    // - Soit là où le NAME correspond (puisque ton interface semble utiliser le nom)
    
    // On utilise une petite ruse : si cleanValue ressemble à un UUID, on check l'ID, 
    // sinon on check le nom.
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanValue);

    const query = isUUID 
      ? supabase.from('groups').delete().eq('id', cleanValue)
      : supabase.from('groups').delete().eq('name', cleanValue);

    const { error, count } = await query;

    if (error) {
      console.error("❌ Erreur Supabase lors de la suppression:", error);
      throw error;
    }

    console.log("✅ Suppression réussie en base de données.");
    return true;
  }
};