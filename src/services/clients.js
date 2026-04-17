import { supabase } from '../lib/supabase.js';
import { getState } from '../lib/store.js';

export const clientsService = {
  async getAll({ search = '', status = '', page = 1, perPage = 25 } = {}) {
    let q = supabase.from('clients')
      .select('*, account_manager_profile:profiles!account_manager(id,full_name)', { count: 'exact' });

    if (search) {
      q = q.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (status) q = q.eq('status', status);

    const from = (page - 1) * perPage;
    q = q.order('created_at', { ascending: false }).range(from, from + perPage - 1);

    const { data, error, count } = await q;
    if (error) throw error;
    return { data, count };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('clients')
      .select('*, account_manager_profile:profiles!account_manager(id,full_name,email)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (data && data.source_lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id,full_name')
        .eq('id', data.source_lead_id)
        .maybeSingle();
      data.source_lead = lead || null;
    }
    return data;
  },

  async create(payload) {
    const profile = getState('currentProfile');
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...payload, created_by: profile?.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },

  async getPortalTokens(clientId) {
    const { data, error } = await supabase
      .from('client_portal_tokens')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createPortalToken(clientId, label = '') {
    const profile = getState('currentProfile');
    const { data, error } = await supabase
      .from('client_portal_tokens')
      .insert({ client_id: clientId, label, created_by: profile?.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updatePortalToken(tokenId, payload) {
    const { data, error } = await supabase
      .from('client_portal_tokens')
      .update(payload)
      .eq('id', tokenId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePortalToken(tokenId) {
    const { error } = await supabase.from('client_portal_tokens').delete().eq('id', tokenId);
    if (error) throw error;
  },

  async getStats() {
    const { data } = await supabase.from('clients').select('status');
    const stats = { active: 0, inactive: 0, churned: 0 };
    (data || []).forEach(r => { if (r.status in stats) stats[r.status]++; });
    return stats;
  },
};
