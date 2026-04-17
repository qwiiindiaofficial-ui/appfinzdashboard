import { tasksService } from '../../services/tasks.js';
import { supabase } from '../../lib/supabase.js';
import { taskStatusBadge, priorityBadge } from '../../components/badge.js';
import { formatDate, generateInitials, avatarColor } from '../../lib/utils.js';
import { getState } from '../../lib/store.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import { confirmDialog } from '../../components/modal.js';

let activeTab = 'my';

export async function render(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  const [profilesRes, leadsRes, clientsRes, projectsRes] = await Promise.all([
    supabase.from('profiles').select('id,full_name').eq('is_active', true),
    supabase.from('leads').select('id,full_name,company_name').order('full_name').limit(50),
    supabase.from('clients').select('id,company_name').order('company_name').limit(50),
    supabase.from('projects').select('id,name').order('name').limit(50),
  ]);

  const profiles = profilesRes.data || [];
  const leads = leadsRes.data || [];
  const clients = clientsRes.data || [];
  const projects = projectsRes.data || [];
  const myProfile = getState('currentProfile');

  const shell = document.createElement('div');
  shell.className = 'page-content';
  shell.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h1>Tasks</h1></div>
      <div class="page-header-actions">
        <button class="btn btn-primary" id="add-task-btn">+ Add Task</button>
      </div>
    </div>
    <div class="tabs" style="margin-bottom:var(--space-5)">
      <button class="tab-btn active" data-tab="my">My Tasks</button>
      <button class="tab-btn" data-tab="all">All Tasks</button>
      <button class="tab-btn" data-tab="overdue">Overdue</button>
    </div>
    <div id="tasks-content"></div>
  `;
  container.innerHTML = '';
  container.appendChild(shell);

  const load = async () => {
    const tc = shell.querySelector('#tasks-content');
    tc.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

    const filters = {};
    if (activeTab === 'my') filters.assignedTo = myProfile?.id;
    if (activeTab === 'overdue') filters.status = 'pending';

    const { data } = await tasksService.getAll(filters).catch(() => ({ data: [] }));
    let tasks = data || [];

    if (activeTab === 'overdue') {
      tasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');
    }
    if (activeTab === 'my') {
      tasks = tasks.filter(t => t.status !== 'completed');
    }

    if (tasks.length === 0) {
      tc.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div><h3>No tasks found</h3></div>`;
      return;
    }

    tc.innerHTML = `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th></th><th>Title</th><th>Type</th><th>Priority</th><th>Status</th><th>Due Date</th><th>Linked To</th><th>Assigned</th><th></th></tr></thead>
          <tbody>
            ${tasks.map(t => {
              const linked = t.lead ? `<a href="#/leads/${t.lead.id}" style="font-size:var(--text-xs);color:var(--text-muted)">Lead: ${t.lead.full_name}</a>`
                : t.client ? `<a href="#/clients/${t.client.id}" style="font-size:var(--text-xs);color:var(--text-muted)">Client: ${t.client.company_name}</a>`
                : t.project ? `<a href="#/projects/${t.project.id}" style="font-size:var(--text-xs);color:var(--text-muted)">Project: ${t.project.name}</a>` : '-';
              const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';
              return `
                <tr>
                  <td><input type="checkbox" class="task-check" data-id="${t.id}" ${t.status === 'completed' ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px"></td>
                  <td><span style="${t.status==='completed'?'text-decoration:line-through;color:var(--text-muted)':''}">${t.title}</span></td>
                  <td><span class="badge badge-gray">${t.task_type.replace(/_/g,' ')}</span></td>
                  <td>${priorityBadge(t.priority)}</td>
                  <td>${taskStatusBadge(t.status)}</td>
                  <td><span style="font-size:var(--text-sm);${isOverdue?'color:var(--color-danger);font-weight:var(--font-semibold)':''}">${t.due_date ? formatDate(t.due_date) : '-'}</span></td>
                  <td>${linked}</td>
                  <td>${t.assigned_profile ? `<div class="user-avatar sm" style="background:${avatarColor(t.assigned_profile.full_name)}" title="${t.assigned_profile.full_name}">${generateInitials(t.assigned_profile.full_name)}</div>` : '-'}</td>
                  <td><button class="btn btn-ghost btn-icon btn-sm del-task" data-id="${t.id}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    tc.querySelectorAll('.task-check').forEach(cb => {
      cb.addEventListener('change', async e => {
        await tasksService.update(e.target.dataset.id, {
          status: e.target.checked ? 'completed' : 'pending',
          completed_at: e.target.checked ? new Date().toISOString() : null,
        });
        load();
      });
    });

    tc.querySelectorAll('.del-task').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({ title: 'Delete Task', message: 'Delete this task?' });
        if (ok) { await tasksService.delete(btn.dataset.id); toast.success('Task deleted'); load(); }
      });
    });
  };

  shell.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      shell.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      load();
    });
  });

  shell.querySelector('#add-task-btn').addEventListener('click', () => {
    openModal({
      title: 'Add Task',
      size: 'lg',
      content: `
        <div class="form-group" style="margin-bottom:var(--space-3)">
          <label class="form-label required">Title</label>
          <input type="text" id="task-title" class="form-input" required>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Type</label>
            <select id="task-type" class="form-select">
              ${[['follow_up','Follow Up'],['call','Call'],['email','Email'],['meeting','Meeting'],['demo','Demo'],['proposal','Proposal'],['review','Review'],['other','Other']].map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="task-prio" class="form-select">
              ${[['low','Low'],['medium','Medium'],['high','High'],['urgent','Urgent']].map(([v,l]) => `<option value="${v}" ${v==='medium'?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="datetime-local" id="task-due" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">Assign To</label>
            <select id="task-assign" class="form-select">
              <option value="">Unassigned</option>
              ${profiles.map(p => `<option value="${p.id}" ${p.id===myProfile?.id?'selected':''}>${p.full_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Link Type</label>
            <select id="link-type" class="form-select">
              <option value="">None</option>
              <option value="lead">Lead</option>
              <option value="client">Client</option>
              <option value="project">Project</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Link To</label>
            <select id="link-id" class="form-select"><option value="">Select first</option></select>
          </div>
        </div>
      `,
      confirmText: 'Add Task',
      onConfirm: async () => {
        const title = document.querySelector('#task-title').value.trim();
        if (!title) return toast.warning('Enter a task title');
        const linkType = document.querySelector('#link-type').value;
        const linkId = document.querySelector('#link-id').value;
        await tasksService.create({
          title,
          task_type: document.querySelector('#task-type').value,
          priority: document.querySelector('#task-prio').value,
          due_date: document.querySelector('#task-due').value || null,
          assigned_to: document.querySelector('#task-assign').value || null,
          lead_id: linkType === 'lead' ? linkId || null : null,
          client_id: linkType === 'client' ? linkId || null : null,
          project_id: linkType === 'project' ? linkId || null : null,
        });
        closeModal();
        toast.success('Task added');
        load();
      },
    });

    document.querySelector('#link-type')?.addEventListener('change', e => {
      const linkIdSel = document.querySelector('#link-id');
      linkIdSel.innerHTML = '<option value="">Select...</option>';
      const options = e.target.value === 'lead' ? leads.map(l => `<option value="${l.id}">${l.full_name}${l.company_name?' - '+l.company_name:''}</option>`)
        : e.target.value === 'client' ? clients.map(c => `<option value="${c.id}">${c.company_name}</option>`)
        : e.target.value === 'project' ? projects.map(p => `<option value="${p.id}">${p.name}</option>`) : [];
      linkIdSel.innerHTML += options.join('');
    });
  });

  await load();
}
