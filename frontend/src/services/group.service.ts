import { supabase } from '@/lib/supabase';

export const groupService = {
  async createGroup(name: string, type: 'location' | 'keyword', items: string[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non connecté");

    const slug = name.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '-');

    const { data: existing } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) throw new Error("ALREADY_EXISTS");

    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert([{ name, type, slug, user_id: user.id }])
      .select()
      .single();

    if (groupError) throw groupError;

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from('group_items')
        .insert(items.map(item => ({ group_id: newGroup.id, value: item })));
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
