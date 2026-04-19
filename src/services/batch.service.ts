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
    // 1. On nettoie le préfixe (ex: "group:le-gorupe" devient "le-gorupe")
    const cleanValue = groupId.includes(':') ? groupId.split(':')[1] : groupId;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanValue);

    let query;

    if (isUUID) {
      // Cas A : C'est un vrai ID
      query = supabase.from('groups').delete().eq('id', cleanValue).select();
    } else {
      // Cas B : C'est un nom transformé. 
      // On remplace les tirets par des espaces ("le-gorupe" -> "le gorupe")
      const searchName = cleanValue.replace(/-/g, ' ');
      
      // On utilise .ilike() pour ignorer la casse ("le gorupe" matchera "Le gorupe")
      query = supabase.from('groups').delete().ilike('name', searchName).select();
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Erreur SQL:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.error("⚠️ La ligne n'a pas été trouvée en base (ou RLS bloque).", { searchName: cleanValue.replace(/-/g, ' ') });
      throw new Error("Aucune ligne supprimée");
    }

    console.log("✅ Ligne(s) supprimée(s) :", data);
    return true;
  }
};