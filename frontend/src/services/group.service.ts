import { supabase } from '@/lib/supabase';

export const groupService = {
async createGroup(name: string, type: 'location' | 'keyword', items: string[]) {
    // 1. Génération du slug
    const slug = name.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '-');

    // 2. Vérification d'existence préalable
    const { data: existing } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      throw new Error("ALREADY_EXISTS"); // On lance une erreur spécifique
    }

    // 3. Création si tout est OK
    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert([{ name, type, slug }])
      .select()
      .single();

    if (groupError) throw groupError;

    // 4. Insertion des items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        group_id: newGroup.id,
        value: item // Note: vérifie si ta colonne s'appelle 'value' ou 'content' dans group_items
      }));

      const { error: itemsError } = await supabase.from('group_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }

    return newGroup;
  },

  async deleteGroup(groupId: string) {
    const cleanValue = groupId.includes(':') ? groupId.split(':')[1] : groupId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanValue);

    const query = isUUID 
      ? supabase.from('groups').delete().eq('id', cleanValue)
      : supabase.from('groups').delete().ilike('name', cleanValue.replace(/-/g, ' '));

    const { data, error } = await query.select();
    if (error || !data?.length) throw new Error("Erreur de suppression");
    return true;
  }
};