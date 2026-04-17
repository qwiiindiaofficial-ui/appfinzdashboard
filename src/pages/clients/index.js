import { clientsService } from '../../services/clients.js';
import { clientStatusBadge, CLIENT_STATUSES } from '../../components/badge.js';
import { formatDate, generateInitials, avatarColor, debounce } from '../../lib/utils.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';

let state = { page: 1, search: '', status: '', total: 0 };
const PER_PAGE = 25;

export async function render(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  const shell = document.createElement('div');
  shell.className = 'page-content';
  shell.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Clients</h1>
        <p>Manage your client relationships</p>
      </div>
      <div class="page-header-actions">
        <a href="#/clients/new" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Client
        </a>
      </div>
    </div>

    <div id="stats-strip" style="margin-bottom:var(--space-5)"></div>

    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--border-color)">
        <div class="filter-bar">
          <div class="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="search-input" id="client-search" placeholder="Search clients...">
          </div>
          <select class="filter-select" id="filter-status">
            <option value="">All Statuses</option>
            ${CLIENT_STATUSES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-sm" id="clear-filters">Clear</button>
        </div>
      </div>
      <div id="table-wrap"></div>
    </div>
  `;
  container.innerHTML = '';
  container.appendChild(shell);

  const loadStats = async () => {
    const stats = await clientsService.getStats().catch(() => ({}));
    shell.querySelector('#stats-strip').innerHTML = `
      <div style="display:flex;gap:var(--space-3)">
        ${[['active','Active',stats.active||0,'var(--color-success)'],['inactive','Inactive',stats.inactive||0,'var(--color-gray-500)'],['churned','Churned',stats.churned||0,'var(--color-danger)']].map(([k,l,c,col]) => `
          <div style="background:white;border:1px solid var(--border-color);border-radius:var(--border-radius);padding:var(--space-3) var(--space-5);display:flex;align-items:center;gap:var(--space-3)">
            <div style="width:10px;height:10px;border-radius:50%;background:${col}"></div>
            <span style="font-size:var(--text-sm);color:var(--text-secondary)">${l}</span>
            <span style="font-size:var(--text-lg);font-weight:var(--font-bold);color:var(--text-primary)">${c}</span>
          </div>
        `).join('')}
      </div>
    `;
  };

  const loadData = async () => {
    const wrap = shell.querySelector('#table-wrap');
    wrap.innerHTML = `<div class="loading-state" style="padding:var(--space-12)"><div class="spinner"></div></div>`;
    try {
      const { data, count } = await clientsService.getAll({ search: state.search, status: state.status, page: state.page, perPage: PER_PAGE });
      state.total = count || 0;
      renderTable(wrap, data || []);
    } catch (err) {
      wrap.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
    }
  };

  const renderTable = (wrap, clients) => {
    const totalPages = Math.ceil(state.total / PER_PAGE);
    wrap.innerHTML = `
      ${clients.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
          <h3>No clients found</h3>
          <p>Add a client or convert a lead to get started.</p>
          <a href="#/clients/new" class="btn btn-primary">Add Client</a>
        </div>
      ` : `
        <div class="data-table-wrap" style="border:none;border-radius:0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Status</th>
                <th>Industry</th>
                <th>Portal</th>
                <th>Since</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${clients.map(c => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:var(--space-2)">
                      <div class="user-avatar sm" style="background:${avatarColor(c.company_name)}">${generateInitials(c.company_name)}</div>
                      <a class="table-link" href="#/clients/${c.id}">${c.company_name}</a>
                    </div>
                  </td>
                  <td>${c.contact_name}</td>
                  <td><a href="mailto:${c.email}" style="color:var(--text-primary);font-size:var(--text-sm)">${c.email}</a></td>
                  <td>${clientStatusBadge(c.status)}</td>
                  <td><span class="td-muted">${c.industry || '-'}</span></td>
                  <td>${c.portal_enabled ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Off</span>'}</td>
                  <td><span class="td-muted">${formatDate(c.created_at)}</span></td>
                  <td>
                    <div class="table-actions">
                      <a href="#/clients/${c.id}" class="btn btn-ghost btn-icon btn-sm" title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>
                      <a href="#/clients/${c.id}/edit" class="btn btn-ghost btn-icon btn-sm" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></a>
                      <button class="btn btn-ghost btn-icon btn-sm delete-client" data-id="${c.id}" data-name="${c.company_name}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${state.total > PER_PAGE ? `
          <div class="pagination">
            <div class="pagination-info">Showing ${((state.page-1)*PER_PAGE)+1}–${Math.min(state.page*PER_PAGE, state.total)} of ${state.total}</div>
            <div class="pagination-controls">
              <button class="page-btn" id="prev-page" ${state.page <= 1 ? 'disabled' : ''}>&laquo;</button>
              <button class="page-btn" id="next-page" ${state.page >= totalPages ? 'disabled' : ''}>&raquo;</button>
            </div>
          </div>
        ` : ''}
      `}
    `;
    wrap.querySelector('#prev-page')?.addEventListener('click', () => { state.page--; loadData(); });
    wrap.querySelector('#next-page')?.addEventListener('click', () => { state.page++; loadData(); });
    wrap.querySelectorAll('.delete-client').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({ title: 'Delete Client', message: `Delete "${btn.dataset.name}"? This cannot be undone.` });
        if (ok) {
          await clientsService.delete(btn.dataset.id).catch(err => toast.error(err.message));
          toast.success('Client deleted');
          loadData();
        }
      });
    });
  };

  const debouncedSearch = debounce(v => { state.search = v; state.page = 1; loadData(); }, 350);
  shell.querySelector('#client-search').addEventListener('input', e => debouncedSearch(e.target.value));
  shell.querySelector('#filter-status').addEventListener('change', e => { state.status = e.target.value; state.page = 1; loadData(); });
  shell.querySelector('#clear-filters').addEventListener('click', () => {
    state.search = ''; state.status = ''; state.page = 1;
    shell.querySelector('#client-search').value = '';
    shell.querySelector('#filter-status').value = '';
    loadData();
  });

  await Promise.all([loadStats(), loadData()]);
}
