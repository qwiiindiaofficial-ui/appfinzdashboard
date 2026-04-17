import './style.css';
import { initRouter } from './src/router/index.js';
import { onAuthStateChange, getProfile, getSession } from './src/lib/auth.js';
import { setState, getState } from './src/lib/store.js';
import { renderSidebar } from './src/components/sidebar.js';

const app = document.querySelector('#app');

async function bootstrap() {
  const session = await getSession();

  if (session) {
    const profile = await getProfile();
    setState('currentUser', session.user);
    setState('currentProfile', profile);
  }

  onAuthStateChange((event, session) => {
    (async () => {
      if (event === 'SIGNED_IN' && session) {
        setState('currentUser', session.user);
        const profile = await getProfile();
        setState('currentProfile', profile);
        if (window.location.hash === '#/login' || window.location.hash === '') {
          window.location.hash = '#/';
        }
      } else if (event === 'SIGNED_OUT') {
        setState('currentUser', null);
        setState('currentProfile', null);
        window.location.hash = '#/login';
      }
    })();
  });

  renderShell();
  initRouter(renderPage);
}

function renderShell() {
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar"></aside>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="main-content" id="main-content">
        <header class="topbar" id="topbar">
          <div class="topbar-left">
            <button class="hamburger-btn" id="hamburger">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div id="topbar-title" class="topbar-title"></div>
          </div>
          <div class="topbar-right" id="topbar-right"></div>
        </header>
        <main id="page-container"></main>
      </div>
    </div>
  `;

  const hamburger = app.querySelector('#hamburger');
  const sidebar = app.querySelector('#sidebar');
  const overlay = app.querySelector('#sidebar-overlay');

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('show');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('show');
  });

  renderSidebar(sidebar);
}

const pageRoutes = {
  'login': () => import('./src/pages/auth/login.js'),
  'dashboard': () => import('./src/pages/dashboard/index.js'),
  'leads-list': () => import('./src/pages/leads/index.js'),
  'leads-form': () => import('./src/pages/leads/form.js'),
  'leads-detail': () => import('./src/pages/leads/detail.js'),
  'clients-list': () => import('./src/pages/clients/index.js'),
  'clients-form': () => import('./src/pages/clients/form.js'),
  'clients-detail': () => import('./src/pages/clients/detail.js'),
  'projects-list': () => import('./src/pages/projects/index.js'),
  'projects-form': () => import('./src/pages/projects/form.js'),
  'projects-detail': () => import('./src/pages/projects/detail.js'),
  'invoices-list': () => import('./src/pages/invoices/index.js'),
  'invoices-form': () => import('./src/pages/invoices/form.js'),
  'invoices-detail': () => import('./src/pages/invoices/detail.js'),
  'tasks': () => import('./src/pages/tasks/index.js'),
  'requests': () => import('./src/pages/requests/index.js'),
  'portal': () => import('./src/pages/portal/index.js'),
  '404': null,
};

const pageTitles = {
  'dashboard': 'Dashboard',
  'leads-list': 'Leads',
  'leads-form': 'Lead',
  'leads-detail': 'Lead Detail',
  'clients-list': 'Clients',
  'clients-form': 'Client',
  'clients-detail': 'Client Detail',
  'projects-list': 'Projects',
  'projects-form': 'Project',
  'projects-detail': 'Project Detail',
  'invoices-list': 'Invoices',
  'invoices-form': 'Invoice',
  'invoices-detail': 'Invoice',
  'tasks': 'Tasks',
  'requests': 'Client Requests',
  'portal': '',
};

async function renderPage(page, params = {}) {
  const container = app.querySelector('#page-container');
  const titleEl = app.querySelector('#topbar-title');

  if (page === 'login') {
    app.querySelector('.app-shell').style.display = 'none';
    if (!document.querySelector('#login-container')) {
      const div = document.createElement('div');
      div.id = 'login-container';
      app.appendChild(div);
    }
    const { render } = await import('./src/pages/auth/login.js');
    await render(document.querySelector('#login-container'));
    return;
  } else {
    app.querySelector('.app-shell').style.display = '';
    const lc = document.querySelector('#login-container');
    if (lc) lc.remove();
  }

  if (page === 'portal') {
    const { render } = await import('./src/pages/portal/index.js');
    container.innerHTML = '';
    await render(container, params);
    return;
  }

  if (titleEl) titleEl.textContent = pageTitles[page] || '';

  const loader = pageRoutes[page];
  if (!loader) {
    container.innerHTML = `
      <div class="page-content">
        <div class="empty-state" style="padding:var(--space-16)">
          <div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          <h3>Page Not Found</h3>
          <p>The page you're looking for doesn't exist.</p>
          <a href="#/" class="btn btn-primary">Go to Dashboard</a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="loading-state" style="min-height:300px"><div class="spinner"></div></div>`;
  const { render } = await loader();
  return render(container, params);
}

bootstrap();
