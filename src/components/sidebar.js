import { getState, subscribe } from '../lib/store.js';
import { signOut } from '../lib/auth.js';
import { navigate } from '../router/index.js';
import { generateInitials, avatarColor } from '../lib/utils.js';
import { supabase } from '../lib/supabase.js';

const navItems = [
  { label: 'Dashboard', icon: dashIcon(), hash: '#/' },
  { label: 'Leads', icon: leadIcon(), hash: '#/leads', key: 'leads' },
  { label: 'Clients', icon: clientIcon(), hash: '#/clients', key: 'clients' },
  { label: 'Projects', icon: projectIcon(), hash: '#/projects', key: 'projects' },
  { label: 'Invoices', icon: invoiceIcon(), hash: '#/invoices', key: 'invoices' },
  { label: 'Tasks', icon: taskIcon(), hash: '#/tasks', key: 'tasks' },
  { label: 'Requests', icon: requestIcon(), hash: '#/requests', key: 'requests', badge: 'requests' },
];

let requestsChannel = null;

export function renderSidebar(container) {
  const profile = getState('currentProfile');
  container.innerHTML = buildHTML(profile);

  attachEvents(container);
  updateActiveLink(container);
  loadBadgeCounts(container);
  setupRealtime(container);

  window.addEventListener('hashchange', () => updateActiveLink(container));

  return () => {
    window.removeEventListener('hashchange', () => updateActiveLink(container));
    if (requestsChannel) { supabase.removeChannel(requestsChannel); requestsChannel = null; }
  };
}

function buildHTML(profile) {
  const initials = generateInitials(profile?.full_name || 'User');
  const color = avatarColor(profile?.full_name || 'User');
  return `
    <div class="sidebar-logo">
      <div class="sidebar-logo-mark">AF</div>
      <div class="sidebar-logo-text">
        <span class="sidebar-logo-name">AppFinz</span>
        <span class="sidebar-logo-sub">CRM</span>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-label">Menu</div>
      ${navItems.map(item => `
        <a class="nav-item" href="${item.hash}" data-key="${item.key || ''}">
          <span class="nav-item-icon">${item.icon}</span>
          <span class="nav-item-label">${item.label}</span>
          ${item.badge ? `<span class="nav-badge" id="badge-${item.badge}" style="display:none">0</span>` : ''}
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user" id="sidebar-user">
        <div class="user-avatar" style="background:${color}">${initials}</div>
        <div class="user-info">
          <div class="user-name">${profile?.full_name || 'User'}</div>
          <div class="user-role">${profile?.role || 'Staff'}</div>
        </div>
      </div>
      <a class="nav-item" href="#" id="sign-out-btn" style="margin-top:4px">
        <span class="nav-item-icon">${signOutIcon()}</span>
        <span class="nav-item-label" style="color:var(--color-danger)">Sign Out</span>
      </a>
    </div>
  `;
}

function attachEvents(container) {
  container.querySelector('#sign-out-btn').addEventListener('click', async e => {
    e.preventDefault();
    await signOut();
    window.location.hash = '#/login';
  });
}

function updateActiveLink(container) {
  const hash = window.location.hash || '#/';
  container.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    const href = el.getAttribute('href');
    if (href && href !== '#') {
      if (hash === href || (href !== '#/' && hash.startsWith(href.replace(/\/$/, '')))) {
        el.classList.add('active');
      }
    }
  });
}

async function loadBadgeCounts(container) {
  try {
    const { count } = await supabase
      .from('client_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    const badge = container.querySelector('#badge-requests');
    if (badge && count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = '';
      badge.classList.add('danger');
    }
  } catch { }
}

function setupRealtime(container) {
  requestsChannel = supabase
    .channel('sidebar_requests')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_requests' }, () => {
      loadBadgeCounts(container);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'client_requests' }, () => {
      loadBadgeCounts(container);
    })
    .subscribe();
}

function dashIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`; }
function leadIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`; }
function clientIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`; }
function projectIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`; }
function invoiceIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`; }
function taskIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`; }
function requestIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`; }
function signOutIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`; }
