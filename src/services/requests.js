import { supabase } from '../lib/supabase.js';

export const requestsService = {
  async getAll({ status = '', page = 1, perPage = 25 } = {}) {
    let q = supabase.from('client_requests')
      .select('*, client:clients(id,company_name), project:projects(id,name), assigned_profile:profiles!client_requests_assigned_to_fkey(id,full_name)', { count: 'exact' });
    if (status) q = q.eq('status', status);
    const from = (page - 1) * perPage;
    q = q.order('created_at', { ascending: false }).range(from, from + perPage - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    return { data, count };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('client_requests')
      .select('*, client:clients(id,company_name,contact_name), project:projects(id,name), assigned_profile:profiles!client_requests_assigned_to_fkey(id,full_name)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('client_requests').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async getStats() {
    const { data } = await supabase.from('client_requests').select('status');
    const stats = { open: 0, in_review: 0, in_progress: 0, resolved: 0, closed: 0 };
    (data || []).forEach(r => { if (r.status in stats) stats[r.status]++; });
    return stats;
  },
};
