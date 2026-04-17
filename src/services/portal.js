import { supabase } from '../lib/supabase.js';

export const portalService = {
  async resolveToken(token) {
    const { data, error } = await supabase
      .from('client_portal_tokens')
      .select('*, client:clients(id,company_name,contact_name,email,industry,status)')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (data.expires_at && new Date(data.expires_at) < new Date()) return { expired: true };

    await supabase.from('client_portal_tokens').update({
      last_accessed: new Date().toISOString(),
      access_count: (data.access_count || 0) + 1,
    }).eq('id', data.id);

    return data;
  },

  async getProjects(clientId) {
    const { data, error } = await supabase
      .from('projects')
      .select('id,name,description,project_type,status,progress_pct,start_date,end_date')
      .eq('client_id', clientId)
      .eq('visible_on_portal', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getProjectUpdates(projectId) {
    const { data, error } = await supabase
      .from('project_updates')
      .select('id,update_type,title,body,progress_snapshot,created_at')
      .eq('project_id', projectId)
      .eq('is_client_visible', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getInvoices(clientId) {
    const { data, error } = await supabase
      .from('invoices')
      .select('id,invoice_number,invoice_date,due_date,total,amount_paid,status,currency')
      .eq('client_id', clientId)
      .neq('status', 'draft')
      .order('invoice_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async submitRequest(payload) {
    const { data, error } = await supabase
      .from('client_requests')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
