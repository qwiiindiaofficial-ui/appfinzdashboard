import { supabase } from '../lib/supabase.js';
import { getState } from '../lib/store.js';

export const tasksService = {
  async getAll({ leadId, clientId, projectId, assignedTo, status, page = 1, perPage = 50 } = {}) {
    let q = supabase.from('tasks')
      .select('*, assigned_profile:profiles!tasks_assigned_to_fkey(id,full_name), lead:leads(id,full_name,company_name), client:clients(id,company_name), project:projects(id,name)', { count: 'exact' });
    if (leadId) q = q.eq('lead_id', leadId);
    if (clientId) q = q.eq('client_id', clientId);
    if (projectId) q = q.eq('project_id', projectId);
    if (assignedTo) q = q.eq('assigned_to', assignedTo);
    if (status) q = q.eq('status', status);
    const from = (page - 1) * perPage;
    q = q.order('due_date', { ascending: true, nullsFirst: false }).range(from, from + perPage - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    return { data, count };
  },

  async create(payload) {
    const profile = getState('currentProfile');
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...payload, created_by: profile?.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('tasks').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async complete(id) {
    return tasksService.update(id, { status: 'completed', completed_at: new Date().toISOString() });
  },

  async delete(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },
};
