import { supabase } from '@/lib/supabase';

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