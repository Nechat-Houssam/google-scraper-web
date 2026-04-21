import { supabase } from '@/lib/supabase';
import { ScraperBatch } from '@/types';

export const batchService = {
  async saveBatch(name: string, locations: { id: string; content: string }[], keywords: { id: string; content: string }[], schedule: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non connecté");

    const { data, error } = await supabase
      .from('scraper_batches')
      .insert([{
        name,
        user_id: user.id,
        config: {
          locationGroups: locations.map(l => ({ id: l.id, content: l.content })),
          keywordGroups:  keywords.map(k => ({ id: k.id, content: k.content })),
        },
        schedule_type: schedule,
        is_active: true,
      }])
      .select();

    if (error) throw error;
    return data;
  },

  async getBatches(): Promise<ScraperBatch[]> {
    const { data, error } = await supabase
      .from('scraper_batches')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as ScraperBatch[]) ?? [];
  },

  async deleteBatch(id: string) {
    const { error } = await supabase.from('scraper_batches').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleActive(id: string, is_active: boolean) {
    const { error } = await supabase.from('scraper_batches').update({ is_active }).eq('id', id);
    if (error) throw error;
  },
};
