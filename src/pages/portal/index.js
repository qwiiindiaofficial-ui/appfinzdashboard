import { portalService } from '../../services/portal.js';
import { formatCurrency, formatDate, escapeHtml } from '../../lib/utils.js';
import { invoiceStatusBadge, projectStatusBadge } from '../../components/badge.js';
import { toast } from '../../components/toast.js';

const updateTypeLabels = { progress: 'Progress Update', milestone: 'Milestone Achieved', blocker: 'Blocker / Issue', design: 'Design Update', delivery: 'Delivery', note: 'Note' };
const updateTypeColors = { progress: '#2563eb', milestone: '#16a34a', blocker: '#dc2626', design: '#0891b2', delivery: '#0d9488', note: '#64748b' };
const updateTypeIcons = { progress: '📈', milestone: '🏆', blocker: '⚠️', design: '🎨', delivery: '📦', note: '📝' };

export async function render(container, params = {}) {
  container.innerHTML = `
    <div style="min-height:100vh;background:#f1f5f9;font-family:Inter,system-ui,sans-serif">
      <div style="background:white;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:10">
        <div style="max-width:960px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:60px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:32px;height:32px;background:#1d4ed8;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px">AF</div>
            <div>
              <div style="font-weight:700;color:#0f172a;font-size:15px">AppFinz</div>
              <div style="font-size:11px;color:#64748b">Client Portal</div>
            </div>
          </div>
          <div id="portal-company-name" style="font-size:13px;color:#64748b"></div>
        </div>
      </div>
      <div style="max-width:960px;margin:0 auto;padding:32px 20px" id="portal-body">
        <div style="display:flex;align-items:center;justify-content:center;padding:80px 0">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  `;

  const body = container.querySelector('#portal-body');

  if (!params.token) {
    body.innerHTML = renderError('Invalid Link', 'This portal link is not valid. Please contact AppFinz for assistance.');
    return;
  }

  try {
    const tokenData = await portalService.resolveToken(params.token);

    if (!tokenData) {
      body.innerHTML = renderError('Link Not Found', 'This portal link is not valid or has been revoked. Please contact AppFinz for a new link.');
      return;
    }

    if (tokenData.expired) {
      body.innerHTML = renderError('Link Expired', 'This portal link has expired. Please contact AppFinz for a new link.');
      return;
    }

    const client = tokenData.client;
    container.querySelector('#portal-company-name').textContent = client.company_name;

    const [projects, invoices] = await Promise.all([
      portalService.getProjects(client.id),
      portalService.getInvoices(client.id),
    ]);

    body.innerHTML = `
      <div style="margin-bottom:32px">
        <h1 style="font-size:24px;font-weight:700;color:#0f172a">Welcome, ${escapeHtml(client.company_name)}</h1>
        <p style="color:#64748b;font-size:14px;margin-top:6px">This is your dedicated project portal. View your project updates, invoices, and submit requests to our team.</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px" id="portal-stats">
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#1d4ed8">${projects.length}</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px">Active Projects</div>
        </div>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#0d9488">${invoices.length}</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px">Invoices</div>
        </div>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#16a34a">${invoices.filter(i => i.status === 'paid').length}</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px">Paid Invoices</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">
        <button class="portal-nav-btn active" data-section="projects" style="padding:8px 18px;border-radius:8px;border:1px solid #1d4ed8;background:#1d4ed8;color:white;font-size:14px;font-weight:500;cursor:pointer">Projects (${projects.length})</button>
        <button class="portal-nav-btn" data-section="invoices" style="padding:8px 18px;border-radius:8px;border:1px solid #e2e8f0;background:white;color:#374151;font-size:14px;font-weight:500;cursor:pointer">Invoices (${invoices.length})</button>
        <button class="portal-nav-btn" data-section="request" style="padding:8px 18px;border-radius:8px;border:1px solid #e2e8f0;background:white;color:#374151;font-size:14px;font-weight:500;cursor:pointer">Submit a Request</button>
      </div>

      <div id="section-projects">
        ${projects.length === 0 ? `
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:48px;text-align:center">
            <div style="font-size:40px;margin-bottom:12px">📋</div>
            <h3 style="color:#0f172a;font-weight:600">No projects yet</h3>
            <p style="color:#64748b;font-size:14px;margin-top:6px">Your projects will appear here once AppFinz sets them up.</p>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:16px">
            ${projects.map(p => `
              <div class="portal-project" data-id="${p.id}" style="background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
                <div class="project-header" style="padding:20px;cursor:pointer;display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                      <span style="font-weight:600;font-size:16px;color:#0f172a">${escapeHtml(p.name)}</span>
                      ${projectStatusBadge(p.status)}
                    </div>
                    ${p.description ? `<p style="font-size:13px;color:#64748b;margin-bottom:10px">${escapeHtml(p.description)}</p>` : ''}
                    <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
                      <div style="flex:1;background:#f1f5f9;border-radius:100px;height:8px;overflow:hidden">
                        <div style="height:100%;width:${p.progress_pct}%;background:#1d4ed8;border-radius:100px;transition:width .5s"></div>
                      </div>
                      <span style="font-weight:700;font-size:13px;color:#1d4ed8;white-space:nowrap">${p.progress_pct}% Complete</span>
                    </div>
                    ${p.end_date ? `<div style="font-size:12px;color:#64748b;margin-top:6px">Expected delivery: <strong>${formatDate(p.end_date)}</strong></div>` : ''}
                  </div>
                  <div style="flex-shrink:0">
                    <span class="toggle-icon" style="font-size:18px;color:#94a3b8">▼</span>
                  </div>
                </div>
                <div class="project-updates" style="display:none;border-top:1px solid #f1f5f9;background:#fafafa" id="updates-${p.id}">
                  <div class="updates-inner" style="padding:16px">
                    <div class="updates-loading"><div style="display:flex;justify-content:center;padding:20px"><div class="spinner"></div></div></div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <div id="section-invoices" style="display:none">
        ${invoices.length === 0 ? `
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:48px;text-align:center">
            <div style="font-size:40px;margin-bottom:12px">🧾</div>
            <h3 style="color:#0f172a;font-weight:600">No invoices yet</h3>
            <p style="color:#64748b;font-size:14px;margin-top:6px">Your invoices will appear here once they are issued.</p>
          </div>
        ` : `
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
            <div style="padding:16px 20px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#0f172a;font-size:15px">Your Invoices</div>
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <thead>
                  <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0">
                    <th style="text-align:left;padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Invoice #</th>
                    <th style="text-align:left;padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Date</th>
                    <th style="text-align:left;padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Due Date</th>
                    <th style="text-align:right;padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Amount</th>
                    <th style="text-align:left;padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoices.map(inv => `
                    <tr style="border-bottom:1px solid #f1f5f9">
                      <td style="padding:14px 16px;font-weight:600;color:#0f172a">${inv.invoice_number}</td>
                      <td style="padding:14px 16px;color:#64748b">${formatDate(inv.invoice_date)}</td>
                      <td style="padding:14px 16px;color:${inv.status==='overdue'?'#dc2626;font-weight:600':'#64748b'}">${formatDate(inv.due_date)}</td>
                      <td style="padding:14px 16px;text-align:right;font-weight:700;color:#0f172a">${formatCurrency(inv.total, inv.currency)}</td>
                      <td style="padding:14px 16px">${invoiceStatusBadge(inv.status)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}
      </div>

      <div id="section-request" style="display:none">
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
          <div style="padding:20px;border-bottom:1px solid #f1f5f9">
            <div style="font-weight:600;color:#0f172a;font-size:15px">Submit a Request</div>
            <div style="font-size:13px;color:#64748b;margin-top:4px">Need something? Submit a request and our team will get back to you shortly.</div>
          </div>
          <div id="request-success" style="display:none;text-align:center;padding:56px 20px">
            <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">✓</div>
            <h3 style="font-size:18px;font-weight:600;color:#0f172a">Request Submitted!</h3>
            <p style="color:#64748b;margin-top:8px;font-size:14px">We've received your request and will get back to you soon.</p>
            <button style="margin-top:20px;padding:10px 24px;background:#1d4ed8;color:white;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer" id="new-request-btn">Submit Another Request</button>
          </div>
          <form id="portal-request-form" style="padding:24px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
              <div style="grid-column:1/-1" class="form-group">
                <label class="form-label required">Subject</label>
                <input type="text" id="req-subject" class="form-input" required placeholder="Brief description of your request">
              </div>
              <div class="form-group">
                <label class="form-label">Request Type</label>
                <select id="req-type" class="form-select">
                  ${[['general','General Inquiry'],['change_request','Change Request'],['bug_report','Bug / Issue Report'],['content_update','Content Update'],['question','Question'],['approval','Approval Required'],['other','Other']].map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Priority</label>
                <select id="req-prio" class="form-select">
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              ${projects.length > 0 ? `
                <div class="form-group" style="grid-column:1/-1">
                  <label class="form-label">Related Project</label>
                  <select id="req-project" class="form-select">
                    <option value="">None / General</option>
                    ${projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
                  </select>
                </div>
              ` : ''}
              <div class="form-group" style="grid-column:1/-1">
                <label class="form-label required">Message</label>
                <textarea id="req-body" class="form-textarea" rows="5" required placeholder="Please provide as much detail as possible about your request..."></textarea>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end">
              <button type="submit" id="submit-req" style="padding:10px 28px;background:#1d4ed8;color:white;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px">Submit Request</button>
            </div>
          </form>
        </div>
      </div>
    `;

    body.querySelectorAll('.portal-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        body.querySelectorAll('.portal-nav-btn').forEach(b => {
          b.style.background = 'white';
          b.style.color = '#374151';
          b.style.borderColor = '#e2e8f0';
          b.classList.remove('active');
        });
        btn.style.background = '#1d4ed8';
        btn.style.color = 'white';
        btn.style.borderColor = '#1d4ed8';
        btn.classList.add('active');
        const section = btn.dataset.section;
        ['projects','invoices','request'].forEach(s => {
          const el = body.querySelector(`#section-${s}`);
          if (el) el.style.display = s === section ? '' : 'none';
        });
      });
    });

    body.querySelectorAll('.portal-project').forEach(proj => {
      const updatesWrap = proj.querySelector('.project-updates');
      const projectId = proj.dataset.id;
      const toggleIcon = proj.querySelector('.toggle-icon');
      let loaded = false;
      let open = false;

      proj.querySelector('.project-header').addEventListener('click', async () => {
        open = !open;
        updatesWrap.style.display = open ? '' : 'none';
        toggleIcon.textContent = open ? '▲' : '▼';
        if (open && !loaded) {
          loaded = true;
          try {
            const updates = await portalService.getProjectUpdates(projectId);
            const inner = updatesWrap.querySelector('.updates-inner');
            if (updates.length === 0) {
              inner.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:20px;font-size:13px">No updates posted yet. Check back soon.</p>`;
            } else {
              inner.innerHTML = `
                <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Latest Updates</div>
                <div style="display:flex;flex-direction:column;gap:12px">
                  ${updates.map(u => `
                    <div style="display:flex;gap:12px;padding:12px;background:white;border-radius:8px;border:1px solid #e2e8f0">
                      <div style="font-size:20px;flex-shrink:0;line-height:1">${updateTypeIcons[u.update_type] || '📝'}</div>
                      <div style="flex:1;min-width:0">
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                          <span style="font-size:11px;font-weight:600;color:${updateTypeColors[u.update_type]||'#64748b'};background:${updateTypeColors[u.update_type]||'#64748b'}15;padding:2px 8px;border-radius:100px">${updateTypeLabels[u.update_type]||u.update_type}</span>
                          <span style="font-size:11px;color:#94a3b8">${formatDate(u.created_at)}</span>
                          ${u.progress_snapshot != null ? `<span style="font-size:11px;color:#1d4ed8;font-weight:600">${u.progress_snapshot}% complete</span>` : ''}
                        </div>
                        <div style="font-weight:600;font-size:14px;color:#0f172a">${escapeHtml(u.title)}</div>
                        ${u.body ? `<p style="font-size:13px;color:#475569;margin-top:4px;line-height:1.5">${escapeHtml(u.body)}</p>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `;
            }
          } catch { }
        }
      });
    });

    body.querySelector('#portal-request-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = body.querySelector('#submit-req');
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner sm"></span> Submitting...`;
      try {
        await portalService.submitRequest({
          client_id: client.id,
          portal_token_id: tokenData.id,
          subject: body.querySelector('#req-subject').value,
          request_type: body.querySelector('#req-type').value,
          project_id: body.querySelector('#req-project')?.value || null,
          priority: body.querySelector('#req-prio').value,
          body: body.querySelector('#req-body').value,
        });
        body.querySelector('#portal-request-form').style.display = 'none';
        body.querySelector('#request-success').style.display = '';
      } catch {
        toast.error('Failed to submit. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Submit Request';
      }
    });

    body.querySelector('#new-request-btn')?.addEventListener('click', () => {
      body.querySelector('#portal-request-form').reset();
      body.querySelector('#portal-request-form').style.display = '';
      body.querySelector('#request-success').style.display = 'none';
    });

  } catch (err) {
    body.innerHTML = renderError('Something went wrong', err.message);
  }
}

function renderError(title, message) {
  return `
    <div style="text-align:center;padding:80px 20px">
      <div style="width:72px;height:72px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px">⚠️</div>
      <h2 style="font-size:22px;font-weight:700;color:#0f172a">${title}</h2>
      <p style="color:#64748b;margin-top:10px;max-width:400px;margin-left:auto;margin-right:auto;font-size:14px;line-height:1.6">${message}</p>
    </div>
  `;
}
