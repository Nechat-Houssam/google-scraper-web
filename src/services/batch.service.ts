import { supabase } from '@/lib/supabase';

// ==========================================
// 1. SERVICE DES BATCHES (Robot Scraper)
// ==========================================
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

// ==========================================
// 2. SERVICE DES GROUPES (Bibliothèque)
// ==========================================
export const groupService = {
  
  // --- A. CRÉATION D'UN GROUPE ---
  async createGroup(name: string, type: 'location' | 'keyword', items: string[]) {
    // 1. Générer le slug (ex: "Le gorupe" -> "le-gorupe")
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');

    // 2. Création du groupe dans la table 'groups'
    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert([{ name, type, slug }])
      .select()
      .single();

    if (groupError) {
      console.error("❌ Erreur création du groupe:", groupError);
      throw groupError;
    }

    // 3. Ajout des mots dans la table 'group_items'
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        group_id: newGroup.id,
        content: item 
      }));

      const { error: itemsError } = await supabase
        .from('group_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("❌ Erreur insertion des items:", itemsError);
        throw itemsError;
      }
    }

    return newGroup;
  },

  // --- B. SUPPRESSION D'UN GROUPE ---
  async deleteGroup(groupId: string) {
    const cleanValue = groupId.includes(':') ? groupId.split(':')[1] : groupId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanValue);

    let query;

    if (isUUID) {
      query = supabase.from('groups').delete().eq('id', cleanValue).select();
    } else {
      const searchName = cleanValue.replace(/-/g, ' ');
      query = supabase.from('groups').delete().ilike('name', searchName).select();
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Erreur SQL lors de la suppression:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.error("⚠️ La ligne n'a pas été trouvée en base (ou le RLS bloque).", { searchName: cleanValue.replace(/-/g, ' ') });
      throw new Error("Aucune ligne supprimée");
    }

    return true;
  }
};