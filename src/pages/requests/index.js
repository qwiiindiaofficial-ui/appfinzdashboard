import { requestsService } from '../../services/requests.js';
import { supabase } from '../../lib/supabase.js';
import { requestStatusBadge, priorityBadge, REQUEST_STATUSES } from '../../components/badge.js';
import { formatRelativeTime, escapeHtml } from '../../lib/utils.js';
import { toast } from '../../components/toast.js';

let activeTab = '';
let selectedRequest = null;

export async function render(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
  const profilesRes = await supabase.from('profiles').select('id,full_name').eq('is_active', true);
  const profiles = profilesRes.data || [];

  const shell = document.createElement('div');
  shell.className = 'page-content';
  shell.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h1>Client Requests</h1><p>Requests submitted via client portal</p></div>
    </div>
    <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm tab-filter active" data-status="">All</button>
      ${REQUEST_STATUSES.map(s => `<button class="btn btn-secondary btn-sm tab-filter" data-status="${s.value}">${s.label}</button>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 400px;gap:var(--space-5)">
      <div id="requests-list"></div>
      <div id="request-detail" style="display:none"></div>
    </div>
  `;
  container.innerHTML = '';
  container.appendChild(shell);

  const load = async () => {
    const listWrap = shell.querySelector('#requests-list');
    listWrap.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
    const { data } = await requestsService.getAll({ status: activeTab }).catch(() => ({ data: [] }));
    const requests = data || [];

    if (requests.length === 0) {
      listWrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><h3>No requests found</h3></div>`;
      return;
    }

    listWrap.innerHTML = `
      <div class="card" style="padding:0;overflow:hidden">
        ${requests.map(r => `
          <div class="request-row" data-id="${r.id}" style="padding:var(--space-4);border-bottom:1px solid var(--border-color);cursor:pointer;transition:background var(--transition-fast)">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-1)">
              <div>
                <span style="font-weight:var(--font-semibold);font-size:var(--text-sm)">${r.subject}</span>
                ${r.status === 'open' ? '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--color-primary-500);margin-left:6px;vertical-align:middle"></span>' : ''}
              </div>
              <div style="display:flex;gap:var(--space-1)">${requestStatusBadge(r.status)}</div>
            </div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
              <span>${r.client?.company_name || 'Unknown'}</span>
              ${r.project ? `<span>&bull;</span><span>${r.project.name}</span>` : ''}
              <span>&bull;</span><span>${formatRelativeTime(r.created_at)}</span>
              ${priorityBadge(r.priority)}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    listWrap.querySelectorAll('.request-row').forEach(row => {
      row.addEventListener('mouseenter', () => { row.style.background = 'var(--color-gray-50)'; });
      row.addEventListener('mouseleave', () => { row.style.background = ''; });
      row.addEventListener('click', async () => {
        listWrap.querySelectorAll('.request-row').forEach(r => r.style.background = '');
        row.style.background = 'var(--color-primary-50)';
        const req = await requestsService.getById(row.dataset.id);
        showDetail(req, profiles);
      });
    });
  };

  const showDetail = (req, profs) => {
    const detail = shell.querySelector('#request-detail');
    detail.style.display = '';
    detail.innerHTML = `
      <div class="card" style="position:sticky;top:76px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-4)">
          <div>
            <h3 style="font-size:var(--text-base)">${req.subject}</h3>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">${req.client?.company_name || ''} &bull; ${req.request_type.replace(/_/g,' ')}</div>
          </div>
          ${requestStatusBadge(req.status)}
        </div>

        <div style="background:var(--color-gray-50);padding:var(--space-4);border-radius:var(--border-radius);border:1px solid var(--border-color);margin-bottom:var(--space-4)">
          <p style="font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap">${escapeHtml(req.body)}</p>
        </div>

        <div class="form-group" style="margin-bottom:var(--space-3)">
          <label class="form-label">Status</label>
          <select id="req-status" class="form-select">
            ${REQUEST_STATUSES.map(s => `<option value="${s.value}" ${req.status===s.value?'selected':''}>${s.label}</option>`).join('')}
          </select>
        </div>

        <div class="form-group" style="margin-bottom:var(--space-3)">
          <label class="form-label">Assign To</label>
          <select id="req-assign" class="form-select">
            <option value="">Unassigned</option>
            ${profs.map(p => `<option value="${p.id}" ${req.assigned_to===p.id?'selected':''}>${p.full_name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group" style="margin-bottom:var(--space-3)">
          <label class="form-label">Resolution Note</label>
          <textarea id="req-note" class="form-textarea" rows="3" placeholder="How was this resolved...">${req.resolution_note || ''}</textarea>
        </div>

        <div style="display:flex;gap:var(--space-2);justify-content:flex-end">
          <button class="btn btn-secondary" id="close-detail">Close</button>
          <button class="btn btn-primary" id="save-req">Save</button>
        </div>
      </div>
    `;

    detail.querySelector('#close-detail').addEventListener('click', () => {
      detail.style.display = 'none';
      shell.querySelectorAll('.request-row').forEach(r => r.style.background = '');
    });

    detail.querySelector('#save-req').addEventListener('click', async () => {
      const newStatus = detail.querySelector('#req-status').value;
      const assignTo = detail.querySelector('#req-assign').value;
      const note = detail.querySelector('#req-note').value;
      await requestsService.update(req.id, {
        status: newStatus,
        assigned_to: assignTo || null,
        resolution_note: note || null,
        resolved_at: ['resolved','closed'].includes(newStatus) ? new Date().toISOString() : null,
      });
      toast.success('Request updated');
      load();
    });
  };

  shell.querySelectorAll('.tab-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.status;
      shell.querySelectorAll('.tab-filter').forEach(b => { b.classList.toggle('active', b === btn); b.classList.toggle('btn-primary', b === btn); b.classList.toggle('btn-secondary', b !== btn); });
      shell.querySelector('#request-detail').style.display = 'none';
      load();
    });
  });
  shell.querySelector('[data-status=""]').classList.add('btn-primary');
  shell.querySelector('[data-status=""]').classList.remove('btn-secondary');

  await load();
}
