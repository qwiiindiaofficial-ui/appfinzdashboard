import { projectsService } from '../../services/projects.js';
import { supabase } from '../../lib/supabase.js';
import { toast } from '../../components/toast.js';

export async function render(container, params = {}) {
  const isEdit = !!params.id;
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  const [projData, clientsRes, profilesRes] = await Promise.all([
    isEdit ? projectsService.getById(params.id) : Promise.resolve(null),
    supabase.from('clients').select('id,company_name').eq('status', 'active').order('company_name'),
    supabase.from('profiles').select('id,full_name').eq('is_active', true),
  ]);

  const project = projData;
  const clients = clientsRes.data || [];
  const profiles = profilesRes.data || [];
  const preselectedClient = params.client_id || project?.client_id || '';

  container.innerHTML = `
    <div class="page-content" style="max-width:860px">
      <div class="page-header">
        <div class="page-header-left"><h1>${isEdit ? 'Edit Project' : 'New Project'}</h1></div>
        <div class="page-header-actions">
          <a href="${isEdit ? '#/projects/' + params.id : '#/projects'}" class="btn btn-secondary">Cancel</a>
        </div>
      </div>
      <form id="proj-form">
        <div class="card" style="margin-bottom:var(--space-4)">
          <div class="form-section-title">Project Details</div>
          <div class="form-grid">
            <div class="form-group form-col-full">
              <label class="form-label required">Project Name</label>
              <input type="text" name="name" class="form-input" value="${project?.name || ''}" required>
            </div>
            <div class="form-group form-col-full">
              <label class="form-label">Description</label>
              <textarea name="description" class="form-textarea" rows="3">${project?.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label required">Client</label>
              <select name="client_id" class="form-select" required>
                <option value="">Select client</option>
                ${clients.map(c => `<option value="${c.id}" ${(preselectedClient || project?.client_id) === c.id ? 'selected' : ''}>${c.company_name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Project Type</label>
              <select name="project_type" class="form-select">
                ${[['development','Development'],['design','Design'],['consulting','Consulting'],['maintenance','Maintenance'],['seo','SEO'],['marketing','Marketing'],['other','Other']].map(([v,l]) => `<option value="${v}" ${(project?.project_type || 'development') === v ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select name="status" class="form-select">
                ${[['planning','Planning'],['in_progress','In Progress'],['on_hold','On Hold'],['review','Review'],['completed','Completed'],['cancelled','Cancelled']].map(([v,l]) => `<option value="${v}" ${(project?.status || 'planning') === v ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select name="priority" class="form-select">
                ${[['low','Low'],['medium','Medium'],['high','High'],['critical','Critical']].map(([v,l]) => `<option value="${v}" ${(project?.priority || 'medium') === v ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Project Manager</label>
              <select name="project_manager" class="form-select">
                <option value="">Unassigned</option>
                ${profiles.map(p => `<option value="${p.id}" ${project?.project_manager === p.id ? 'selected' : ''}>${p.full_name}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="card" style="margin-bottom:var(--space-4)">
          <div class="form-section-title">Timeline & Budget</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <input type="date" name="start_date" class="form-input" value="${project?.start_date || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">End Date</label>
              <input type="date" name="end_date" class="form-input" value="${project?.end_date || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Budget (INR)</label>
              <input type="number" name="budget" class="form-input" value="${project?.budget || ''}" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">Progress (%)</label>
              <input type="number" name="progress_pct" class="form-input" value="${project?.progress_pct || 0}" min="0" max="100">
            </div>
          </div>
          <div class="form-group" style="margin-top:var(--space-4)">
            <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--text-sm)">
              <input type="checkbox" name="visible_on_portal" ${(project?.visible_on_portal !== false) ? 'checked' : ''} style="width:16px;height:16px">
              Visible on Client Portal
            </label>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:var(--space-3);padding-bottom:var(--space-6)">
          <a href="${isEdit ? '#/projects/' + params.id : '#/projects'}" class="btn btn-secondary">Cancel</a>
          <button type="submit" class="btn btn-primary" id="submit-btn">${isEdit ? 'Update Project' : 'Create Project'}</button>
        </div>
      </form>
    </div>
  `;

  container.querySelector('#proj-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = container.querySelector('#submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner sm"></span>&nbsp;Saving...`;
    const fd = new FormData(e.target);
    const payload = {
      name: fd.get('name'),
      description: fd.get('description') || null,
      client_id: fd.get('client_id'),
      project_type: fd.get('project_type'),
      status: fd.get('status'),
      priority: fd.get('priority'),
      project_manager: fd.get('project_manager') || null,
      start_date: fd.get('start_date') || null,
      end_date: fd.get('end_date') || null,
      budget: fd.get('budget') ? parseFloat(fd.get('budget')) : null,
      progress_pct: parseInt(fd.get('progress_pct')) || 0,
      visible_on_portal: fd.get('visible_on_portal') === 'on',
    };
    try {
      if (isEdit) {
        await projectsService.update(params.id, payload);
        toast.success('Project updated');
        window.location.hash = `#/projects/${params.id}`;
      } else {
        const p = await projectsService.create(payload);
        toast.success('Project created');
        window.location.hash = `#/projects/${p.id}`;
      }
    } catch (err) {
      toast.error(err.message);
      btn.disabled = false;
      btn.textContent = isEdit ? 'Update Project' : 'Create Project';
    }
  });
}
