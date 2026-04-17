import { getSession } from '../lib/auth.js';

const routes = [
  { pattern: /^\/portal\/([a-f0-9]+)$/, page: 'portal', public: true },
  { pattern: /^\/login$/, page: 'login', public: true },
  { pattern: /^\/$/, page: 'dashboard' },
  { pattern: /^\/dashboard$/, page: 'dashboard' },
  { pattern: /^\/leads$/, page: 'leads-list' },
  { pattern: /^\/leads\/new$/, page: 'leads-form' },
  { pattern: /^\/leads\/([^/?]+)\/edit$/, page: 'leads-form', paramIdx: 0 },
  { pattern: /^\/leads\/([^/?]+)$/, page: 'leads-detail', paramIdx: 0 },
  { pattern: /^\/clients$/, page: 'clients-list' },
  { pattern: /^\/clients\/new$/, page: 'clients-form' },
  { pattern: /^\/clients\/([^/?]+)\/edit$/, page: 'clients-form', paramIdx: 0 },
  { pattern: /^\/clients\/([^/?]+)$/, page: 'clients-detail', paramIdx: 0 },
  { pattern: /^\/projects$/, page: 'projects-list' },
  { pattern: /^\/projects\/new$/, page: 'projects-form' },
  { pattern: /^\/projects\/([^/?]+)\/edit$/, page: 'projects-form', paramIdx: 0 },
  { pattern: /^\/projects\/([^/?]+)$/, page: 'projects-detail', paramIdx: 0 },
  { pattern: /^\/invoices$/, page: 'invoices-list' },
  { pattern: /^\/invoices\/new$/, page: 'invoices-form' },
  { pattern: /^\/invoices\/([^/?]+)\/edit$/, page: 'invoices-form', paramIdx: 0 },
  { pattern: /^\/invoices\/([^/?]+)$/, page: 'invoices-detail', paramIdx: 0 },
  { pattern: /^\/tasks$/, page: 'tasks' },
  { pattern: /^\/requests$/, page: 'requests' },
];

let currentPageCleanup = null;

export function initRouter(renderPage) {
  window.addEventListener('hashchange', () => handleRoute(renderPage));
  handleRoute(renderPage);
}

export function navigate(path) {
  window.location.hash = '#' + path;
}

async function handleRoute(renderPage) {
  const hash = window.location.hash || '#/';
  const rawPath = hash.slice(1).split('?')[0] || '/';
  const queryString = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const queryParams = parseQuery(queryString);

  let matched = null;
  let params = {};

  for (const route of routes) {
    const m = rawPath.match(route.pattern);
    if (m) {
      matched = route;
      if (route.paramIdx !== undefined) {
        params.id = m[1];
      } else if (route.page === 'portal') {
        params.token = m[1];
      }
      break;
    }
  }

  if (!matched) {
    matched = { page: '404', public: true };
  }

  if (!matched.public) {
    const session = await getSession();
    if (!session) {
      window.location.hash = '#/login';
      return;
    }
  }

  if (matched.page === 'portal') {
    document.body.classList.add('portal-theme');
  } else {
    document.body.classList.remove('portal-theme');
  }

  if (typeof currentPageCleanup === 'function') {
    currentPageCleanup();
    currentPageCleanup = null;
  }

  const result = await renderPage(matched.page, { ...params, ...queryParams });
  if (typeof result === 'function') {
    currentPageCleanup = result;
  }

  window.scrollTo(0, 0);
}

function parseQuery(qs) {
  const params = {};
  if (!qs) return params;
  qs.split('&').forEach(p => {
    const [k, v] = p.split('=');
    if (k) params[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
  });
  return params;
}
