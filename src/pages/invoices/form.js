import { invoicesService } from '../../services/invoices.js';
import { supabase } from '../../lib/supabase.js';
import { toast } from '../../components/toast.js';
import { formatCurrency } from '../../lib/utils.js';

export async function render(container, params = {}) {
  const isEdit = !!params.id;
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  const [invData, clientsRes] = await Promise.all([
    isEdit ? invoicesService.getById(params.id) : Promise.resolve(null),
    supabase.from('clients').select('id,company_name').eq('status','active').order('company_name'),
  ]);

  const inv = invData;
  const clients = clientsRes.data || [];
  const preselectedClient = params.client_id || inv?.client_id || '';

  let items = inv?.items || [{ description: '', quantity: 1, unit_price: 0, unit: 'item' }];
  const today = new Date().toISOString().split('T')[0];
  const due30 = new Date(Date.now() + 30*86400000).toISOString().split('T')[0];

  const buildForm = () => {
    container.innerHTML = `
      <div class="page-content" style="max-width:1000px">
        <div class="page-header">
          <div class="page-header-left"><h1>${isEdit ? 'Edit Invoice' : 'New Invoice'}</h1></div>
          <div class="page-header-actions">
            <a href="${isEdit ? '#/invoices/' + params.id : '#/invoices'}" class="btn btn-secondary">Cancel</a>
          </div>
        </div>
        <form id="inv-form">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
            <div>
              <div class="card" style="margin-bottom:var(--space-4)">
                <div class="form-section-title">Invoice Details</div>
                <div class="form-grid">
                  <div class="form-group form-col-full">
                    <label class="form-label required">Client</label>
                    <select name="client_id" class="form-select" id="inv-client" required>
                      <option value="">Select client</option>
                      ${clients.map(c => `<option value="${c.id}" ${(preselectedClient) === c.id ? 'selected' : ''}>${c.company_name}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Invoice Date</label>
                    <input type="date" name="invoice_date" class="form-input" value="${inv?.invoice_date || today}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Due Date</label>
                    <input type="date" name="due_date" class="form-input" value="${inv?.due_date || due30}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Status</label>
                    <select name="status" class="form-select">
                      ${[['draft','Draft'],['sent','Sent'],['paid','Paid'],['overdue','Overdue']].map(([v,l]) => `<option value="${v}" ${(inv?.status || 'draft') === v ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Discount</label>
                    <div style="display:flex;gap:var(--space-2)">
                      <select name="discount_type" id="disc-type" class="form-select" style="width:120px">
                        <option value="none">None</option>
                        <option value="percentage" ${inv?.discount_type==='percentage'?'selected':''}>%</option>
                        <option value="fixed" ${inv?.discount_type==='fixed'?'selected':''}>Fixed</option>
                      </select>
                      <input type="number" name="discount_value" id="disc-val" class="form-input" value="${inv?.discount_value || 0}" min="0">
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Tax Rate (%)</label>
                    <input type="number" name="tax_rate" id="tax-rate" class="form-input" value="${inv?.tax_rate || 18}" min="0" max="100">
                  </div>
                </div>
              </div>

              <div class="card" style="margin-bottom:var(--space-4)">
                <div class="form-section-title">Notes & Terms</div>
                <div class="form-group" style="margin-bottom:var(--space-3)">
                  <label class="form-label">Notes</label>
                  <textarea name="notes" class="form-textarea" rows="2">${inv?.notes || ''}</textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">Terms & Conditions</label>
                  <textarea name="terms" class="form-textarea" rows="2">${inv?.terms || 'Payment due within 30 days of invoice date.'}</textarea>
                </div>
              </div>
            </div>

            <div>
              <div class="card" style="margin-bottom:var(--space-4)">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
                  <div class="form-section-title" style="margin-bottom:0">Line Items</div>
                  <button type="button" class="btn btn-secondary btn-sm" id="add-item">+ Add Item</button>
                </div>
                <div id="items-list">
                  ${renderItemsHTML(items)}
                </div>
              </div>

              <div class="card" id="totals-card">
                ${renderTotals(items, inv?.discount_type || 'none', inv?.discount_value || 0, inv?.tax_rate || 18)}
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:var(--space-3);padding:var(--space-5) 0">
            <a href="${isEdit ? '#/invoices/' + params.id : '#/invoices'}" class="btn btn-secondary">Cancel</a>
            <button type="submit" class="btn btn-primary" id="submit-btn">${isEdit ? 'Update Invoice' : 'Create Invoice'}</button>
          </div>
        </form>
      </div>
    `;

    attachItemEvents();
    attachCalcEvents();
  };

  const renderItemsHTML = (its) => its.map((item, i) => `
    <div class="item-row" data-idx="${i}" style="border:1px solid var(--border-color);border-radius:var(--border-radius);padding:var(--space-3);margin-bottom:var(--space-2)">
      <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-2)">
        <input type="text" class="form-input item-desc" placeholder="Description" value="${item.description || ''}" style="flex:1">
        <button type="button" class="btn btn-ghost btn-icon btn-sm rem-item" ${items.length <= 1 ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:var(--space-2)">
        <div><label style="font-size:10px;color:var(--text-muted)">Qty</label><input type="number" class="form-input item-qty" value="${item.quantity || 1}" min="0.01" step="0.01"></div>
        <div><label style="font-size:10px;color:var(--text-muted)">Unit</label>
          <select class="form-select item-unit">
            ${['item','hour','day','month','piece'].map(u => `<option value="${u}" ${item.unit===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
        <div><label style="font-size:10px;color:var(--text-muted)">Unit Price</label><input type="number" class="form-input item-price" value="${item.unit_price || 0}" min="0" step="0.01"></div>
        <div><label style="font-size:10px;color:var(--text-muted)">Total</label><input type="text" class="form-input item-total" value="${formatCurrency(((item.quantity||1) * (item.unit_price||0)), 'INR')}" readonly style="background:var(--color-gray-50)"></div>
      </div>
    </div>
  `).join('');

  const renderTotals = (its, discType, discVal, taxRate) => {
    const subtotal = its.reduce((s, i) => s + ((Number(i.quantity)||1) * (Number(i.unit_price)||0)), 0);
    let discount = 0;
    if (discType === 'percentage') discount = subtotal * (Number(discVal)||0) / 100;
    else if (discType === 'fixed') discount = Number(discVal)||0;
    const afterDisc = subtotal - discount;
    const tax = afterDisc * (Number(taxRate)||0) / 100;
    const total = afterDisc + tax;
    return `
      <div style="display:flex;flex-direction:column;gap:var(--space-2)">
        <div style="display:flex;justify-content:space-between;font-size:var(--text-sm)"><span style="color:var(--text-muted)">Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        ${discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:var(--text-sm)"><span style="color:var(--color-success)">Discount</span><span style="color:var(--color-success)">-${formatCurrency(discount)}</span></div>` : ''}
        ${tax > 0 ? `<div style="display:flex;justify-content:space-between;font-size:var(--text-sm)"><span style="color:var(--text-muted)">GST (${taxRate}%)</span><span>${formatCurrency(tax)}</span></div>` : ''}
        <div style="border-top:2px solid var(--border-color);padding-top:var(--space-2);display:flex;justify-content:space-between;font-weight:var(--font-bold);font-size:var(--text-lg)">
          <span>Total</span><span style="color:var(--color-primary-600)">${formatCurrency(total)}</span>
        </div>
      </div>
    `;
  };

  const syncItems = () => {
    const rows = container.querySelectorAll('.item-row');
    items = [];
    rows.forEach(row => {
      items.push({
        description: row.querySelector('.item-desc').value,
        quantity: parseFloat(row.querySelector('.item-qty').value) || 1,
        unit: row.querySelector('.item-unit').value,
        unit_price: parseFloat(row.querySelector('.item-price').value) || 0,
      });
    });
  };

  const updateTotals = () => {
    syncItems();
    const discType = container.querySelector('[name="discount_type"]')?.value || 'none';
    const discVal = parseFloat(container.querySelector('[name="discount_value"]')?.value) || 0;
    const taxRate = parseFloat(container.querySelector('[name="tax_rate"]')?.value) || 0;
    container.querySelector('#totals-card').innerHTML = renderTotals(items, discType, discVal, taxRate);
    items.forEach((item, i) => {
      const row = container.querySelectorAll('.item-row')[i];
      if (row) { row.querySelector('.item-total').value = formatCurrency(item.quantity * item.unit_price); }
    });
  };

  const attachItemEvents = () => {
    container.querySelector('#add-item').addEventListener('click', () => {
      syncItems();
      items.push({ description: '', quantity: 1, unit_price: 0, unit: 'item' });
      container.querySelector('#items-list').innerHTML = renderItemsHTML(items);
      attachItemEvents();
    });

    container.querySelectorAll('.rem-item').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        syncItems();
        if (items.length > 1) { items.splice(i, 1); container.querySelector('#items-list').innerHTML = renderItemsHTML(items); attachItemEvents(); updateTotals(); }
      });
    });

    container.querySelectorAll('.item-qty, .item-price, .item-desc, .item-unit').forEach(input => {
      input.addEventListener('input', updateTotals);
    });
  };

  const attachCalcEvents = () => {
    container.querySelector('#disc-type')?.addEventListener('change', updateTotals);
    container.querySelector('#disc-val')?.addEventListener('input', updateTotals);
    container.querySelector('#tax-rate')?.addEventListener('input', updateTotals);
  };

  buildForm();

  container.querySelector('#inv-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = container.querySelector('#submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner sm"></span>&nbsp;Saving...`;
    syncItems();
    const fd = new FormData(e.target);
    const discType = fd.get('discount_type');
    const discVal = parseFloat(fd.get('discount_value')) || 0;
    const taxRate = parseFloat(fd.get('tax_rate')) || 0;
    const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
    let discount = 0;
    if (discType === 'percentage') discount = subtotal * discVal / 100;
    else if (discType === 'fixed') discount = discVal;
    const afterDisc = subtotal - discount;
    const taxAmount = afterDisc * taxRate / 100;
    const total = afterDisc + taxAmount;

    const payload = {
      client_id: fd.get('client_id'),
      invoice_date: fd.get('invoice_date'),
      due_date: fd.get('due_date'),
      status: fd.get('status'),
      subtotal, discount_type: discType, discount_value: discVal, discount_amount: discount,
      tax_rate: taxRate, tax_amount: taxAmount, total,
      notes: fd.get('notes') || null,
      terms: fd.get('terms') || null,
    };

    try {
      if (isEdit) {
        await invoicesService.update(params.id, payload, items);
        toast.success('Invoice updated');
        window.location.hash = `#/invoices/${params.id}`;
      } else {
        const inv = await invoicesService.create(payload, items);
        toast.success('Invoice created');
        window.location.hash = `#/invoices/${inv.id}`;
      }
    } catch (err) {
      toast.error(err.message);
      btn.disabled = false;
      btn.textContent = isEdit ? 'Update Invoice' : 'Create Invoice';
    }
  });
}
