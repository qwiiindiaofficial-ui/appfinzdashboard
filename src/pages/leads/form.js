import { leadsService } from '../../services/leads.js';
import { supabase } from '../../lib/supabase.js';
import { toast } from '../../components/toast.js';
import { getState } from '../../lib/store.js';

const SERVICES = ['Web Development','Mobile App','UI/UX Design','SEO','Digital Marketing','IT Consulting','Cloud Solutions','Maintenance','Other'];

export async function render(container, params = {}) {
  const isEdit = !!params.id;
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  const [leadData, profilesRes] = await Promise.all([
    isEdit ? leadsService.getById(params.id) : Promise.resolve(null),
    supabase.from('profiles').select('id,full_name').eq('is_active', true),
  ]);

  const lead = leadData;
  const profiles = profilesRes.data || [];
  const profile = getState('currentProfile');

  const existingTags = lead?.tags || [];
  let tags = [...existingTags];
  let selectedServices = (lead?.notes ? [] : []);

  container.innerHTML = `
    <div class="page-content" style="max-width:860px">
      <div class="page-header">
        <div class="page-header-left">
          <h1>${isEdit ? 'Edit Lead' : 'Add New Lead'}</h1>
          <p>${isEdit ? `Updating: ${lead?.full_name}` : 'Fill in the details to add a new lead'}</p>
        </div>
        <div class="page-header-actions">
          <a href="${isEdit ? '#/leads/' + params.id : '#/leads'}" class="btn btn-secondary">Cancel</a>
        </div>
      </div>

      <form id="lead-form">
        <div class="card" style="margin-bottom:var(--space-4)">
          <div class="form-section-title">Contact Information</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label required">Full Name</label>
              <input type="text" name="full_name" class="form-input" value="${lead?.full_name || ''}" required placeholder="e.g. Rahul Sharma">
            </div>
            <div class="form-group">
              <label class="form-label">Company Name</label>
              <input type="text" name="company_name" class="form-input" value="${lead?.company_name || ''}" placeholder="e.g. Tech Solutions Pvt Ltd">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" name="email" class="form-input" value="${lead?.email || ''}" placeholder="rahul@example.com">
            </div>
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" name="phone" class="form-input" value="${lead?.phone || ''}" placeholder="+91 98765 43210">
            </div>
            <div class="form-group">
              <label class="form-label">Website</label>
              <input type="url" name="website" class="form-input" value="${lead?.website || ''}" placeholder="https://example.com">
            </div>
            <div class="form-group">
              <label class="form-label">Industry</label>
              <input type="text" name="industry" class="form-input" value="${lead?.industry || ''}" list="industry-list" placeholder="e.g. E-commerce, Healthcare">
              <datalist id="industry-list">
                ${['E-commerce','Healthcare','Education','Finance','Retail','Manufacturing','Real Estate','Technology','Hospitality','Media'].map(i => `<option value="${i}">`).join('')}
              </datalist>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--space-4)">
          <div class="form-section-title">Lead Details</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label required">Status</label>
              <select name="status" class="form-select" id="status-select">
                ${[['new','New'],['contacted','Contacted'],['qualified','Qualified'],['proposal_sent','Proposal Sent'],['negotiation','Negotiation'],['won','Won'],['lost','Lost']].map(([v,l]) => `<option value="${v}" ${(lead?.status || 'new') === v ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Source</label>
              <select name="source" class="form-select">
                ${[['website','Website'],['referral','Referral'],['linkedin','LinkedIn'],['cold_call','Cold Call'],['email_campaign','Email Campaign'],['social_media','Social Media'],['event','Event'],['other','Other']].map(([v,l]) => `<option value="${v}" ${(lead?.source || 'other') === v ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Priority</label>
              <select name="priority" class="form-select">
                ${[['low','Low'],['medium','Medium'],['high','High'],['critical','Critical']].map(([v,l]) => `<option value="${v}" ${(lead?.priority || 'medium') === v ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Assigned To</label>
              <select name="assigned_to" class="form-select">
                <option value="">Unassigned</option>
                ${profiles.map(p => `<option value="${p.id}" ${lead?.assigned_to === p.id ? 'selected' : ''}>${p.full_name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Estimated Value (INR)</label>
              <input type="number" name="estimated_value" class="form-input" value="${lead?.estimated_value || ''}" placeholder="0" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">Expected Close Date</label>
              <input type="date" name="expected_close" class="form-input" value="${lead?.expected_close || ''}">
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--space-4)">
          <div class="form-section-title">Services & Tags</div>
          <div class="form-group" style="margin-bottom:var(--space-4)">
            <label class="form-label">Services Interested In</label>
            <div id="services-wrap" style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-top:var(--space-2)">
              ${SERVICES.map(s => `
                <label style="display:flex;align-items:center;gap:var(--space-1);padding:var(--space-1) var(--space-3);border:1px solid var(--border-color);border-radius:var(--border-radius-full);cursor:pointer;font-size:var(--text-sm);transition:all var(--transition-fast)">
                  <input type="checkbox" name="service" value="${s}" style="display:none" ${lead?.tags?.includes(s) ? 'checked' : ''}>${s}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Tags</label>
            <div class="tag-input-wrap" id="tag-wrap">
              ${tags.filter(t => !SERVICES.includes(t)).map(t => `<span class="tag">${t}<span class="tag-remove" data-tag="${t}">&times;</span></span>`).join('')}
              <input type="text" class="tag-input" id="tag-input" placeholder="Type and press Enter...">
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--space-4)" id="notes-card">
          <div class="form-section-title">Notes</div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea name="notes" class="form-textarea" rows="4" placeholder="Any additional information about this lead...">${lead?.notes || ''}</textarea>
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--space-4)" id="lost-reason-card" ${(lead?.status || '') !== 'lost' ? 'style="display:none;margin-bottom:var(--space-4)"' : ''}>
          <div class="form-section-title">Lost Reason</div>
          <div class="form-group">
            <label class="form-label">Why was this lead lost?</label>
            <textarea name="lost_reason" class="form-textarea" rows="3" placeholder="Describe why this lead was lost...">${lead?.lost_reason || ''}</textarea>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:var(--space-3);padding-bottom:var(--space-6)">
          <a href="${isEdit ? '#/leads/' + params.id : '#/leads'}" class="btn btn-secondary">Cancel</a>
          <button type="submit" class="btn btn-primary" id="submit-btn">
            ${isEdit ? 'Update Lead' : 'Add Lead'}
          </button>
        </div>
      </form>
    </div>
  `;

  const lostCard = container.querySelector('#lost-reason-card');
  container.querySelector('#status-select').addEventListener('change', e => {
    lostCard.style.display = e.target.value === 'lost' ? '' : 'none';
  });
  if ((lead?.status || '') === 'lost') lostCard.style.display = '';

  container.querySelectorAll('[name="service"]').forEach(cb => {
    const label = cb.closest('label');
    const updateStyle = () => {
      label.style.background = cb.checked ? 'var(--color-primary-100)' : '';
      label.style.borderColor = cb.checked ? 'var(--color-primary-400)' : '';
      label.style.color = cb.checked ? 'var(--color-primary-700)' : '';
    };
    updateStyle();
    cb.addEventListener('change', updateStyle);
  });

  const tagInput = container.querySelector('#tag-input');
  const tagWrap = container.querySelector('#tag-wrap');
  let customTags = tags.filter(t => !SERVICES.includes(t));

  const renderTags = () => {
    tagWrap.querySelectorAll('.tag').forEach(t => t.remove());
    customTags.forEach(t => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.innerHTML = `${t}<span class="tag-remove">&times;</span>`;
      span.querySelector('.tag-remove').addEventListener('click', () => {
        customTags = customTags.filter(x => x !== t);
        renderTags();
      });
      tagWrap.insertBefore(span, tagInput);
    });
  };

  tagInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.value.trim();
      if (val && !customTags.includes(val)) { customTags.push(val); renderTags(); }
      tagInput.value = '';
    }
  });

  container.querySelector('#lead-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = container.querySelector('#submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner sm"></span>&nbsp;Saving...`;

    const fd = new FormData(e.target);
    const checkedServices = Array.from(container.querySelectorAll('[name="service"]:checked')).map(c => c.value);
    const allTags = [...checkedServices, ...customTags];

    const payload = {
      full_name: fd.get('full_name'),
      company_name: fd.get('company_name') || null,
      email: fd.get('email') || null,
      phone: fd.get('phone') || null,
      website: fd.get('website') || null,
      industry: fd.get('industry') || null,
      status: fd.get('status'),
      source: fd.get('source'),
      priority: fd.get('priority'),
      assigned_to: fd.get('assigned_to') || null,
      estimated_value: parseFloat(fd.get('estimated_value')) || 0,
      expected_close: fd.get('expected_close') || null,
      tags: allTags,
      notes: fd.get('notes') || null,
      lost_reason: fd.get('status') === 'lost' ? (fd.get('lost_reason') || null) : null,
    };

    try {
      if (isEdit) {
        await leadsService.update(params.id, payload);
        toast.success('Lead updated');
        window.location.hash = `#/leads/${params.id}`;
      } else {
        const newLead = await leadsService.create(payload);
        toast.success('Lead added');
        window.location.hash = `#/leads/${newLead.id}`;
      }
    } catch (err) {
      toast.error(err.message);
      btn.disabled = false;
      btn.textContent = isEdit ? 'Update Lead' : 'Add Lead';
    }
  });
}
