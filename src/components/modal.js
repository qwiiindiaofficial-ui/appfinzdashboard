let activeModal = null;

export function openModal({ title, content, size = '', onConfirm, confirmText = 'Confirm', confirmClass = 'btn-primary', showCancel = true, cancelText = 'Cancel' }) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${size ? 'modal-' + size : ''}">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="close-btn" data-close>&times;</button>
      </div>
      <div class="modal-body">${content}</div>
      <div class="modal-footer">
        ${showCancel ? `<button class="btn btn-secondary" data-close>${cancelText}</button>` : ''}
        ${onConfirm ? `<button class="btn ${confirmClass}" data-confirm>${confirmText}</button>` : ''}
      </div>
    </div>
  `;

  overlay.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  const confirmBtn = overlay.querySelector('[data-confirm]');
  if (confirmBtn && onConfirm) {
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span class="spinner sm"></span>`;
      try {
        await onConfirm(overlay);
      } finally {
        if (confirmBtn.isConnected) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = confirmText;
        }
      }
    });
  }

  document.body.appendChild(overlay);
  activeModal = overlay;

  const escHandler = e => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', escHandler);
  overlay._escHandler = escHandler;

  return overlay;
}

export function closeModal() {
  if (activeModal) {
    if (activeModal._escHandler) {
      document.removeEventListener('keydown', activeModal._escHandler);
    }
    activeModal.remove();
    activeModal = null;
  }
}

export function confirmDialog({ title, message, confirmText = 'Delete', confirmClass = 'btn-danger' }) {
  return new Promise(resolve => {
    openModal({
      title,
      content: `<p style="color:var(--text-secondary)">${message}</p>`,
      confirmText,
      confirmClass,
      onConfirm: () => {
        closeModal();
        resolve(true);
      },
      showCancel: true,
    });
    activeModal._resolveReject = resolve;
    const closeBtn = activeModal.querySelector('.btn-secondary[data-close]');
    if (closeBtn) {
      const orig = closeBtn.onclick;
      closeBtn.addEventListener('click', () => resolve(false), { once: true });
    }
  });
}

export function getModalBody() {
  return activeModal ? activeModal.querySelector('.modal-body') : null;
}
