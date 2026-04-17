import { invoicesService } from '../../services/invoices.js';
import { invoiceStatusBadge } from '../../components/badge.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';

export async function render(container, params = {}) {
  const load = async () => {
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
    try {
      const inv = await invoicesService.getById(params.id);
      if (!inv) { container.innerHTML = `<div class="page-content"><div class="empty-state"><h3>Invoice not found</h3><a href="#/invoices" class="btn btn-primary">Back</a></div></div>`; return; }
      renderInvoice(inv);
    } catch (err) {
      container.innerHTML = `<div class="page-content"><div class="empty-state"><h3>Error</h3><p>${err.message}</p></div></div>`;
    }
  };

  const renderInvoice = (inv) => {
    const client = inv.client || {};
    container.innerHTML = `
      <div class="page-content">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);flex-wrap:wrap;gap:var(--space-3)" class="no-print">
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <a href="#/invoices" style="color:var(--text-muted);font-size:var(--text-sm)">&larr; Invoices</a>
            <span style="font-size:var(--text-sm);color:var(--text-muted)">${inv.invoice_number}</span>
            ${invoiceStatusBadge(inv.status)}
          </div>
          <div style="display:flex;gap:var(--space-2)">
            ${inv.status === 'draft' ? `<button class="btn btn-secondary" id="mark-sent">Mark as Sent</button>` : ''}
            ${['sent','viewed','partially_paid','overdue'].includes(inv.status) ? `<button class="btn btn-success" id="record-payment">Record Payment</button>` : ''}
            <a href="#/invoices/${inv.id}/edit" class="btn btn-secondary">Edit</a>
            <button class="btn btn-primary" onclick="window.print()">Print / PDF</button>
          </div>
        </div>

        <div class="card" id="invoice-doc" style="max-width:800px;margin:0 auto">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-8)">
            <div>
              <div style="width:48px;height:48px;background:var(--color-primary-600);border-radius:var(--border-radius);display:flex;align-items:center;justify-content:center;color:white;font-weight:var(--font-bold);font-size:var(--text-lg);margin-bottom:var(--space-2)">AF</div>
              <div style="font-size:var(--text-xl);font-weight:var(--font-bold);color:var(--text-primary)">AppFinz</div>
              <div style="font-size:var(--text-sm);color:var(--text-muted)">IT Solutions Company</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:var(--text-2xl);font-weight:var(--font-bold);color:var(--text-primary)">INVOICE</div>
              <div style="font-size:var(--text-lg);color:var(--color-primary-600);margin-top:4px">${inv.invoice_number}</div>
              ${invoiceStatusBadge(inv.status)}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-8);margin-bottom:var(--space-8)">
            <div>
              <div style="font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-2)">Bill To</div>
              <div style="font-weight:var(--font-semibold)">${client.company_name || '-'}</div>
              <div style="font-size:var(--text-sm);color:var(--text-secondary)">${client.contact_name || ''}</div>
              <div style="font-size:var(--text-sm);color:var(--text-secondary)">${client.email || ''}</div>
              ${client.address_line1 ? `<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:4px">${[client.address_line1, client.city, client.state, client.postal_code].filter(Boolean).join(', ')}</div>` : ''}
            </div>
            <div style="text-align:right">
              <div style="margin-bottom:var(--space-2)">
                <div style="font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">Invoice Date</div>
                <div style="font-size:var(--text-sm);font-weight:var(--font-medium)">${formatDate(inv.invoice_date)}</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">Due Date</div>
                <div style="font-size:var(--text-sm);font-weight:var(--font-medium);${inv.status==='overdue'?'color:var(--color-danger)':''}">${formatDate(inv.due_date)}</div>
              </div>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:var(--space-6)">
            <thead>
              <tr style="background:var(--color-gray-50);border-bottom:2px solid var(--border-color)">
                <th style="text-align:left;padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em">Description</th>
                <th style="text-align:center;padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--text-secondary);text-transform:uppercase">Qty</th>
                <th style="text-align:center;padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--text-secondary);text-transform:uppercase">Unit</th>
                <th style="text-align:right;padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--text-secondary);text-transform:uppercase">Rate</th>
                <th style="text-align:right;padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--text-secondary);text-transform:uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(inv.items || []).map(item => `
                <tr style="border-bottom:1px solid var(--border-color)">
                  <td style="padding:var(--space-3) var(--space-4);font-size:var(--text-sm)">${item.description}</td>
                  <td style="text-align:center;padding:var(--space-3) var(--space-4);font-size:var(--text-sm)">${item.quantity}</td>
                  <td style="text-align:center;padding:var(--space-3) var(--space-4);font-size:var(--text-sm);color:var(--text-muted)">${item.unit}</td>
                  <td style="text-align:right;padding:var(--space-3) var(--space-4);font-size:var(--text-sm)">${formatCurrency(item.unit_price, inv.currency)}</td>
                  <td style="text-align:right;padding:var(--space-3) var(--space-4);font-size:var(--text-sm);font-weight:var(--font-medium)">${formatCurrency(item.quantity * item.unit_price, inv.currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display:flex;justify-content:flex-end">
            <div style="min-width:280px">
              <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;font-size:var(--text-sm);border-bottom:1px solid var(--border-color)">
                <span style="color:var(--text-muted)">Subtotal</span>
                <span>${formatCurrency(inv.subtotal, inv.currency)}</span>
              </div>
              ${inv.discount_amount > 0 ? `<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;font-size:var(--text-sm);border-bottom:1px solid var(--border-color)"><span style="color:var(--color-success)">Discount</span><span style="color:var(--color-success)">-${formatCurrency(inv.discount_amount, inv.currency)}</span></div>` : ''}
              ${inv.tax_amount > 0 ? `<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;font-size:var(--text-sm);border-bottom:1px solid var(--border-color)"><span style="color:var(--text-muted)">GST (${inv.tax_rate}%)</span><span>${formatCurrency(inv.tax_amount, inv.currency)}</span></div>` : ''}
              <div style="display:flex;justify-content:space-between;padding:var(--space-3) 0;font-size:var(--text-xl);font-weight:var(--font-bold)">
                <span>Total</span>
                <span style="color:var(--color-primary-600)">${formatCurrency(inv.total, inv.currency)}</span>
              </div>
              ${inv.amount_paid > 0 ? `<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;font-size:var(--text-sm);color:var(--color-success)"><span>Paid</span><span>${formatCurrency(inv.amount_paid, inv.currency)}</span></div>` : ''}
              ${inv.amount_paid < inv.total ? `<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;font-size:var(--text-sm);font-weight:var(--font-semibold)"><span>Balance Due</span><span>${formatCurrency(inv.total - inv.amount_paid, inv.currency)}</span></div>` : ''}
            </div>
          </div>

          ${inv.notes ? `<div style="margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px solid var(--border-color)"><div style="font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--text-muted);text-transform:uppercase;margin-bottom:var(--space-1)">Notes</div><div style="font-size:var(--text-sm);color:var(--text-secondary)">${inv.notes}</div></div>` : ''}
          ${inv.terms ? `<div style="margin-top:var(--space-4)"><div style="font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--text-muted);text-transform:uppercase;margin-bottom:var(--space-1)">Terms</div><div style="font-size:var(--text-sm);color:var(--text-secondary)">${inv.terms}</div></div>` : ''}
        </div>
      </div>
    `;

    container.querySelector('#mark-sent')?.addEventListener('click', async () => {
      await invoicesService.update(params.id, { status: 'sent', sent_at: new Date().toISOString() });
      toast.success('Invoice marked as sent');
      load();
    });

    container.querySelector('#record-payment')?.addEventListener('click', () => {
      openModal({
        title: 'Record Payment',
        content: `
          <div class="form-group" style="margin-bottom:var(--space-3)">
            <label class="form-label">Amount Received (INR)</label>
            <input type="number" id="pay-amount" class="form-input" value="${inv.total - inv.amount_paid}" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">Payment Date</label>
            <input type="date" id="pay-date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
          </div>
        `,
        confirmText: 'Record',
        confirmClass: 'btn-success',
        onConfirm: async () => {
          const amount = parseFloat(document.querySelector('#pay-amount').value) || 0;
          const newPaid = inv.amount_paid + amount;
          const isFullyPaid = newPaid >= inv.total;
          await invoicesService.update(params.id, {
            amount_paid: newPaid,
            status: isFullyPaid ? 'paid' : 'partially_paid',
            ...(isFullyPaid ? { paid_at: new Date().toISOString() } : {}),
          });
          closeModal();
          toast.success('Payment recorded');
          load();
        },
      });
    });
  };

  await load();
}
