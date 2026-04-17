import { signIn } from '../../lib/auth.js';
import { toast } from '../../components/toast.js';

export async function render(container) {
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-app);padding:var(--space-4)">
      <div style="width:100%;max-width:420px">
        <div style="text-align:center;margin-bottom:var(--space-8)">
          <div style="width:56px;height:56px;background:var(--color-primary-600);border-radius:var(--border-radius-lg);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4);font-size:var(--text-xl);font-weight:var(--font-bold);color:white">AF</div>
          <h1 style="font-size:var(--text-2xl);font-weight:var(--font-bold);color:var(--text-primary)">AppFinz CRM</h1>
          <p style="color:var(--text-muted);margin-top:var(--space-1);font-size:var(--text-sm)">Sign in to your account</p>
        </div>
        <div class="card" style="padding:var(--space-8)">
          <form id="login-form">
            <div class="form-group" style="margin-bottom:var(--space-4)">
              <label class="form-label required">Email address</label>
              <input type="email" id="email" class="form-input" placeholder="you@appfinz.com" autocomplete="email" required>
            </div>
            <div class="form-group" style="margin-bottom:var(--space-6)">
              <label class="form-label required">Password</label>
              <input type="password" id="password" class="form-input" placeholder="Enter your password" autocomplete="current-password" required>
            </div>
            <button type="submit" class="btn btn-primary" id="login-btn" style="width:100%;padding:var(--space-3)">
              Sign In
            </button>
            <div id="login-error" style="display:none;margin-top:var(--space-3);padding:var(--space-3);background:var(--color-danger-light);border-radius:var(--border-radius);color:var(--color-danger-dark);font-size:var(--text-sm)"></div>
          </form>
        </div>
        <p style="text-align:center;margin-top:var(--space-4);font-size:var(--text-xs);color:var(--text-muted)">
          AppFinz CRM &mdash; Internal tool
        </p>
      </div>
    </div>
  `;

  container.querySelector('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = container.querySelector('#login-btn');
    const errEl = container.querySelector('#login-error');
    const email = container.querySelector('#email').value.trim();
    const password = container.querySelector('#password').value;

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner sm"></span>&nbsp;Signing in...`;
    errEl.style.display = 'none';

    const { error } = await signIn(email, password);

    if (error) {
      btn.disabled = false;
      btn.textContent = 'Sign In';
      errEl.style.display = 'block';
      errEl.textContent = error.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please try again.'
        : error.message;
    } else {
      window.location.hash = '#/';
    }
  });
}
