import { clientsService } from '../../services/clients.js';
import { projectsService } from '../../services/projects.js';
import { invoicesService } from '../../services/invoices.js';
import { communicationsService } from '../../services/communications.js';
import { supabase } from '../../lib/supabase.js';
import { clientStatusBadge, projectStatusBadge, invoiceStatusBadge } from '../../components/badge.js';
import { formatCurrency, formatDate, formatRelativeTime, generateInitials, avatarColor, copyToClipboard } from '../../lib/utils.js';
import { toast } from '../../components/toast.js';
import { confirmDialog } from '../../components/modal.js';

export async function render(container, params = {}) {
  let activeTab = 'overview';

  const load = async () => {
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
    try {
      const client = await clientsService.getById(params.id);
      if (!client) {
        container.innerHTML = `<div class="page-content"><div class="empty-state"><h3>Client not found</h3><a href="#/clients" class="btn btn-primary">Back</a></div></div>`;
        return;
      }
      renderClient(client);
    } catch (err) {
      container.innerHTML = `<div class="page-content"><div class="empty-state"><h3>Error</h3><p>${err.message}</p></div></div>`;
    }
  };

  const renderClient = (client) => {
    container.innerHTML = `
      <div class="page-content">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
          <a href="#/clients" style="color:var(--text-muted);font-size:var(--text-sm)">&larr; Clients</a>
        </div>
        <div class="card" style="margin-bottom:var(--space-5)">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4)">
            <div style="display:flex;align-items:center;gap:var(--space-4)">
              <div class="user-avatar" style="width:56px;height:56px;font-size:var(--text-xl);background:${avatarColor(client.company_name)}">${generateInitials(client.company_name)}</div>
              <div>
                <h2>${client.company_name}</h2>
                <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:4px">${client.contact_name} &bull; ${client.email}</div>
                <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-2)">
                  ${clientStatusBadge(client.status)}
                  ${client.industry ? `<span class="badge badge-gray">${client.industry}</span>` : ''}
                  ${client.portal_enabled ? `<span class="badge badge-green">Portal Active</span>` : ''}
                </div>
              </div>
            </div>
            <div style="display:flex;gap:var(--space-2)">
              <a href="#/clients/${client.id}/edit" class="btn btn-secondary">Edit</a>
              <a href="#/invoices/new?client_id=${client.id}" class="btn btn-secondary">New Invoice</a>
              <a href="#/projects/new?client_id=${client.id}" class="btn btn-primary">New Project</a>
            </div>
          </div>
        </div>

        <div class="tabs">
          ${[['overview','Overview'],['projects','Projects'],['invoices','Invoices'],['comms','Communications'],['portal','Portal']].map(([t,l]) => `
            <button class="tab-btn ${activeTab===t?'active':''}" data-tab="${t}">${l}</button>
          `).join('')}
        </div>
        <div id="tab-content"></div>
      </div>
    `;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
        loadTab(client);
      });
    });

    loadTab(client);
  };

  const loadTab = async (client) => {
    const tc = container.querySelector('#tab-content');
    tc.innerHTML = `<div class="loading-state" style="padding:var(--space-8)"><div class="spinner"></div></div>`;

    if (activeTab === 'overview') {
      tc.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 320px;gap:var(--space-5)">
          <div>
            <div class="card" style="margin-bottom:var(--space-4)">
              <div class="card-header"><div class="card-title">Contact Details</div></div>
              <div class="detail-grid">
                <div class="detail-item"><div class="detail-label">Contact Name</div><div class="detail-value">${client.contact_name}</div></div>
                <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value"><a href="mailto:${client.email}">${client.email}</a></div></div>
                <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${client.phone ? `<a href="tel:${client.phone}">${client.phone}</a>` : '-'}</div></div>
                <div class="detail-item"><div class="detail-label">Website</div><div class="detail-value">${client.website ? `<a href="${client.website}" target="_blank">${client.website}</a>` : '-'}</div></div>
                <div class="detail-item"><div class="detail-label">Industry</div><div class="detail-value">${client.industry || '-'}</div></div>
                <div class="detail-item"><div class="detail-label">Company Size</div><div class="detail-value">${client.company_size ? client.company_size + ' employees' : '-'}</div></div>
                <div class="detail-item form-col-full"><div class="detail-label">Address</div><div class="detail-value">${[client.address_line1, client.address_line2, client.city, client.state, client.postal_code, client.country].filter(Boolean).join(', ') || '-'}</div></div>
                ${client.notes ? `<div class="detail-item form-col-full"><div class="detail-label">Notes</div><div class="detail-value" style="white-space:pre-wrap">${client.notes}</div></div>` : ''}
              </div>
            </div>
          </div>
          <div>
            ${client.account_manager_profile ? `
              <div class="card" style="margin-bottom:var(--space-4)">
                <div class="card-header"><div class="card-title">Account Manager</div></div>
                <div style="display:flex;align-items:center;gap:var(--space-3)">
                  <div class="user-avatar lg" style="background:${avatarColor(client.account_manager_profile.full_name)}">${generateInitials(client.account_manager_profile.full_name)}</div>
                  <div>
                    <div style="font-weight:var(--font-medium)">${client.account_manager_profile.full_name}</div>
                    <div style="font-size:var(--text-xs);color:var(--text-muted)">${client.account_manager_profile.email || ''}</div>
                  </div>
                </div>
              </div>
            ` : ''}
            ${client.source_lead ? `
              <div class="card" style="margin-bottom:var(--space-4)">
                <div class="card-header"><div class="card-title">Converted From</div></div>
                <a href="#/leads/${client.source_lead.id}" class="table-link" style="font-size:var(--text-sm)">${client.source_lead.full_name}</a>
              </div>
            ` : ''}
            <div class="card">
              <div class="card-header"><div class="card-title">Meta</div></div>
              <div style="display:flex;flex-direction:column;gap:var(--space-3)">
                <div><div class="detail-label">Client Since</div><div class="detail-value" style="font-size:var(--text-sm)">${formatDate(client.created_at)}</div></div>
                <div><div class="detail-label">Last Updated</div><div class="detail-value" style="font-size:var(--text-sm)">${formatDate(client.updated_at)}</div></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (activeTab === 'projects') {
      const { data: projects } = await projectsService.getAll({ clientId: client.id }).catch(() => ({ data: [] }));
      tc.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-4)">
          <a href="#/projects/new?client_id=${client.id}" class="btn btn-primary">+ New Project</a>
        </div>
        ${projects.length === 0 ? `<div class="empty-state"><div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div><h3>No projects yet</h3><a href="#/projects/new?client_id=${client.id}" class="btn btn-primary">Create First Project</a></div>` : `
          <div style="display:flex;flex-direction:column;gap:var(--space-3)">
            ${projects.map(p => `
              <a href="#/projects/${p.id}" style="display:block;text-decoration:none">
                <div class="card" style="padding:var(--space-4)">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
                    <div>
                      <div style="font-weight:var(--font-semibold);color:var(--text-primary)">${p.name}</div>
                      <div style="font-size:var(--text-xs);color:var(--text-muted)">${p.project_type.replace(/_/g,' ')}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:var(--space-2)">${projectStatusBadge(p.status)}</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:var(--space-3)">
                    <div style="flex:1">
                      <div class="progress-bar-wrap">
                        <div class="progress-bar" style="width:${p.progress_pct}%"></div>
                      </div>
                    </div>
                    <span style="font-size:var(--text-sm);font-weight:var(--font-semibold);color:var(--text-primary);min-width:35px;text-align:right">${p.progress_pct}%</span>
                  </div>
                  ${p.end_date ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2)">Due: ${formatDate(p.end_date)}</div>` : ''}
                </div>
              </a>
            `).join('')}
          </div>
        `}
      `;
    }

    if (activeTab === 'invoices') {
      const { data: invs } = await invoicesService.getAll({ clientId: client.id }).catch(() => ({ data: [] }));
      tc.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-4)">
          <a href="#/invoices/new?client_id=${client.id}" class="btn btn-primary">+ New Invoice</a>
        </div>
        ${invs.length === 0 ? `<div class="empty-state"><h3>No invoices yet</h3></div>` : `
          <div class="data-table-wrap">
            <table class="data-table">
              <thead><tr><th>Invoice #</th><th>Date</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Status</th><th></th></tr></thead>
              <tbody>
                ${invs.map(inv => `
                  <tr>
                    <td><a class="table-link" href="#/invoices/${inv.id}">${inv.invoice_number}</a></td>
                    <td><span class="td-muted">${formatDate(inv.invoice_date)}</span></td>
                    <td><span class="td-muted">${formatDate(inv.due_date)}</span></td>
                    <td>${formatCurrency(inv.total, inv.currency)}</td>
                    <td>${formatCurrency(inv.amount_paid, inv.currency)}</td>
                    <td>${invoiceStatusBadge(inv.status)}</td>
                    <td><a href="#/invoices/${inv.id}" class="btn btn-ghost btn-sm">View</a></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      `;
    }

    if (activeTab === 'comms') {
      const comms = await communicationsService.getByClient(client.id).catch(() => []);
      tc.innerHTML = `
        <div class="card" style="margin-bottom:var(--space-4)">
          <div class="card-header"><div class="card-title">Log Communication</div></div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Channel</label>
              <select id="comm-channel" class="form-select">
                ${['email','phone','meeting','whatsapp','slack','other'].map(c => `<option value="${c}">${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Direction</label>
              <select id="comm-dir" class="form-select">
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
            <div class="form-group form-col-full">
              <label class="form-label">Subject</label>
              <input type="text" id="comm-subject" class="form-input" placeholder="Subject">
            </div>
            <div class="form-group form-col-full">
              <label class="form-label">Details</label>
              <textarea id="comm-body" class="form-textarea" rows="3" placeholder="What was discussed..."></textarea>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:var(--space-3)">
            <button class="btn btn-primary" id="save-comm">Log Communication</button>
          </div>
        </div>
        ${comms.length === 0 ? `<div class="empty-state"><h3>No communications yet</h3></div>` : `
          <div style="display:flex;flex-direction:column;gap:var(--space-3)">
            ${comms.map(c => `
              <div class="card" style="padding:var(--space-4)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                  <div>
                    <span class="badge badge-blue">${c.channel}</span>
                    <span class="badge badge-gray" style="margin-left:var(--space-1)">${c.direction}</span>
                    ${c.subject ? `<span style="font-weight:var(--font-medium);font-size:var(--text-sm);margin-left:var(--space-2)">${c.subject}</span>` : ''}
                  </div>
                  <span style="font-size:var(--text-xs);color:var(--text-muted)">${formatRelativeTime(c.created_at)}</span>
                </div>
                ${c.body ? `<p style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:var(--space-2)">${c.body}</p>` : ''}
                ${c.author ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-1)">by ${c.author.full_name}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      `;

      tc.querySelector('#save-comm')?.addEventListener('click', async () => {
        const body = tc.querySelector('#comm-body').value.trim();
        if (!body) return toast.warning('Please enter communication details');
        try {
          await communicationsService.create({
            client_id: client.id,
            channel: tc.querySelector('#comm-channel').value,
            direction: tc.querySelector('#comm-dir').value,
            subject: tc.querySelector('#comm-subject').value || null,
            body,
          });
          toast.success('Communication logged');
          loadTab(client);
        } catch (err) { toast.error(err.message); }
      });
    }

    if (activeTab === 'portal') {
      const tokens = await clientsService.getPortalTokens(client.id).catch(() => []);
      tc.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 340px;gap:var(--space-5);align-items:start">
          <div>
            <div class="card" style="margin-bottom:var(--space-4)">
              <div class="card-header" style="flex-wrap:wrap;gap:var(--space-3)">
                <div>
                  <div class="card-title">Portal Links</div>
                  <div class="card-subtitle">Generate a unique link and share it with your client</div>
                </div>
                <button class="btn btn-primary" id="gen-token">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Generate Link
                </button>
              </div>
              ${tokens.length === 0 ? `
                <div style="text-align:center;padding:var(--space-8);color:var(--text-muted);font-size:var(--text-sm)">
                  <div style="font-size:32px;margin-bottom:var(--space-2)">🔗</div>
                  No portal links yet. Click "Generate Link" to create one and share with your client.
                </div>
              ` : `
                <div style="display:flex;flex-direction:column;gap:var(--space-3)">
                  ${tokens.map(t => {
                    const url = `${window.location.origin}${window.location.pathname}#/portal/${t.token}`;
                    return `
                      <div style="border:1px solid var(--border-color);border-radius:var(--border-radius);padding:var(--space-4);background:${t.is_active ? 'white' : 'var(--color-gray-50)'}">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)">
                          <div style="display:flex;align-items:center;gap:var(--space-2)">
                            <span style="font-weight:var(--font-medium);font-size:var(--text-sm)">${t.label || 'Portal Link'}</span>
                            <span class="badge ${t.is_active ? 'badge-green' : 'badge-gray'}">${t.is_active ? 'Active' : 'Revoked'}</span>
                          </div>
                          <div style="display:flex;gap:var(--space-2)">
                            ${t.is_active ? `<button class="btn btn-secondary btn-sm copy-link" data-url="${url}">Copy Link</button>` : ''}
                            ${t.is_active ? `<button class="btn btn-ghost btn-sm revoke-token" data-id="${t.id}" style="color:var(--color-danger)">Revoke</button>` : ''}
                          </div>
                        </div>
                        <div style="font-size:var(--text-xs);color:var(--text-muted);background:var(--color-gray-50);padding:var(--space-2) var(--space-3);border-radius:var(--border-radius);font-family:monospace;word-break:break-all">${url}</div>
                        <div style="display:flex;gap:var(--space-4);margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-muted)">
                          <span>Viewed ${t.access_count || 0} times</span>
                          ${t.last_accessed ? `<span>Last opened: ${formatRelativeTime(t.last_accessed)}</span>` : '<span>Never opened</span>'}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          </div>

          <div>
            <div class="card" style="background:var(--color-primary-50);border-color:var(--color-primary-200)">
              <div class="card-title" style="color:var(--color-primary-700);margin-bottom:var(--space-3)">How the Portal Works</div>
              <div style="display:flex;flex-direction:column;gap:var(--space-4)">
                <div style="display:flex;gap:var(--space-3)">
                  <div style="width:24px;height:24px;background:var(--color-primary-600);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);font-weight:var(--font-bold);flex-shrink:0">1</div>
                  <div>
                    <div style="font-weight:var(--font-semibold);font-size:var(--text-sm);color:var(--text-primary)">Generate a link</div>
                    <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:2px">Click "Generate Link" to create a unique, secure URL for this client.</div>
                  </div>
                </div>
                <div style="display:flex;gap:var(--space-3)">
                  <div style="width:24px;height:24px;background:var(--color-primary-600);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);font-weight:var(--font-bold);flex-shrink:0">2</div>
                  <div>
                    <div style="font-weight:var(--font-semibold);font-size:var(--text-sm);color:var(--text-primary)">Share with client</div>
                    <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:2px">Copy the link and send it via WhatsApp, email, or any channel. No login required for the client.</div>
                  </div>
                </div>
                <div style="display:flex;gap:var(--space-3)">
                  <div style="width:24px;height:24px;background:var(--color-primary-600);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);font-weight:var(--font-bold);flex-shrink:0">3</div>
                  <div>
                    <div style="font-weight:var(--font-semibold);font-size:var(--text-sm);color:var(--text-primary)">Post project updates</div>
                    <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:2px">Go to <strong>Projects</strong> → open a project → add updates. Mark them as "Client Visible" to show on the portal.</div>
                  </div>
                </div>
                <div style="display:flex;gap:var(--space-3)">
                  <div style="width:24px;height:24px;background:var(--color-primary-600);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);font-weight:var(--font-bold);flex-shrink:0">4</div>
                  <div>
                    <div style="font-weight:var(--font-semibold);font-size:var(--text-sm);color:var(--text-primary)">Client sees updates & submits inputs</div>
                    <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:2px">Client can see project progress, invoices, and submit requests. Their requests appear in your <strong>Requests</strong> inbox.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      tc.querySelector('#gen-token')?.addEventListener('click', async () => {
        const label = prompt('Label for this link (optional, e.g. "Main Portal"):') || '';
        try {
          await clientsService.createPortalToken(client.id, label);
          if (!client.portal_enabled) {
            await clientsService.update(client.id, { portal_enabled: true });
          }
          toast.success('Portal link generated');
          loadTab(client);
        } catch (err) { toast.error(err.message); }
      });

      tc.querySelectorAll('.copy-link').forEach(btn => {
        btn.addEventListener('click', async () => {
          await copyToClipboard(btn.dataset.url);
          toast.success('Link copied to clipboard!');
        });
      });

      tc.querySelectorAll('.revoke-token').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ok = await confirmDialog({ title: 'Revoke Link', message: 'This will deactivate the portal link. Clients with this link will lose access.', confirmText: 'Revoke', confirmClass: 'btn-danger' });
          if (ok) {
            await clientsService.updatePortalToken(btn.dataset.id, { is_active: false });
            toast.success('Link revoked');
            loadTab(client);
          }
        });
      });
    }
  };

  await load();
}
