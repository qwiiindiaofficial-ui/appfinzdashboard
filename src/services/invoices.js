import { supabase } from '../lib/supabase.js';
import { getState } from '../lib/store.js';

export const invoicesService = {
  async getAll({ clientId = '', status = '', page = 1, perPage = 25 } = {}) {
    let q = supabase.from('invoices')
      .select('*, client:clients(id,company_name)', { count: 'exact' });
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
      .from('invoices')
      .select('*, client:clients(id,company_name,contact_name,email,address_line1,city,state,postal_code,country), project:projects(id,name), items:invoice_items(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async generateNumber() {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `INV-${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1);
    const next = data?.[0]
      ? parseInt(data[0].invoice_number.split('-')[2]) + 1
      : 1;
    return `INV-${year}-${String(next).padStart(4, '0')}`;
  },

  async create(payload, items = []) {
    const profile = getState('currentProfile');
    const invoiceNumber = await invoicesService.generateNumber();
    const { data, error } = await supabase
      .from('invoices')
      .insert({ ...payload, invoice_number: invoiceNumber, created_by: profile?.id })
      .select()
      .single();
    if (error) throw error;

    if (items.length > 0) {
      const { error: iErr } = await supabase.from('invoice_items').insert(
        items.map((item, i) => ({ ...item, invoice_id: data.id, sort_order: i }))
      );
      if (iErr) throw iErr;
    }
    return data;
  },

  async update(id, payload, items) {
    const { data, error } = await supabase
      .from('invoices').update(payload).eq('id', id).select().single();
    if (error) throw error;

    if (items !== undefined) {
      await supabase.from('invoice_items').delete().eq('invoice_id', id);
      if (items.length > 0) {
        await supabase.from('invoice_items').insert(
          items.map((item, i) => ({ ...item, invoice_id: id, sort_order: i }))
        );
      }
    }
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  },

  async getStats() {
    const { data } = await supabase.from('invoices').select('status,total,amount_paid');
    const stats = { draft: 0, sent: 0, paid: 0, overdue: 0, total_revenue: 0, outstanding: 0 };
    (data || []).forEach(r => {
      if (r.status in stats) stats[r.status]++;
      if (r.status === 'paid') stats.total_revenue += Number(r.total) || 0;
      if (['sent', 'partially_paid', 'overdue'].includes(r.status)) {
        stats.outstanding += (Number(r.total) - Number(r.amount_paid)) || 0;
      }
    });
    return stats;
  },
};
