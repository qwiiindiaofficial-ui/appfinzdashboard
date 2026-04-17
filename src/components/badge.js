const leadStatusMap = {
  new: { label: 'New', cls: 'badge-gray' },
  contacted: { label: 'Contacted', cls: 'badge-blue' },
  qualified: { label: 'Qualified', cls: 'badge-cyan' },
  proposal_sent: { label: 'Proposal Sent', cls: 'badge-yellow' },
  negotiation: { label: 'Negotiation', cls: 'badge-orange' },
  won: { label: 'Won', cls: 'badge-green' },
  lost: { label: 'Lost', cls: 'badge-red' },
};

const priorityMap = {
  low: { label: 'Low', cls: 'badge-gray' },
  medium: { label: 'Medium', cls: 'badge-blue' },
  high: { label: 'High', cls: 'badge-orange' },
  critical: { label: 'Critical', cls: 'badge-red' },
  urgent: { label: 'Urgent', cls: 'badge-red' },
};

const projectStatusMap = {
  planning: { label: 'Planning', cls: 'badge-gray' },
  in_progress: { label: 'In Progress', cls: 'badge-blue' },
  on_hold: { label: 'On Hold', cls: 'badge-yellow' },
  review: { label: 'Review', cls: 'badge-cyan' },
  completed: { label: 'Completed', cls: 'badge-green' },
  cancelled: { label: 'Cancelled', cls: 'badge-red' },
};

const invoiceStatusMap = {
  draft: { label: 'Draft', cls: 'badge-gray' },
  sent: { label: 'Sent', cls: 'badge-blue' },
  viewed: { label: 'Viewed', cls: 'badge-cyan' },
  partially_paid: { label: 'Partial', cls: 'badge-yellow' },
  paid: { label: 'Paid', cls: 'badge-green' },
  overdue: { label: 'Overdue', cls: 'badge-red' },
  cancelled: { label: 'Cancelled', cls: 'badge-gray' },
  refunded: { label: 'Refunded', cls: 'badge-teal' },
};

const clientStatusMap = {
  active: { label: 'Active', cls: 'badge-green' },
  inactive: { label: 'Inactive', cls: 'badge-gray' },
  churned: { label: 'Churned', cls: 'badge-red' },
};

const requestStatusMap = {
  open: { label: 'Open', cls: 'badge-blue' },
  in_review: { label: 'In Review', cls: 'badge-yellow' },
  in_progress: { label: 'In Progress', cls: 'badge-cyan' },
  resolved: { label: 'Resolved', cls: 'badge-green' },
  closed: { label: 'Closed', cls: 'badge-gray' },
};

const taskStatusMap = {
  pending: { label: 'Pending', cls: 'badge-gray' },
  in_progress: { label: 'In Progress', cls: 'badge-blue' },
  completed: { label: 'Completed', cls: 'badge-green' },
  cancelled: { label: 'Cancelled', cls: 'badge-red' },
  deferred: { label: 'Deferred', cls: 'badge-yellow' },
};

function makeBadge(map, value) {
  const item = map[value] || { label: value || '-', cls: 'badge-gray' };
  return `<span class="badge ${item.cls}">${item.label}</span>`;
}

export function leadStatusBadge(status) { return makeBadge(leadStatusMap, status); }
export function priorityBadge(priority) { return makeBadge(priorityMap, priority); }
export function projectStatusBadge(status) { return makeBadge(projectStatusMap, status); }
export function invoiceStatusBadge(status) { return makeBadge(invoiceStatusMap, status); }
export function clientStatusBadge(status) { return makeBadge(clientStatusMap, status); }
export function requestStatusBadge(status) { return makeBadge(requestStatusMap, status); }
export function taskStatusBadge(status) { return makeBadge(taskStatusMap, status); }

export const LEAD_STATUSES = Object.entries(leadStatusMap).map(([v, { label }]) => ({ value: v, label }));
export const PRIORITIES = Object.entries(priorityMap).map(([v, { label }]) => ({ value: v, label }));
export const PROJECT_STATUSES = Object.entries(projectStatusMap).map(([v, { label }]) => ({ value: v, label }));
export const INVOICE_STATUSES = Object.entries(invoiceStatusMap).map(([v, { label }]) => ({ value: v, label }));
export const CLIENT_STATUSES = Object.entries(clientStatusMap).map(([v, { label }]) => ({ value: v, label }));
export const REQUEST_STATUSES = Object.entries(requestStatusMap).map(([v, { label }]) => ({ value: v, label }));
export const TASK_STATUSES = Object.entries(taskStatusMap).map(([v, { label }]) => ({ value: v, label }));
