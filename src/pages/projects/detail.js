import { projectsService } from '../../services/projects.js';
import { tasksService } from '../../services/tasks.js';
import { supabase } from '../../lib/supabase.js';
import { projectStatusBadge, priorityBadge } from '../../components/badge.js';
import { formatCurrency, formatDate, formatRelativeTime, generateInitials, avatarColor, escapeHtml } from '../../lib/utils.js';
import { toast } from '../../components/toast.js';
import { confirmDialog } from '../../components/modal.js';

const updateTypeLabels = { progress: 'Progress Update', milestone: 'Milestone', blocker: 'Blocker', design: 'Design', delivery: 'Delivery', note: 'Note' };
const updateTypeColors = { progress: '#2563eb', milestone: '#16a34a', blocker: '#dc2626', design: '#0891b2', delivery: '#0d9488', note: '#64748b' };

export async function render(container, params = {}) {
  const load = async () => {
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
    try {
      const [project, updates, tasks, profiles] = await Promise.all([
        projectsService.getById(params.id),
        projectsService.getUpdates(params.id),
        tasksService.getAll({ projectId: params.id }).then(r => r.data),
        supabase.from('profiles').select('id,full_name').eq('is_active', true).then(r => r.data || []),
      ]);
      if (!project) {
        container.innerHTML = `<div class="page-content"><div class="empty-state"><h3>Project not found</h3><a href="#/projects" class="btn btn-primary">Back</a></div></div>`;
        return;
      }
      renderProject(project, updates, tasks, profiles);
    } catch (err) {
      container.innerHTML = `<div class="page-content"><div class="empty-state"><h3>Error</h3><p>${err.message}</p></div></div>`;
    }
  };

  const renderProject = (project, updates, tasks, profiles) => {
    container.innerHTML = `
      <div class="page-content">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
          <a href="#/projects" style="color:var(--text-muted);font-size:var(--text-sm)">&larr; Projects</a>
          <span style="color:var(--color-gray-300)">/</span>
          ${project.client ? `<a href="#/clients/${project.client.id}" style="color:var(--text-muted);font-size:var(--text-sm)">${project.client.company_name}</a>` : ''}
        </div>

        <div class="card" style="margin-bottom:var(--space-5)">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4)">
            <div>
              <h2>${project.name}</h2>
              <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-2)">
                ${projectStatusBadge(project.status)}
                ${priorityBadge(project.priority)}
                <span class="badge badge-gray">${project.project_type.replace(/_/g,' ')}</span>
                ${project.client ? `<a href="#/clients/${project.client.id}" style="font-size:var(--text-sm);color:var(--text-muted)">${project.client.company_name}</a>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:var(--space-2)">
              <a href="#/projects/${project.id}/edit" class="btn btn-secondary">Edit</a>
            </div>
          </div>
          <div style="margin-top:var(--space-5)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
              <span style="font-size:var(--text-sm);font-weight:var(--font-medium)">Overall Progress</span>
              <span style="font-size:var(--text-2xl);font-weight:var(--font-bold);color:var(--color-primary-600)">${project.progress_pct}%</span>
            </div>
            <div class="progress-bar-wrap progress-bar-lg">
              <div class="progress-bar" style="width:${project.progress_pct}%"></div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 300px;gap:var(--space-5)">
          <div>
            <div class="card">
              <div class="card-header">
                <div class="card-title">Updates</div>
              </div>
              <div style="background:var(--color-gray-50);border:1px solid var(--border-color);border-radius:var(--border-radius);padding:var(--space-4);margin-bottom:var(--space-5)" id="post-update-form">
                <div style="font-size:var(--text-sm);font-weight:var(--font-medium);margin-bottom:var(--space-3)">Post an Update</div>
                <div class="form-grid" style="margin-bottom:var(--space-2)">
                  <div class="form-group">
                    <select id="update-type" class="form-select">
                      ${Object.entries(updateTypeLabels).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group">
                    <input type="number" id="update-progress" class="form-input" placeholder="Progress % (optional)" min="0" max="100" value="${project.progress_pct}">
                  </div>
                </div>
                <input type="text" id="update-title" class="form-input" placeholder="Title" style="margin-bottom:var(--space-2)">
                <textarea id="update-body" class="form-textarea" rows="3" placeholder="Describe the update..."></textarea>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-2)">
                  <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--text-sm)">
                    <input type="checkbox" id="update-visible" checked style="width:14px;height:14px">
                    Visible to client
                  </label>
                  <button class="btn btn-primary btn-sm" id="save-update">Post Update</button>
                </div>
              </div>

              <div id="updates-feed">
                ${updates.length === 0 ? `<div style="text-align:center;padding:var(--space-8);color:var(--text-muted);font-size:var(--text-sm)">No updates yet</div>` : ''}
                ${updates.map(u => `
                  <div style="display:flex;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--border-color)">
                    <div style="width:4px;background:${updateTypeColors[u.update_type] || '#64748b'};border-radius:2px;flex-shrink:0"></div>
                    <div style="flex:1">
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                        <div style="display:flex;align-items:center;gap:var(--space-2)">
                          <span class="badge badge-gray">${updateTypeLabels[u.update_type] || u.update_type}</span>
                          <span style="font-weight:var(--font-medium);font-size:var(--text-sm)">${u.title}</span>
                          ${!u.is_client_visible ? '<span class="badge badge-yellow">Internal</span>' : ''}
                        </div>
                        <span style="font-size:var(--text-xs);color:var(--text-muted)">${formatRelativeTime(u.created_at)}</span>
                      </div>
                      ${u.body ? `<p style="font-size:var(--text-sm);color:var(--text-secondary)">${escapeHtml(u.body)}</p>` : ''}
                      ${u.progress_snapshot != null ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">Progress: ${u.progress_snapshot}%</div>` : ''}
                      ${u.author ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">by ${u.author.full_name}</div>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div>
            <div class="card" style="margin-bottom:var(--space-4)">
              <div class="card-header"><div class="card-title">Details</div></div>
              <div style="display:flex;flex-direction:column;gap:var(--space-3)">
                ${project.start_date ? `<div><div class="detail-label">Start Date</div><div class="detail-value" style="font-size:var(--text-sm)">${formatDate(project.start_date)}</div></div>` : ''}
                ${project.end_date ? `<div><div class="detail-label">Due Date</div><div class="detail-value" style="font-size:var(--text-sm)">${formatDate(project.end_date)}</div></div>` : ''}
                ${project.budget ? `<div>
                  <div class="detail-label">Budget</div>
                  <div class="detail-value" style="font-size:var(--text-sm)">${formatCurrency(project.budget, project.currency)}</div>
                  <div style="margin-top:var(--space-1)">
                    <div class="progress-bar-wrap"><div class="progress-bar ${project.spent > project.budget ? 'red' : ''}" style="width:${Math.min(project.spent/project.budget*100,100)}%"></div></div>
                    <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">Spent: ${formatCurrency(project.spent, project.currency)}</div>
                  </div>
                </div>` : ''}
                ${project.manager ? `<div>
                  <div class="detail-label">Manager</div>
                  <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:4px">
                    <div class="user-avatar sm" style="background:${avatarColor(project.manager.full_name)}">${generateInitials(project.manager.full_name)}</div>
                    <span style="font-size:var(--text-sm)">${project.manager.full_name}</span>
                  </div>
                </div>` : ''}
                <div><div class="detail-label">Portal Visible</div><div class="detail-value" style="font-size:var(--text-sm)">${project.visible_on_portal ? 'Yes' : 'No'}</div></div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <div class="card-title">Tasks <span class="tab-count">${tasks.length}</span></div>
                <button class="btn btn-ghost btn-sm" id="add-task-btn">+ Add</button>
              </div>
              <div id="tasks-list">
                ${tasks.length === 0 ? `<div style="font-size:var(--text-sm);color:var(--text-muted);text-align:center;padding:var(--space-4)">No tasks</div>` : ''}
                ${tasks.map(t => `
                  <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;border-bottom:1px solid var(--border-color)">
                    <input type="checkbox" class="task-check" data-id="${t.id}" ${t.status === 'completed' ? 'checked' : ''} style="cursor:pointer">
                    <span style="font-size:var(--text-sm);flex:1;${t.status === 'completed' ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${t.title}</span>
                    ${priorityBadge(t.priority)}
                  </div>
                `).join('')}
              </div>
              <div id="add-task-form" style="display:none;margin-top:var(--space-3)">
                <input type="text" id="task-title" class="form-input" placeholder="Task title" style="margin-bottom:var(--space-2)">
                <div style="display:flex;gap:var(--space-2)">
                  <button class="btn btn-secondary btn-sm" id="cancel-task">Cancel</button>
                  <button class="btn btn-primary btn-sm" id="save-task">Add</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#save-update').addEventListener('click', async () => {
      const title = container.querySelector('#update-title').value.trim();
      if (!title) return toast.warning('Enter a title for the update');
      try {
        const progressVal = container.querySelector('#update-progress').value;
        const progress = progressVal ? parseInt(progressVal) : null;
        await projectsService.addUpdate(project.id, {
          update_type: container.querySelector('#update-type').value,
          title,
          body: container.querySelector('#update-body').value.trim() || null,
          progress_snapshot: progress,
          is_client_visible: container.querySelector('#update-visible').checked,
        });
        if (progress !== null) {
          await projectsService.update(project.id, { progress_pct: progress });
        }
        toast.success('Update posted');
        load();
      } catch (err) { toast.error(err.message); }
    });

    container.querySelector('#add-task-btn')?.addEventListener('click', () => {
      container.querySelector('#add-task-form').style.display = '';
    });
    container.querySelector('#cancel-task')?.addEventListener('click', () => {
      container.querySelector('#add-task-form').style.display = 'none';
    });
    container.querySelector('#save-task')?.addEventListener('click', async () => {
      const title = container.querySelector('#task-title').value.trim();
      if (!title) return;
      await tasksService.create({ project_id: project.id, title, task_type: 'other', priority: 'medium' });
      toast.success('Task added');
      load();
    });

    container.querySelectorAll('.task-check').forEach(cb => {
      cb.addEventListener('change', async e => {
        if (e.target.checked) { await tasksService.complete(e.target.dataset.id); }
      });
    });
  };

  await load();
}
