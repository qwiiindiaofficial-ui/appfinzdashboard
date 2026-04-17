import { supabase } from '../lib/supabase.js';
import { getState } from '../lib/store.js';

export const projectsService = {
  async getAll({ clientId = '', status = '', page = 1, perPage = 25 } = {}) {
    let q = supabase.from('projects')
      .select('*, client:clients(id,company_name), manager:profiles!projects_project_manager_fkey(id,full_name)', { count: 'exact' });
    if (clientId) q = q.eq('client_id', clientId);
    if (status) q = q.eq('status', status);
    const from = (page - 1) * perPage;
    q = q.order('created_at', { ascending: false }).range(from, from + perPage - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    return { data, count };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('projects')
      .select('*, client:clients(id,company_name,contact_name), manager:profiles!projects_project_manager_fkey(id,full_name)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const profile = getState('currentProfile');
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...payload, created_by: profile?.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('projects').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  },

  async getUpdates(projectId) {
    const { data, error } = await supabase
      .from('project_updates')
      .select('*, author:profiles!project_updates_created_by_fkey(id,full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addUpdate(projectId, payload) {
    const profile = getState('currentProfile');
    const { data, error } = await supabase
      .from('project_updates')
      .insert({ ...payload, project_id: projectId, created_by: profile?.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteUpdate(id) {
    const { error } = await supabase.from('project_updates').delete().eq('id', id);
    if (error) throw error;
  },
};
