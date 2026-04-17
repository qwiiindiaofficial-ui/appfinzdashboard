import { invoicesService } from '../../services/invoices.js';
import { invoiceStatusBadge, INVOICE_STATUSES } from '../../components/badge.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';

let state = { page: 1, status: '', total: 0 };
const PER_PAGE = 25;

export async function render(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
  const shell = document.createElement('div');
  shell.className = 'page-content';
  shell.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h1>Invoices</h1></div>
      <div class="page-header-actions">
        <a href="#/invoices/new" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Invoice
        </a>
      </div>
    </div>
    <div id="inv-stats" style="margin-bottom:var(--space-5)"></div>
    <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm tab-filter active" data-status="">All</button>
      ${INVOICE_STATUSES.map(s => `<button class="btn btn-secondary btn-sm tab-filter" data-status="${s.value}">${s.label}</button>`).join('')}
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div id="table-wrap"></div>
    </div>
  `;
  container.innerHTML = '';
  container.appendChild(shell);

  const loadStats = async () => {
    const stats = await invoicesService.getStats().catch(() => ({}));
    shell.querySelector('#inv-stats').innerHTML = `
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
        ${[['Total Revenue', formatCurrency(stats.total_revenue||0), 'var(--color-success)'],['Outstanding', formatCurrency(stats.outstanding||0), 'var(--color-warning)'],['Paid', stats.paid||0, 'var(--color-success)'],['Overdue', stats.overdue||0, 'var(--color-danger)'],['Draft', stats.draft||0, 'var(--color-gray-400)']].map(([l,v,c]) => `
          <div class="stat-card" style="flex:1;min-width:150px;padding:var(--space-3) var(--space-4)">
            <div class="stat-info">
              <div class="stat-value" style="color:${c};font-size:var(--text-xl)">${v}</div>
              <div class="stat-label">${l}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  const load = async () => {
    const wrap = shell.querySelector('#table-wrap');
    wrap.innerHTML = `<div class="loading-state" style="padding:var(--space-12)"><div class="spinner"></div></div>`;
    const { data, count } = await invoicesService.getAll({ status: state.status, page: state.page, perPage: PER_PAGE }).catch(() => ({ data: [], count: 0 }));
    state.total = count || 0;

    if (!data || data.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><h3>No invoices found</h3><a href="#/invoices/new" class="btn btn-primary">Create Invoice</a></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="data-table-wrap" style="border:none;border-radius:0">
        <table class="data-table">
          <thead><tr><th>Invoice #</th><th>Client</th><th>Date</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${data.map(inv => `
              <tr>
                <td><a class="table-link" href="#/invoices/${inv.id}">${inv.invoice_number}</a></td>
                <td>${inv.client ? `<a href="#/clients/${inv.client.id}" style="color:var(--text-secondary);font-size:var(--text-sm)">${inv.client.company_name}</a>` : '-'}</td>
                <td><span class="td-muted">${formatDate(inv.invoice_date)}</span></td>
                <td><span class="td-muted" style="${inv.status==='overdue'?'color:var(--color-danger)':''}">${formatDate(inv.due_date)}</span></td>
                <td style="font-weight:var(--font-semibold)">${formatCurrency(inv.total, inv.currency)}</td>
                <td>${formatCurrency(inv.amount_paid, inv.currency)}</td>
                <td>${invoiceStatusBadge(inv.status)}</td>
                <td>
                  <div class="table-actions">
                    <a href="#/invoices/${inv.id}" class="btn btn-ghost btn-sm">View</a>
                    <a href="#/invoices/${inv.id}/edit" class="btn btn-ghost btn-icon btn-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></a>
                    <button class="btn btn-ghost btn-icon btn-sm del-inv" data-id="${inv.id}" data-num="${inv.invoice_number}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    wrap.querySelectorAll('.del-inv').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({ title: 'Delete Invoice', message: `Delete invoice ${btn.dataset.num}?` });
        if (ok) { await invoicesService.delete(btn.dataset.id); toast.success('Invoice deleted'); load(); }
      });
    });
  };

  shell.querySelectorAll('.tab-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      state.status = btn.dataset.status;
      shell.querySelectorAll('.tab-filter').forEach(b => { b.classList.toggle('active', b === btn); b.classList.toggle('btn-primary', b === btn); b.classList.toggle('btn-secondary', b !== btn); });
      load();
    });
  });
  shell.querySelector('[data-status=""]').classList.add('btn-primary');
  shell.querySelector('[data-status=""]').classList.remove('btn-secondary');

  await Promise.all([loadStats(), load()]);
}
