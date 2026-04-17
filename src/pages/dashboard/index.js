import { supabase } from '../../lib/supabase.js';
import { leadsService } from '../../services/leads.js';
import { clientsService } from '../../services/clients.js';
import { invoicesService } from '../../services/invoices.js';
import { requestsService } from '../../services/requests.js';
import { tasksService } from '../../services/tasks.js';
import { getState } from '../../lib/store.js';
import { formatCurrency, formatDate, formatRelativeTime, generateInitials, avatarColor } from '../../lib/utils.js';
import { leadStatusBadge, priorityBadge, requestStatusBadge } from '../../components/badge.js';
import { navigate } from '../../router/index.js';

export async function render(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  const profile = getState('currentProfile');

  const [leadStats, clientStats, invoiceStats, requestStats, recentLeads, myTasks, recentRequests] = await Promise.all([
    leadsService.getStats().catch(() => ({})),
    clientsService.getStats().catch(() => ({})),
    invoicesService.getStats().catch(() => ({})),
    requestsService.getStats().catch(() => ({})),
    leadsService.getAll({ page: 1, perPage: 6, sortCol: 'created_at', sortDir: 'desc' }).catch(() => ({ data: [] })),
    tasksService.getAll({ assignedTo: profile?.id, status: 'pending', perPage: 5 }).catch(() => ({ data: [] })),
    requestsService.getAll({ status: 'open', perPage: 5 }).catch(() => ({ data: [] })),
  ]);

  const totalLeads = Object.values(leadStats).reduce((a, b) => a + b, 0);
  const wonLeads = leadStats.won || 0;
  const activeClients = clientStats.active || 0;
  const openRequests = requestStats.open || 0;

  const pipelineStages = [
    { key: 'new', label: 'New', count: leadStats.new || 0 },
    { key: 'contacted', label: 'Contacted', count: leadStats.contacted || 0 },
    { key: 'qualified', label: 'Qualified', count: leadStats.qualified || 0 },
    { key: 'proposal_sent', label: 'Proposal', count: leadStats.proposal_sent || 0 },
    { key: 'negotiation', label: 'Negotiation', count: leadStats.negotiation || 0 },
    { key: 'won', label: 'Won', count: leadStats.won || 0 },
  ];
  const maxCount = Math.max(...pipelineStages.map(s => s.count), 1);

  container.innerHTML = `
    <div class="page-content">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Welcome back, ${profile?.full_name?.split(' ')[0] || 'there'}</h1>
          <p>Here's what's happening with your CRM today.</p>
        </div>
        <div class="page-header-actions">
          <a href="#/leads/new" class="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Lead
          </a>
        </div>
      </div>

      <div class="stats-grid" style="margin-bottom:var(--space-6)">
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${totalLeads}</div>
            <div class="stat-label">Total Leads</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${wonLeads}</div>
            <div class="stat-label">Leads Won</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon cyan">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${activeClients}</div>
            <div class="stat-label">Active Clients</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${formatCurrency(invoiceStats.total_revenue || 0)}</div>
            <div class="stat-label">Revenue (Paid)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${openRequests}</div>
            <div class="stat-label">Open Requests</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${(myTasks.data || []).length}</div>
            <div class="stat-label">My Pending Tasks</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);margin-bottom:var(--space-5)">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Lead Pipeline</div>
              <div class="card-subtitle">${totalLeads} total leads</div>
            </div>
            <a href="#/leads" class="btn btn-secondary btn-sm">View All</a>
          </div>
          <div>
            ${pipelineStages.map(s => `
              <div style="margin-bottom:var(--space-3)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-1)">
                  <span style="font-size:var(--text-sm);color:var(--text-secondary)">${s.label}</span>
                  <span style="font-size:var(--text-sm);font-weight:var(--font-semibold);color:var(--text-primary)">${s.count}</span>
                </div>
                <div class="progress-bar-wrap">
                  <div class="progress-bar" style="width:${(s.count / maxCount * 100).toFixed(1)}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">My Tasks</div>
              <div class="card-subtitle">Pending tasks assigned to you</div>
            </div>
            <a href="#/tasks" class="btn btn-secondary btn-sm">View All</a>
          </div>
          ${(myTasks.data || []).length === 0 ? `
            <div style="text-align:center;padding:var(--space-8);color:var(--text-muted);font-size:var(--text-sm)">
              No pending tasks
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:var(--space-3)">
              ${(myTasks.data || []).map(t => `
                <div style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--border-color);border-radius:var(--border-radius)">
                  <input type="checkbox" class="task-check" data-id="${t.id}" style="margin-top:2px;cursor:pointer;width:16px;height:16px;flex-shrink:0">
                  <div style="flex:1;min-width:0">
                    <div style="font-size:var(--text-sm);font-weight:var(--font-medium);color:var(--text-primary)">${t.title}</div>
                    ${t.due_date ? `<div style="font-size:var(--text-xs);color:${new Date(t.due_date) < new Date() ? 'var(--color-danger)' : 'var(--text-muted)'}">Due ${formatDate(t.due_date)}</div>` : ''}
                  </div>
                  ${priorityBadge(t.priority)}
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Recent Leads</div>
            <a href="#/leads" class="btn btn-secondary btn-sm">View All</a>
          </div>
          ${(recentLeads.data || []).length === 0 ? `
            <div style="text-align:center;padding:var(--space-8);color:var(--text-muted);font-size:var(--text-sm)">No leads yet. <a href="#/leads/new">Add your first lead</a></div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:0">
              ${(recentLeads.data || []).map(l => `
                <a href="#/leads/${l.id}" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--border-color);text-decoration:none">
                  <div class="user-avatar" style="background:${avatarColor(l.full_name)};flex-shrink:0">${generateInitials(l.full_name)}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:var(--text-sm);font-weight:var(--font-medium);color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.full_name}</div>
                    <div style="font-size:var(--text-xs);color:var(--text-muted)">${l.company_name || 'No company'}</div>
                  </div>
                  ${leadStatusBadge(l.status)}
                </a>
              `).join('')}
            </div>
          `}
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Recent Requests</div>
            <a href="#/requests" class="btn btn-secondary btn-sm">View All</a>
          </div>
          ${(recentRequests.data || []).length === 0 ? `
            <div style="text-align:center;padding:var(--space-8);color:var(--text-muted);font-size:var(--text-sm)">No open requests</div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:0">
              ${(recentRequests.data || []).map(r => `
                <div style="padding:var(--space-3) 0;border-bottom:1px solid var(--border-color)">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                    <span style="font-size:var(--text-sm);font-weight:var(--font-medium);color:var(--text-primary)">${r.subject}</span>
                    ${requestStatusBadge(r.status)}
                  </div>
                  <div style="font-size:var(--text-xs);color:var(--text-muted)">${r.client?.company_name || ''} &bull; ${formatRelativeTime(r.created_at)}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.task-check').forEach(cb => {
    cb.addEventListener('change', async e => {
      if (e.target.checked) {
        const { tasksService } = await import('../../services/tasks.js');
        await tasksService.complete(e.target.dataset.id).catch(() => {});
        e.target.closest('[style*="border"]').style.opacity = '0.5';
      }
    });
  });
}
