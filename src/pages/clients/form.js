import { clientsService } from '../../services/clients.js';
import { supabase } from '../../lib/supabase.js';
import { toast } from '../../components/toast.js';

export async function render(container, params = {}) {
  const isEdit = !!params.id;
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  const [clientData, profilesRes] = await Promise.all([
    isEdit ? clientsService.getById(params.id) : Promise.resolve(null),
    supabase.from('profiles').select('id,full_name').eq('is_active', true),
  ]);

  const client = clientData;
  const profiles = profilesRes.data || [];

  container.innerHTML = `
    <div class="page-content" style="max-width:860px">
      <div class="page-header">
        <div class="page-header-left">
          <h1>${isEdit ? 'Edit Client' : 'Add New Client'}</h1>
        </div>
        <div class="page-header-actions">
          <a href="${isEdit ? '#/clients/' + params.id : '#/clients'}" class="btn btn-secondary">Cancel</a>
        </div>
      </div>

      <form id="client-form">
        <div class="card" style="margin-bottom:var(--space-4)">
          <div class="form-section-title">Company Information</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label required">Company Name</label>
              <input type="text" name="company_name" class="form-input" value="${client?.company_name || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Contact Name</label>
              <input type="text" name="contact_name" class="form-input" value="${client?.contact_name || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Email</label>
              <input type="email" name="email" class="form-input" value="${client?.email || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" name="phone" class="form-input" value="${client?.phone || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Website</label>
              <input type="url" name="website" class="form-input" value="${client?.website || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Industry</label>
              <input type="text" name="industry" class="form-input" value="${client?.industry || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Company Size</label>
              <select name="company_size" class="form-select">
                <option value="">Select size</option>
                ${['1-10','11-50','51-200','201-500','500+'].map(s => `<option value="${s}" ${client?.company_size === s ? 'selected' : ''}>${s} employees</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select name="status" class="form-select">
                ${[['active','Active'],['inactive','Inactive'],['churned','Churned']].map(([v,l]) => `<option value="${v}" ${(client?.status || 'active') === v ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--space-4)">
          <div class="form-section-title">Address</div>
          <div class="form-grid">
            <div class="form-group form-col-full">
              <label class="form-label">Address Line 1</label>
              <input type="text" name="address_line1" class="form-input" value="${client?.address_line1 || ''}">
            </div>
            <div class="form-group form-col-full">
              <label class="form-label">Address Line 2</label>
              <input type="text" name="address_line2" class="form-input" value="${client?.address_line2 || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">City</label>
              <input type="text" name="city" class="form-input" value="${client?.city || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">State</label>
              <input type="text" name="state" class="form-input" value="${client?.state || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Country</label>
              <input type="text" name="country" class="form-input" value="${client?.country || 'India'}">
            </div>
            <div class="form-group">
              <label class="form-label">Postal Code</label>
              <input type="text" name="postal_code" class="form-input" value="${client?.postal_code || ''}">
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--space-4)">
          <div class="form-section-title">Account</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Account Manager</label>
              <select name="account_manager" class="form-select">
                <option value="">Unassigned</option>
                ${profiles.map(p => `<option value="${p.id}" ${client?.account_manager === p.id ? 'selected' : ''}>${p.full_name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Annual Revenue (INR)</label>
              <input type="number" name="annual_revenue" class="form-input" value="${client?.annual_revenue || ''}" min="0">
            </div>
          </div>
          <div class="form-group" style="margin-top:var(--space-4)">
            <label class="form-label">Notes</label>
            <textarea name="notes" class="form-textarea" rows="4">${client?.notes || ''}</textarea>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:var(--space-3);padding-bottom:var(--space-6)">
          <a href="${isEdit ? '#/clients/' + params.id : '#/clients'}" class="btn btn-secondary">Cancel</a>
          <button type="submit" class="btn btn-primary" id="submit-btn">${isEdit ? 'Update Client' : 'Add Client'}</button>
        </div>
      </form>
    </div>
  `;

  container.querySelector('#client-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = container.querySelector('#submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner sm"></span>&nbsp;Saving...`;
    const fd = new FormData(e.target);
    const payload = Object.fromEntries([...fd.entries()].filter(([k,v]) => v !== ''));
    if (!payload.account_manager) delete payload.account_manager;
    if (!payload.annual_revenue) delete payload.annual_revenue;
    else payload.annual_revenue = parseFloat(payload.annual_revenue);
    try {
      if (isEdit) {
        await clientsService.update(params.id, payload);
        toast.success('Client updated');
        window.location.hash = `#/clients/${params.id}`;
      } else {
        const c = await clientsService.create(payload);
        toast.success('Client added');
        window.location.hash = `#/clients/${c.id}`;
      }
    } catch (err) {
      toast.error(err.message);
      btn.disabled = false;
      btn.textContent = isEdit ? 'Update Client' : 'Add Client';
    }
  });
}
