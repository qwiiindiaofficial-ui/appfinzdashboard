import { leadsService } from '../../services/leads.js';
import { tasksService } from '../../services/tasks.js';
import { clientsService } from '../../services/clients.js';
import { supabase } from '../../lib/supabase.js';
import { leadStatusBadge, priorityBadge } from '../../components/badge.js';
import { formatCurrency, formatDate, formatRelativeTime, generateInitials, avatarColor, daysUntil, escapeHtml } from '../../lib/utils.js';
import { openModal, closeModal } from '../../components/modal.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { getState } from '../../lib/store.js';

const STATUSES = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal_sent', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

const activityIcons = {
  note: '📝', call: '📞', email: '✉️', meeting: '📅', status_change: '🔄', task: '✅', other: '💬',
};

export async function render(container, params = {}) {
  const load = async () => {
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
    try {
      const [lead, activities, tasks, profiles] = await Promise.all([
        leadsService.getById(params.id),
        leadsService.getActivities(params.id),
        tasksService.getAll({ leadId: params.id }).then(r => r.data),
        supabase.from('profiles').select('id,full_name').eq('is_active', true).then(r => r.data || []),
      ]);

      if (!lead) {
        container.innerHTML = `<div class="page-content"><div class="empty-state"><h3>Lead not found</h3><a href="#/leads" class="btn btn-primary">Back to Leads</a></div></div>`;
        return;
      }

      renderLead(lead, activities, tasks, profiles);
    } catch (err) {
      container.innerHTML = `<div class="page-content"><div class="empty-state"><h3>Error loading lead</h3><p>${err.message}</p></div></div>`;
    }
  };

  const renderLead = (lead, activities, tasks, profiles) => {
    const days = daysUntil(lead.expected_close);
    const currentStatusIdx = STATUSES.findIndex(s => s.key === lead.status);

    container.innerHTML = `
      <div class="page-content">
        <div class="page-header">
          <div class="page-header-left">
            <div style="display:flex;align-items:center;gap:var(--space-3)">
              <a href="#/leads" style="color:var(--text-muted);font-size:var(--text-sm)">&larr; Leads</a>
              <span style="color:var(--color-gray-300)">/</span>
              <span style="font-size:var(--text-sm);color:var(--text-muted)">${lead.full_name}</span>
            </div>
            <h1 style="margin-top:var(--space-2)">${lead.full_name}</h1>
            <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-2)">
              ${leadStatusBadge(lead.status)}
              ${priorityBadge(lead.priority)}
              ${lead.company_name ? `<span style="font-size:var(--text-sm);color:var(--text-muted)">${lead.company_name}</span>` : ''}
            </div>
          </div>
          <div class="page-header-actions">
            <a href="#/leads/${lead.id}/edit" class="btn btn-secondary">Edit</a>
            ${!lead.converted_at ? `<button class="btn btn-primary" id="convert-btn">Convert to Client</button>` : `<a href="#/clients/${lead.converted_to_client_id}" class="btn btn-success">View Client &rarr;</a>`}
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--space-5);padding:var(--space-4)">
          <div style="font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-3)">Pipeline Stage</div>
          <div class="status-stepper">
            ${STATUSES.filter(s => s.key !== 'lost').map((s, i) => `
              <div class="step ${i < currentStatusIdx ? 'completed' : ''} ${s.key === lead.status ? 'active' : ''}" data-status="${s.key}">
                <div class="step-circle">${i < currentStatusIdx ? '✓' : i + 1}</div>
                <div class="step-label">${s.label}</div>
              </div>
              ${i < STATUSES.filter(s => s.key !== 'lost').length - 1 ? `<div class="step-line ${i < currentStatusIdx ? 'completed' : ''}"></div>` : ''}
            `).join('')}
          </div>
          ${lead.status === 'lost' ? `<div style="text-align:center;margin-top:var(--space-3)"><span class="badge badge-red">Lost</span>${lead.lost_reason ? `<span style="font-size:var(--text-sm);color:var(--text-muted);margin-left:var(--space-2)">${lead.lost_reason}</span>` : ''}</div>` : ''}
        </div>

        <div style="display:grid;grid-template-columns:1fr 340px;gap:var(--space-5)">
          <div>
            <div class="card" style="margin-bottom:var(--space-5)">
              <div class="card-header">
                <div class="card-title">Contact Information</div>
              </div>
              <div class="detail-grid">
                <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${lead.email ? `<a href="mailto:${lead.email}">${lead.email}</a>` : '-'}</div></div>
                <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${lead.phone ? `<a href="tel:${lead.phone}">${lead.phone}</a>` : '-'}</div></div>
                <div class="detail-item"><div class="detail-label">Website</div><div class="detail-value">${lead.website ? `<a href="${lead.website}" target="_blank" rel="noopener">${lead.website}</a>` : '-'}</div></div>
                <div class="detail-item"><div class="detail-label">Industry</div><div class="detail-value">${lead.industry || '-'}</div></div>
                <div class="detail-item"><div class="detail-label">Source</div><div class="detail-value">${(lead.source || '').replace(/_/g,' ') || '-'}</div></div>
                <div class="detail-item"><div class="detail-label">Tags</div><div class="detail-value">${(lead.tags || []).map(t => `<span class="tag">${t}</span>`).join(' ') || '-'}</div></div>
                ${lead.notes ? `<div class="detail-item form-col-full"><div class="detail-label">Notes</div><div class="detail-value" style="white-space:pre-wrap">${escapeHtml(lead.notes)}</div></div>` : ''}
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <div class="card-title">Activity Timeline</div>
              </div>
              <div id="add-activity" style="margin-bottom:var(--space-5);padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--border-radius);border:1px solid var(--border-color)">
                <div style="font-size:var(--text-sm);font-weight:var(--font-medium);margin-bottom:var(--space-3)">Add Activity</div>
                <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-3);flex-wrap:wrap">
                  ${[['note','📝','Note'],['call','📞','Call'],['email','✉️','Email'],['meeting','📅','Meeting'],['other','💬','Other']].map(([t,i,l]) => `
                    <button class="btn btn-secondary btn-sm activity-type-btn" data-type="${t}">${i} ${l}</button>
                  `).join('')}
                </div>
                <input type="text" id="activity-title" class="form-input" placeholder="Title (optional)" style="margin-bottom:var(--space-2)">
                <textarea id="activity-content" class="form-textarea" rows="3" placeholder="Describe the activity..."></textarea>
                <div style="display:flex;justify-content:flex-end;margin-top:var(--space-2)">
                  <button class="btn btn-primary btn-sm" id="save-activity">Add Activity</button>
                </div>
              </div>
              <div id="timeline">
                ${renderTimeline(activities)}
              </div>
            </div>
          </div>

          <div>
            <div class="card" style="margin-bottom:var(--space-4)">
              <div class="card-header"><div class="card-title">Lead Value</div></div>
              <div style="text-align:center;padding:var(--space-4) 0">
                <div style="font-size:var(--text-3xl);font-weight:var(--font-bold);color:var(--text-primary)">${formatCurrency(lead.estimated_value, lead.currency)}</div>
                <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:var(--space-1)">Estimated Value</div>
              </div>
              ${lead.expected_close ? `
                <div style="border-top:1px solid var(--border-color);padding-top:var(--space-3);margin-top:var(--space-3)">
                  <div class="detail-label">Expected Close</div>
                  <div class="detail-value" style="margin-top:4px">${formatDate(lead.expected_close)}</div>
                  ${days !== null ? `<div style="font-size:var(--text-xs);margin-top:2px;color:${days < 0 ? 'var(--color-danger)' : days <= 7 ? 'var(--color-warning)' : 'var(--text-muted)'}">${days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due today' : `${days} days remaining`}</div>` : ''}
                </div>
              ` : ''}
            </div>

            ${lead.assigned_profile ? `
              <div class="card" style="margin-bottom:var(--space-4)">
                <div class="card-header"><div class="card-title">Assigned To</div></div>
                <div style="display:flex;align-items:center;gap:var(--space-3)">
                  <div class="user-avatar lg" style="background:${avatarColor(lead.assigned_profile.full_name)}">${generateInitials(lead.assigned_profile.full_name)}</div>
                  <div>
                    <div style="font-weight:var(--font-medium)">${lead.assigned_profile.full_name}</div>
                    <div style="font-size:var(--text-xs);color:var(--text-muted)">${lead.assigned_profile.email || ''}</div>
                  </div>
                </div>
              </div>
            ` : ''}

            <div class="card" style="margin-bottom:var(--space-4)">
              <div class="card-header">
                <div class="card-title">Tasks <span class="tab-count">${tasks.length}</span></div>
                <button class="btn btn-ghost btn-sm" id="add-task-btn">+ Add</button>
              </div>
              <div id="tasks-list">
                ${tasks.length === 0 ? `<div style="font-size:var(--text-sm);color:var(--text-muted);text-align:center;padding:var(--space-4)">No tasks yet</div>` : ''}
                ${tasks.map(t => `
                  <div style="display:flex;align-items:flex-start;gap:var(--space-2);padding:var(--space-2) 0;border-bottom:1px solid var(--border-color)">
                    <input type="checkbox" class="task-check" data-id="${t.id}" ${t.status === 'completed' ? 'checked' : ''} style="margin-top:3px;cursor:pointer">
                    <div style="flex:1;min-width:0">
                      <div style="font-size:var(--text-sm);font-weight:var(--font-medium);${t.status === 'completed' ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${t.title}</div>
                      ${t.due_date ? `<div style="font-size:var(--text-xs);color:${new Date(t.due_date) < new Date() && t.status !== 'completed' ? 'var(--color-danger)' : 'var(--text-muted)'}">Due ${formatDate(t.due_date)}</div>` : ''}
                    </div>
                    ${priorityBadge(t.priority)}
                  </div>
                `).join('')}
              </div>
              <div id="add-task-form" style="display:none;margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--border-color)">
                <div class="form-group" style="margin-bottom:var(--space-2)">
                  <input type="text" id="task-title" class="form-input" placeholder="Task title">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-2)">
                  <select id="task-type" class="form-select">
                    ${[['follow_up','Follow Up'],['call','Call'],['email','Email'],['meeting','Meeting'],['demo','Demo'],['proposal','Proposal'],['other','Other']].map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
                  </select>
                  <select id="task-priority" class="form-select">
                    ${[['low','Low'],['medium','Medium'],['high','High'],['urgent','Urgent']].map(([v,l]) => `<option value="${v}" ${v === 'medium' ? 'selected' : ''}>${l}</option>`).join('')}
                  </select>
                </div>
                <input type="date" id="task-due" class="form-input" style="margin-bottom:var(--space-2)">
                <select id="task-assign" class="form-select" style="margin-bottom:var(--space-2)">
                  <option value="">Unassigned</option>
                  ${profiles.map(p => `<option value="${p.id}">${p.full_name}</option>`).join('')}
                </select>
                <div style="display:flex;gap:var(--space-2);justify-content:flex-end">
                  <button class="btn btn-secondary btn-sm" id="cancel-task">Cancel</button>
                  <button class="btn btn-primary btn-sm" id="save-task">Add Task</button>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header"><div class="card-title">Meta</div></div>
              <div style="display:flex;flex-direction:column;gap:var(--space-3)">
                <div><div class="detail-label">Created</div><div class="detail-value" style="font-size:var(--text-sm)">${formatDate(lead.created_at)}</div></div>
                <div><div class="detail-label">Last Updated</div><div class="detail-value" style="font-size:var(--text-sm)">${formatDate(lead.updated_at)}</div></div>
                ${lead.converted_at ? `<div><div class="detail-label">Converted</div><div class="detail-value" style="font-size:var(--text-sm)">${formatDate(lead.converted_at)}</div></div>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    let selectedActivityType = 'note';
    container.querySelectorAll('.activity-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedActivityType = btn.dataset.type;
        container.querySelectorAll('.activity-type-btn').forEach(b => b.classList.remove('btn-primary'));
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
      });
    });
    container.querySelector('.activity-type-btn').classList.add('btn-primary');
    container.querySelector('.activity-type-btn').classList.remove('btn-secondary');

    container.querySelector('#save-activity').addEventListener('click', async () => {
      const content = container.querySelector('#activity-content').value.trim();
      if (!content) return toast.warning('Please enter activity details');
      try {
        await leadsService.addActivity(lead.id, {
          activity_type: selectedActivityType,
          title: container.querySelector('#activity-title').value.trim() || null,
          content,
        });
        container.querySelector('#activity-content').value = '';
        container.querySelector('#activity-title').value = '';
        const updated = await leadsService.getActivities(lead.id);
        container.querySelector('#timeline').innerHTML = renderTimeline(updated);
        toast.success('Activity added');
      } catch (err) { toast.error(err.message); }
    });

    container.querySelectorAll('.step').forEach(step => {
      step.addEventListener('click', async () => {
        const newStatus = step.dataset.status;
        if (newStatus === lead.status) return;
        openModal({
          title: 'Update Status',
          content: `<p>Change status from <strong>${lead.status}</strong> to <strong>${newStatus}</strong>?</p>
            ${newStatus === 'lost' ? `<div style="margin-top:var(--space-3)"><label class="form-label">Lost Reason (optional)</label><textarea id="lost-reason-input" class="form-textarea" rows="2"></textarea></div>` : ''}`,
          confirmText: 'Update',
          onConfirm: async () => {
            const lostReason = newStatus === 'lost' ? document.querySelector('#lost-reason-input')?.value : null;
            await leadsService.update(lead.id, { status: newStatus, ...(lostReason ? { lost_reason: lostReason } : {}) });
            closeModal();
            toast.success('Status updated');
            load();
          },
        });
      });
    });

    container.querySelector('#add-task-btn')?.addEventListener('click', () => {
      container.querySelector('#add-task-form').style.display = '';
    });
    container.querySelector('#cancel-task')?.addEventListener('click', () => {
      container.querySelector('#add-task-form').style.display = 'none';
    });
    container.querySelector('#save-task')?.addEventListener('click', async () => {
      const title = container.querySelector('#task-title').value.trim();
      if (!title) return toast.warning('Enter a task title');
      try {
        await tasksService.create({
          lead_id: lead.id,
          title,
          task_type: container.querySelector('#task-type').value,
          priority: container.querySelector('#task-priority').value,
          due_date: container.querySelector('#task-due').value || null,
          assigned_to: container.querySelector('#task-assign').value || null,
        });
        toast.success('Task added');
        load();
      } catch (err) { toast.error(err.message); }
    });

    container.querySelectorAll('.task-check').forEach(cb => {
      cb.addEventListener('change', async e => {
        if (e.target.checked) {
          await tasksService.complete(e.target.dataset.id).catch(err => toast.error(err.message));
        }
      });
    });

    container.querySelector('#convert-btn')?.addEventListener('click', () => showConvertModal(lead, profiles));
  };

  const renderTimeline = (activities) => {
    if (!activities || activities.length === 0) return `<div style="text-align:center;padding:var(--space-8);color:var(--text-muted);font-size:var(--text-sm)">No activities yet</div>`;
    return `<div class="timeline">${activities.map(a => `
      <div class="timeline-item">
        <div class="timeline-icon ${a.activity_type}">${activityIcons[a.activity_type] || '💬'}</div>
        <div class="timeline-content">
          <div class="timeline-header">
            <div class="timeline-title">${a.title || (a.activity_type === 'status_change' ? `Status: ${a.old_status} → ${a.new_status}` : a.activity_type.replace(/_/g,' '))}</div>
            <div class="timeline-time">${formatRelativeTime(a.created_at)}</div>
          </div>
          <div class="timeline-body">${escapeHtml(a.content)}</div>
          ${a.created_by_profile ? `<div class="timeline-author">by ${a.created_by_profile.full_name}</div>` : ''}
        </div>
      </div>
    `).join('')}</div>`;
  };

  const showConvertModal = (lead, profiles) => {
    openModal({
      title: 'Convert Lead to Client',
      size: 'lg',
      content: `
        <p style="color:var(--text-muted);margin-bottom:var(--space-5)">This will create a new client record from this lead. The lead status will be set to "Won".</p>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label required">Company Name</label>
            <input type="text" id="c-company" class="form-input" value="${lead.company_name || ''}">
          </div>
          <div class="form-group">
            <label class="form-label required">Contact Name</label>
            <input type="text" id="c-contact" class="form-input" value="${lead.full_name}">
          </div>
          <div class="form-group">
            <label class="form-label required">Email</label>
            <input type="email" id="c-email" class="form-input" value="${lead.email || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input type="tel" id="c-phone" class="form-input" value="${lead.phone || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Industry</label>
            <input type="text" id="c-industry" class="form-input" value="${lead.industry || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Company Size</label>
            <select id="c-size" class="form-select">
              <option value="">Select size</option>
              ${['1-10','11-50','51-200','201-500','500+'].map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Account Manager</label>
            <select id="c-manager" class="form-select">
              <option value="">Unassigned</option>
              ${profiles.map(p => `<option value="${p.id}">${p.full_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">City</label>
            <input type="text" id="c-city" class="form-input">
          </div>
        </div>
      `,
      confirmText: 'Convert to Client',
      confirmClass: 'btn-success',
      onConfirm: async () => {
        const company = document.querySelector('#c-company')?.value.trim();
        const contact = document.querySelector('#c-contact')?.value.trim();
        const email = document.querySelector('#c-email')?.value.trim();
        if (!company || !contact || !email) return toast.warning('Company, contact name and email are required');
        try {
          const client = await leadsService.convertToClient(lead.id, {
            company_name: company,
            contact_name: contact,
            email,
            phone: document.querySelector('#c-phone')?.value || null,
            industry: document.querySelector('#c-industry')?.value || null,
            company_size: document.querySelector('#c-size')?.value || null,
            account_manager: document.querySelector('#c-manager')?.value || null,
            city: document.querySelector('#c-city')?.value || null,
          });
          closeModal();
          toast.success('Lead converted to client!');
          window.location.hash = `#/clients/${client.id}`;
        } catch (err) { toast.error(err.message); }
      },
    });
  };

  await load();
}
