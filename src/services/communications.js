import { supabase } from '../lib/supabase.js';
import { getState } from '../lib/store.js';

export const communicationsService = {
  async getByClient(clientId) {
    const { data, error } = await supabase
      .from('communications')
      .select('*, author:profiles!communications_created_by_fkey(id,full_name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const profile = getState('currentProfile');
    const { data, error } = await supabase
      .from('communications')
      .insert({ ...payload, created_by: profile?.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('communications').delete().eq('id', id);
    if (error) throw error;
  },
};
