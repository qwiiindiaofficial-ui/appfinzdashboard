import { leadsService } from '../../services/leads.js';
import { supabase } from '../../lib/supabase.js';
import { leadStatusBadge, priorityBadge, LEAD_STATUSES, PRIORITIES } from '../../components/badge.js';
import { formatCurrency, formatDate, generateInitials, avatarColor, debounce } from '../../lib/utils.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';

let state = { page: 1, search: '', status: '', source: '', priority: '', sortCol: 'created_at', sortDir: 'desc', total: 0 };
const PER_PAGE = 25;

export async function render(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  const [{ data: profiles }] = await Promise.all([
    supabase.from('profiles').select('id,full_name').eq('is_active', true),
  ]);

  state = { ...state, page: 1 };

  const shell = document.createElement('div');
  shell.className = 'page-content';
  shell.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Leads</h1>
        <p>Manage your sales pipeline</p>
      </div>
      <div class="page-header-actions">
        <a href="#/leads/new" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Lead
        </a>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--border-color)">
        <div class="filter-bar">
          <div class="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="search-input" id="lead-search" placeholder="Search leads...">
          </div>
          <select class="filter-select" id="filter-status">
            <option value="">All Statuses</option>
            ${LEAD_STATUSES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
          </select>
          <select class="filter-select" id="filter-priority">
            <option value="">All Priorities</option>
            ${PRIORITIES.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
          </select>
          <select class="filter-select" id="filter-source">
            <option value="">All Sources</option>
            ${['website','referral','linkedin','cold_call','email_campaign','social_media','event','other'].map(s => `<option value="${s}">${s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>`).join('')}
          </select>
          <select class="filter-select" id="filter-assigned">
            <option value="">All Team</option>
            ${(profiles || []).map(p => `<option value="${p.id}">${p.full_name}</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-sm" id="clear-filters">Clear</button>
        </div>
      </div>
      <div id="table-wrap"></div>
    </div>
  `;
  container.innerHTML = '';
  container.appendChild(shell);

  const loadData = async () => {
    const wrap = shell.querySelector('#table-wrap');
    wrap.innerHTML = `<div class="loading-state" style="padding:var(--space-12)"><div class="spinner"></div></div>`;
    try {
      const { data, count } = await leadsService.getAll({
        search: state.search,
        status: state.status,
        source: state.source,
        priority: state.priority,
        page: state.page,
        perPage: PER_PAGE,
        sortCol: state.sortCol,
        sortDir: state.sortDir,
      });
      state.total = count || 0;
      renderTable(wrap, data || []);
    } catch (err) {
      wrap.innerHTML = `<div class="empty-state"><p>Error loading leads: ${err.message}</p></div>`;
    }
  };

  const renderTable = (wrap, leads) => {
    const totalPages = Math.ceil(state.total / PER_PAGE);
    wrap.innerHTML = `
      ${leads.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3>No leads found</h3>
          <p>Add your first lead or adjust your filters.</p>
          <a href="#/leads/new" class="btn btn-primary">Add Lead</a>
        </div>
      ` : `
        <div class="data-table-wrap" style="border:none;border-radius:0">
          <table class="data-table">
            <thead>
              <tr>
                <th class="sortable" data-col="full_name">Name${sortIcon('full_name')}</th>
                <th class="sortable" data-col="status">Status${sortIcon('status')}</th>
                <th class="sortable" data-col="priority">Priority${sortIcon('priority')}</th>
                <th>Source</th>
                <th class="sortable" data-col="estimated_value">Value${sortIcon('estimated_value')}</th>
                <th>Assigned</th>
                <th class="sortable" data-col="expected_close">Close Date${sortIcon('expected_close')}</th>
                <th class="sortable" data-col="created_at">Added${sortIcon('created_at')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${leads.map(lead => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:var(--space-2)">
                      <div class="user-avatar sm" style="background:${avatarColor(lead.full_name)}">${generateInitials(lead.full_name)}</div>
                      <div>
                        <a class="table-link" href="#/leads/${lead.id}">${lead.full_name}</a>
                        <div class="td-muted">${lead.company_name || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>${leadStatusBadge(lead.status)}</td>
                  <td>${priorityBadge(lead.priority)}</td>
                  <td><span class="td-muted">${(lead.source || '').replace(/_/g,' ')}</span></td>
                  <td>${formatCurrency(lead.estimated_value, lead.currency)}</td>
                  <td>${lead.assigned_profile ? `<div class="user-avatar sm" style="background:${avatarColor(lead.assigned_profile.full_name)}" title="${lead.assigned_profile.full_name}">${generateInitials(lead.assigned_profile.full_name)}</div>` : '<span class="td-muted">-</span>'}</td>
                  <td><span class="td-muted">${formatDate(lead.expected_close)}</span></td>
                  <td><span class="td-muted">${formatDate(lead.created_at)}</span></td>
                  <td>
                    <div class="table-actions">
                      <a href="#/leads/${lead.id}" class="btn btn-ghost btn-icon btn-sm" title="View">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </a>
                      <a href="#/leads/${lead.id}/edit" class="btn btn-ghost btn-icon btn-sm" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </a>
                      <button class="btn btn-ghost btn-icon btn-sm delete-lead" data-id="${lead.id}" data-name="${lead.full_name}" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <div class="pagination-info">Showing ${((state.page-1)*PER_PAGE)+1}–${Math.min(state.page*PER_PAGE, state.total)} of ${state.total}</div>
          <div class="pagination-controls">
            <button class="page-btn" id="prev-page" ${state.page <= 1 ? 'disabled' : ''}>&laquo;</button>
            ${Array.from({length:Math.min(totalPages,5)},(_,i)=>`<button class="page-btn ${i+1===state.page?'active':''}" data-page="${i+1}">${i+1}</button>`).join('')}
            <button class="page-btn" id="next-page" ${state.page >= totalPages ? 'disabled' : ''}>&raquo;</button>
          </div>
        </div>
      `}
    `;

    wrap.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => { state.page = parseInt(btn.dataset.page); loadData(); });
    });
    wrap.querySelector('#prev-page')?.addEventListener('click', () => { state.page--; loadData(); });
    wrap.querySelector('#next-page')?.addEventListener('click', () => { state.page++; loadData(); });

    wrap.querySelectorAll('.delete-lead').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({ title: 'Delete Lead', message: `Delete "${btn.dataset.name}"? This cannot be undone.` });
        if (ok) {
          await leadsService.delete(btn.dataset.id).catch(err => toast.error(err.message));
          toast.success('Lead deleted');
          loadData();
        }
      });
    });
  };

  const sortIcon = col => {
    if (state.sortCol !== col) return '<span class="sort-icon">↕</span>';
    return `<span class="sort-icon">${state.sortDir === 'asc' ? '↑' : '↓'}</span>`;
  };

  shell.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (state.sortCol === col) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; }
      else { state.sortCol = col; state.sortDir = 'desc'; }
      state.page = 1;
      loadData();
    });
  });

  const debouncedSearch = debounce(v => { state.search = v; state.page = 1; loadData(); }, 350);
  shell.querySelector('#lead-search').addEventListener('input', e => debouncedSearch(e.target.value));
  shell.querySelector('#filter-status').addEventListener('change', e => { state.status = e.target.value; state.page = 1; loadData(); });
  shell.querySelector('#filter-priority').addEventListener('change', e => { state.priority = e.target.value; state.page = 1; loadData(); });
  shell.querySelector('#filter-source').addEventListener('change', e => { state.source = e.target.value; state.page = 1; loadData(); });
  shell.querySelector('#clear-filters').addEventListener('click', () => {
    state.search = ''; state.status = ''; state.priority = ''; state.source = ''; state.page = 1;
    shell.querySelector('#lead-search').value = '';
    shell.querySelector('#filter-status').value = '';
    shell.querySelector('#filter-priority').value = '';
    shell.querySelector('#filter-source').value = '';
    loadData();
  });

  await loadData();
}
