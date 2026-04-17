import { supabase } from '../lib/supabase.js';
import { getState } from '../lib/store.js';

export const leadsService = {
  async getAll({ search = '', status = '', source = '', priority = '', assigned_to = '', page = 1, perPage = 25, sortCol = 'created_at', sortDir = 'desc' } = {}) {
    let q = supabase.from('leads')
      .select('*, assigned_profile:profiles!leads_assigned_to_fkey(id,full_name)', { count: 'exact' });

    if (search) {
      q = q.or(`full_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (status) q = q.eq('status', status);
    if (source) q = q.eq('source', source);
    if (priority) q = q.eq('priority', priority);
    if (assigned_to) q = q.eq('assigned_to', assigned_to);

    const from = (page - 1) * perPage;
    q = q.order(sortCol, { ascending: sortDir === 'asc' }).range(from, from + perPage - 1);

    const { data, error, count } = await q;
    if (error) throw error;
    return { data, count };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('leads')
      .select('*, assigned_profile:profiles!leads_assigned_to_fkey(id,full_name,email), created_profile:profiles!leads_created_by_fkey(id,full_name)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const profile = getState('currentProfile');
    const { data, error } = await supabase
      .from('leads')
      .insert({ ...payload, created_by: profile?.id })
      .select()
      .single();
    if (error) throw error;

    if (payload.notes) {
      await leadsService.addActivity(data.id, {
        activity_type: 'note',
        content: payload.notes,
        title: 'Initial Notes',
      });
    }
    return data;
  },

  async update(id, payload) {
    const current = await leadsService.getById(id);
    const { data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    if (payload.status && current && payload.status !== current.status) {
      await leadsService.addActivity(id, {
        activity_type: 'status_change',
        content: `Status changed from "${current.status}" to "${payload.status}"`,
        old_status: current.status,
        new_status: payload.status,
      });
    }
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
  },

  async convertToClient(leadId, clientData) {
    const { data: client, error: cErr } = await supabase
      .from('clients')
      .insert({ ...clientData, source_lead_id: leadId })
      .select()
      .single();
    if (cErr) throw cErr;

    await supabase.from('leads').update({
      status: 'won',
      converted_at: new Date().toISOString(),
      converted_to_client_id: client.id,
    }).eq('id', leadId);

    await leadsService.addActivity(leadId, {
      activity_type: 'other',
      content: `Lead converted to client: ${client.company_name}`,
      title: 'Converted to Client',
    });

    return client;
  },

  async addActivity(leadId, activity) {
    const profile = getState('currentProfile');
    const { data, error } = await supabase
      .from('lead_activities')
      .insert({ ...activity, lead_id: leadId, created_by: profile?.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getActivities(leadId) {
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*, created_by_profile:profiles!lead_activities_created_by_fkey(id,full_name)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getStats() {
    const { data } = await supabase.from('leads').select('status');
    const stats = {};
    (data || []).forEach(r => { stats[r.status] = (stats[r.status] || 0) + 1; });
    return stats;
  },
};
