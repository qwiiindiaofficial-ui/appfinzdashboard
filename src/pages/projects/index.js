import { projectsService } from '../../services/projects.js';
import { projectStatusBadge, priorityBadge, PROJECT_STATUSES } from '../../components/badge.js';
import { formatDate, formatCurrency, debounce } from '../../lib/utils.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';

let state = { page: 1, status: '', total: 0 };

export async function render(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  const shell = document.createElement('div');
  shell.className = 'page-content';
  shell.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h1>Projects</h1><p>All client projects</p></div>
      <div class="page-header-actions">
        <a href="#/projects/new" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </a>
      </div>
    </div>
    <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm filter-status-btn active" data-status="">All</button>
      ${PROJECT_STATUSES.map(s => `<button class="btn btn-secondary btn-sm filter-status-btn" data-status="${s.value}">${s.label}</button>`).join('')}
    </div>
    <div id="projects-grid"></div>
  `;
  container.innerHTML = '';
  container.appendChild(shell);

  const load = async () => {
    const wrap = shell.querySelector('#projects-grid');
    wrap.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
    const { data } = await projectsService.getAll({ status: state.status }).catch(() => ({ data: [] }));

    if (!data || data.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div><h3>No projects found</h3><a href="#/projects/new" class="btn btn-primary">Create First Project</a></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Project</th><th>Client</th><th>Type</th><th>Status</th><th>Progress</th><th>Budget</th><th>Due Date</th><th></th></tr></thead>
          <tbody>
            ${data.map(p => `
              <tr>
                <td><a class="table-link" href="#/projects/${p.id}">${p.name}</a></td>
                <td>${p.client ? `<a href="#/clients/${p.client.id}" style="color:var(--text-secondary);font-size:var(--text-sm)">${p.client.company_name}</a>` : '-'}</td>
                <td><span class="td-muted">${p.project_type.replace(/_/g,' ')}</span></td>
                <td>${projectStatusBadge(p.status)}</td>
                <td style="min-width:120px">
                  <div style="display:flex;align-items:center;gap:var(--space-2)">
                    <div class="progress-bar-wrap" style="flex:1"><div class="progress-bar" style="width:${p.progress_pct}%"></div></div>
                    <span style="font-size:var(--text-xs);color:var(--text-muted);min-width:30px">${p.progress_pct}%</span>
                  </div>
                </td>
                <td>${p.budget ? formatCurrency(p.budget, p.currency) : '<span class="td-muted">-</span>'}</td>
                <td><span class="td-muted">${formatDate(p.end_date)}</span></td>
                <td>
                  <div class="table-actions">
                    <a href="#/projects/${p.id}" class="btn btn-ghost btn-icon btn-sm" title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>
                    <a href="#/projects/${p.id}/edit" class="btn btn-ghost btn-icon btn-sm" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></a>
                    <button class="btn btn-ghost btn-icon btn-sm del-proj" data-id="${p.id}" data-name="${p.name}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    wrap.querySelectorAll('.del-proj').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({ title: 'Delete Project', message: `Delete "${btn.dataset.name}"?` });
        if (ok) { await projectsService.delete(btn.dataset.id); toast.success('Project deleted'); load(); }
      });
    });
  };

  shell.querySelectorAll('.filter-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.status = btn.dataset.status;
      shell.querySelectorAll('.filter-status-btn').forEach(b => b.classList.toggle('active', b.dataset.status === state.status));
      shell.querySelectorAll('.filter-status-btn').forEach(b => { b.classList.toggle('btn-primary', b.classList.contains('active')); b.classList.toggle('btn-secondary', !b.classList.contains('active')); });
      load();
    });
  });
  shell.querySelector('[data-status=""]').classList.add('btn-primary');
  shell.querySelector('[data-status=""]').classList.remove('btn-secondary');

  await load();
}
