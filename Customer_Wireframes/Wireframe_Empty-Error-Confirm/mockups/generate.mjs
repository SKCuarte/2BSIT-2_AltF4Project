// Generates the S2-UIX-04 standardized-state boards.
// Run: node generate.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const ICONS = {
  dashboard: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  customer: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5a3.5 3.5 0 0 1 0 6.5M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  product: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  hr: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/>',
  sales: '<path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-7"/>',
  reports: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  users: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  searchOff: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/><path d="M8.2 8.2l4.6 4.6M12.8 8.2l-4.6 4.6"/>',
  box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
  alert: '<path d="M12 3.5l9 16.5H3z"/><path d="M12 9.5v5M12 17.5h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  retry: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  check: '<path d="M4 12.5l5 5L20 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  arrow: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

const page = (title, bodyClass, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${title} | Hope, Inc. ERP</title>
<link rel="stylesheet" href="states.css">
</head>
<body class="${bodyClass}">
${body}
</body>
</html>`;

const NAV = [
  ['dashboard', 'Dashboard'],
  ['customer', 'Customer'],
  ['product', 'Product'],
  ['hr', 'Human Resources'],
  ['sales', 'Sales'],
  ['reports', 'Reports'],
  ['users', 'User Management'],
];

const sidebar = (active) => `<aside class="sidebar">
  <div class="brand"><span class="brand-mark">H</span>Hope, Inc. ERP</div>
  <nav class="nav">
    ${NAV.map(([k, l]) => `<div class="nav-item ${k === active ? 'on' : ''}">${icon(k)}${l}</div>`).join('\n    ')}
  </nav>
  <div class="side-user"><span class="avatar">S</span><span class="who"><b>Super Admin</b><span>Super Admin</span></span><span class="logout">Log out</span></div>
</aside>`;

const topbar = (title, role) => `<div class="topbar">
  <div class="topbar-left"><span class="hamburger">${icon('menu')}</span><span class="top-title">${title}</span></div>
  <span class="role-badge">${role}</span>
</div>`;

const shell = ({ active = 'product', title = 'Product', body = '', role = 'Super Admin' }) =>
  `<div class="app">${sidebar(active)}<div class="main">${topbar(title, role)}<div class="content"><div class="content-inner">${body}</div></div></div></div>`;

const stage = (appHtml, overlay, deep = false) =>
  `<div class="stage${deep ? ' deep' : ''}">${appHtml}<div class="backdrop"></div>${overlay}</div>`;

const options = (values, selected) => values.map((v) => `<option${v === selected ? ' selected' : ''}>${v}</option>`).join('');

/* ---------------------------------------------------------------- data ---- */

const CUSTOMERS = [
  { id: 'C-001', name: 'Acme Corporation', address: '123 Main St, Metro City', terms: 'Net 30', status: 'Active' },
  { id: 'C-002', name: 'Globex Industries', address: '456 Oak Ave, Harbor Town', terms: 'Net 45', status: 'Active' },
  { id: 'C-003', name: 'Initech LLC', address: '789 Pine Rd, Silicon Valley', terms: 'COD', status: 'Active' },
  { id: 'C-005', name: 'Stark Enterprises', address: '200 Park Avenue, New York', terms: 'Net 15', status: 'Active' },
  { id: 'C-004', name: 'Umbrella Corp', address: '1 Raccoon City Blvd', terms: 'Prepaid', status: 'Inactive' },
];

const PRODUCTS = [
  { id: 'P-001', name: 'Industrial Widget A', unit: 'pcs', price: '$13.75', eff: '2026-10-01', status: 'Active' },
  { id: 'P-002', name: 'Steel Bracket Heavy', unit: 'pcs', price: '$48.50', eff: '2026-10-01', status: 'Active' },
  { id: 'P-003', name: 'Lubricant Oil 5L', unit: 'can', price: '$28.00', eff: '2026-02-01', status: 'Active' },
  { id: 'P-004', name: 'Safety Gloves XL', unit: 'pair', price: '', eff: '', status: 'Inactive' },
  { id: 'P-005', name: 'Copper Wire 2.5mm', unit: 'meter', price: '$2.35', eff: '2026-10-05', status: 'Active' },
];

/* ---------------------------------------------------------- components ---- */

const pill = (s) => `<span class="pill ${s === 'Active' ? 'active' : s === 'Inactive' ? 'inactive' : 'neutral'}"><span class="dot"></span>${s}</span>`;

function customerTable(rows) {
  return `<div class="table-card"><table>
  <thead><tr><th>Customer ID</th><th>Customer name</th><th>Address</th><th>Payment terms</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
  <tbody>
  ${rows.map((r) => `<tr>
    <td class="id">${r.id}</td>
    <td><a class="link" href="#">${r.name}</a></td>
    <td>${r.address}</td>
    <td>${r.terms}</td>
    <td>${pill(r.status)}</td>
    <td><div class="row-actions">
      <button class="btn btn-outline btn-sm">Edit <span class="perm">E</span></button>
      ${r.status === 'Active'
        ? '<button class="btn btn-danger btn-sm">Deactivate <span class="perm">D</span></button>'
        : '<button class="btn btn-primary btn-sm">Restore <span class="perm">R</span></button>'}
    </div></td>
  </tr>`).join('\n  ')}
  </tbody></table></div>`;
}

function productTable(rows) {
  return `<div class="table-card"><table>
  <thead><tr><th>Product ID</th><th>Product</th><th>Unit</th><th>Current price</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
  <tbody>
  ${rows.map((r) => `<tr>
    <td class="id">${r.id}</td>
    <td><a class="link" href="#">${r.name}</a></td>
    <td>${r.unit}</td>
    <td>${r.price ? `<span class="price-cell"><b>${r.price}</b><small>effective ${r.eff}</small></span>` : '<span class="price-cell none"><b>No current price</b><small>not set</small></span>'}</td>
    <td>${pill(r.status)}</td>
    <td><div class="row-actions">
      <button class="btn btn-outline btn-sm">View</button>
      <button class="btn btn-outline btn-sm">Edit <span class="perm">E</span></button>
      <button class="btn btn-outline btn-sm">Price History</button>
      ${r.status === 'Active'
        ? '<button class="btn btn-danger btn-sm">Deactivate <span class="perm">D</span></button>'
        : '<button class="btn btn-primary btn-sm">Restore <span class="perm">R</span></button>'}
    </div></td>
  </tr>`).join('\n  ')}
  </tbody></table></div>`;
}

function priceTable(rows) {
  return `<div class="table-card"><table>
  <thead><tr><th>Effective date</th><th class="numeric">Unit price</th><th>Status</th><th>Last updated</th><th style="text-align:right">Actions</th></tr></thead>
  <tbody>
  ${rows.map((r) => `<tr class="${r.current ? 'history-current' : ''}">
    <td class="id">${r.date}</td>
    <td class="numeric"><b>${r.price}</b></td>
    <td><span class="pill ${r.label === 'Current' ? 'current' : 'neutral'}"><span class="dot"></span>${r.label}</span></td>
    <td class="stamp">${r.stamp}</td>
    <td><div class="row-actions">
      <button class="btn btn-outline btn-sm">Edit <span class="perm">E</span></button>
      <button class="btn btn-danger btn-sm">Delete <span class="perm">D</span></button>
    </div></td>
  </tr>`).join('\n  ')}
  </tbody></table></div>`;
}

const banner = ({ tone = 'danger', iconName = 'alert', title, copy, actions = '', list = '' }) => `<div class="banner ${tone}" role="alert">
  <span class="banner-icon">${icon(iconName)}</span>
  <div class="banner-body"><b>${title}</b><p>${copy}</p>${list}</div>
  ${actions ? `<div class="banner-actions">${actions}</div>` : ''}
</div>`;

const emptyState = ({ kind = 'empty', title, copy, action, hint = '' }) => `<div class="empty-state">
  <span class="empty-icon">${icon(kind === 'empty' ? 'box' : 'searchOff')}</span>
  <h3>${title}</h3>
  <p>${copy}</p>
  ${hint ? `<p class="empty-hint">${hint}</p>` : ''}
  ${action ? `<button class="btn ${kind === 'empty' ? 'btn-primary' : 'btn-outline'}">${action}</button>` : ''}
</div>`;

/* ------------------------------------------------------------ page bodies -- */

function productListBody({ search = '', unit = 'All units', status = 'Active', clear = false, table = '', note = '', bannerHtml = '', sub = 'Active products with their unit and effective current price.' }) {
  return `<h1 class="view-title">Product</h1>
  <p class="view-sub">${sub}</p>
  <div class="toolbar">
    <div class="search-wrap">${icon('search')}<input class="input" value="${search}" placeholder="Search product ID or name"></div>
    <select class="select">${options(['All units', 'pc', 'ea', 'mtr', 'pkg', 'ltr', 'pcs', 'pair', 'can', 'meter'], unit)}</select>
    <select class="select">${options(['Active', 'All statuses', 'Inactive'], status)}</select>
    ${clear ? '<button class="btn btn-outline">Clear filters</button>' : ''}
    <button class="btn btn-primary">Add product <span class="perm">A</span></button>
  </div>
  ${bannerHtml}
  ${table}
  ${note ? `<p class="result-note">${note}</p>` : ''}`;
}

function customerListBody({ search = '', status = 'Active', terms = 'All payment terms', clear = false, table = '', note = '', bannerHtml = '', sub = 'Active customers. Search by name or ID, then narrow by status or payment terms.' }) {
  return `<h1 class="view-title">Customer</h1>
  <p class="view-sub">${sub}</p>
  <div class="toolbar">
    <div class="search-wrap">${icon('search')}<input class="input" value="${search}" placeholder="Search customer name or ID"></div>
    <select class="select">${options(['Active', 'All statuses', 'Inactive'], status)}</select>
    <select class="select">${options(['All payment terms', 'Net 15', 'Net 30', 'Net 45', 'COD', 'Prepaid'], terms)}</select>
    ${clear ? '<button class="btn btn-outline">Clear filters</button>' : ''}
    <button class="btn btn-primary">Add customer <span class="perm">A</span></button>
  </div>
  ${bannerHtml}
  ${table}
  ${note ? `<p class="result-note">${note}</p>` : ''}`;
}

function field({ label, value = '', placeholder = '', error = '', select = false, opts = [], disabled = false, span2 = false, hint = '' }) {
  return `<div class="field${span2 ? ' span-2' : ''}${error ? ' has-error' : ''}">
    <label>${label}${error ? '' : ''}</label>
    ${select
      ? `<select class="select"${disabled ? ' disabled' : ''}>${options(opts, value)}</select>`
      : `<input class="input" value="${value}" placeholder="${placeholder}"${disabled ? ' disabled' : ''}>`}
    ${hint ? `<span class="hint">${hint}</span>` : ''}
    ${error ? `<span class="error-msg">${error}</span>` : ''}
  </div>`;
}

function productFormBody({ errors = false, summary = false, apiError = false } = {}) {
  return `<a class="back-link">${icon('arrow')}Back to product list</a>
  <div class="panel">
    <div class="form-head">
      <div><h2>Add product</h2><p>Identity and unit only. Prices are added through Price History.</p></div>
      <span class="pill neutral"><span class="dot"></span>New record</span>
    </div>
    ${summary ? banner({
      tone: 'danger', iconName: 'alert', title: 'Check 3 fields before saving.',
      copy: 'The form was not saved. Jump to the first field that needs attention.',
      list: '<ul class="banner-list"><li><a href="#">Product ID</a> — required</li><li><a href="#">Product name</a> — required</li><li><a href="#">Unit</a> — choose a unit of measure</li></ul>',
    }) + '' : ''}
    ${apiError ? banner({
      tone: 'danger', iconName: 'alert', title: 'We couldn\u2019t save this product.',
      copy: 'Your entries are still here. Check your connection, then save again.',
    }) + '' : ''}
    <div class="form-grid">
      ${field({ label: 'Product ID', placeholder: 'P-006', error: errors ? 'Product ID is required.' : '', hint: errors ? '' : 'Up to 6 characters.' })}
      ${field({ label: 'Product name', placeholder: 'e.g. Safety Goggles', error: errors ? 'Product name is required.' : '' })}
      ${field({ label: 'Unit', select: true, value: errors ? 'Select a unit' : 'pcs', opts: ['Select a unit', 'pc', 'ea', 'mtr', 'pkg', 'ltr', 'pcs', 'pair', 'can', 'meter'], error: errors ? 'Choose a unit of measure.' : '' })}
      ${field({ label: 'Status', select: true, value: 'Active', opts: ['Active'], disabled: true, hint: 'Set by the system. Changed only by deactivation.' })}
    </div>
    <div class="form-note">Current price is not entered here. Add an effective-dated price from Price History after saving.</div>
    <div class="form-actions">
      <button class="btn btn-primary">Save product</button>
      <button class="btn btn-outline">Cancel</button>
    </div>
  </div>`;
}

function customerFormBody({ apiError = false } = {}) {
  return `<a class="back-link">${icon('arrow')}Back to customer list</a>
  <div class="panel">
    <div class="form-head">
      <div><h2>Edit customer</h2><p>Update the customer record. Status is changed only by deactivate or restore.</p></div>
      <span class="pill active"><span class="dot"></span>Active</span>
    </div>
    ${apiError ? banner({
      tone: 'danger', iconName: 'alert', title: 'We couldn\u2019t save this customer.',
      copy: 'Your entries are still here. Check your connection, then save again.',
    }) : ''}
    <div class="form-grid">
      ${field({ label: 'Customer ID', value: 'C-001', disabled: true, hint: 'Primary key. Read-only after creation.' })}
      ${field({ label: 'Customer name', value: 'Acme Corporation' })}
      ${field({ label: 'Payment terms', select: true, value: 'Net 30', opts: ['Net 15', 'Net 30', 'Net 45', 'COD', 'Prepaid'] })}
      ${field({ label: 'Status', select: true, value: 'Active', opts: ['Active'], disabled: true })}
      ${field({ label: 'Address', value: '123 Main St, Metro City', span2: true })}
    </div>
    <div class="form-actions">
      <button class="btn btn-primary">Save changes</button>
      <button class="btn btn-outline">Cancel</button>
    </div>
  </div>`;
}

function priceModal({ empty = false, apiError = false, rows = [], product = P001 } = {}) {
  return `<div class="modal${empty || apiError ? ' state' : ''}">
    <div class="modal-head">
      <div><h2>Price History: ${product.id}</h2><p>${product.name} · ${product.unit} · ${product.status}</p></div>
      <button class="btn btn-outline btn-sm">Close</button>
    </div>
    <div class="modal-toolbar">
      <span class="current-strip">${empty ? 'No current price' : 'Current: $13.75'} <small>${empty ? 'not set' : 'as of 2026-11-24'}</small></span>
    </div>
    <div class="modal-body">
      ${apiError ? banner({
        tone: 'danger', iconName: 'alert', title: 'We couldn\u2019t load price history.',
        copy: 'The server didn\u2019t respond. No prices were changed.',
        actions: `<button class="btn btn-outline btn-sm">${icon('retry')} Retry</button>`,
      }) : ''}
      ${empty ? emptyState({
        kind: 'empty', title: 'No prices recorded yet',
        copy: 'This product has no effective-dated price. Add the first one so sales can use it.',
        action: 'Add price',
      }).replace('class="empty-state"', 'class="empty-state in-modal"') : ''}
      ${!empty && !apiError ? priceTable(rows) : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline">Close</button></div>
  </div>`;
}

/* --------------------------------------------------------------- dialogs --- */

const confirmDialog = ({ tone = 'danger', title, sub, body = '', actions }) => `<div class="dialog">
  <div class="dialog-head">
    <span class="dialog-icon ${tone === 'danger' ? 'danger' : 'warn'}">${tone === 'danger' ? '!' : '!'}</span>
    <div><h2>${title}</h2><p class="sub">${sub}</p></div>
  </div>
  ${body ? `<div class="dialog-body">${body}</div>` : ''}
  <div class="dialog-actions">${actions}</div>
</div>`;

/* ----------------------------------------------------------------- boards -- */

const boards = [];

/* Cover */
boards.push(['00-cover', page('Cover', '', `
<div class="board cover">
  <div class="cover-top"><span class="brand-mark">H</span>Hope, Inc. ERP</div>
  <div class="cover-main">
    <div>
      <p class="eyebrow">S2-UIX-04 · STANDARDIZED UI STATES</p>
      <h1>Empty, error &amp; confirm states</h1>
      <p class="lead">Reusable state patterns for empty tables, no-result searches, form and API errors, soft-delete confirmation and child-record delete blocking — shown on the real Customer, Product and Price History screens.</p>
      <dl class="cover-meta">
        <div><dt>Issue</dt><dd>#113 · [S2-UIX-04]</dd></div>
        <div><dt>Modules</dt><dd>Customer · Product · Price History</dd></div>
        <div><dt>Viewports</dt><dd>1440 × 900 · 390 × 844</dd></div>
        <div><dt>Date</dt><dd>2026-11-24</dd></div>
        <div><dt>Source</dt><dd>S2-UIX-03 mockups + design system</dd></div>
        <div><dt>Status</dt><dd>For design review</dd></div>
      </dl>
    </div>
    <div>
      <div class="state-card" style="margin-bottom:12px">
        <div class="top"><h3>Four patterns, one vocabulary</h3></div>
        <p style="margin-top:0">Empty · Error · Confirm · Blocked. Each board applies one pattern to a real module screen, so the pattern is judged in context rather than as an isolated box.</p>
      </div>
      <div class="state-card">
        <div class="top"><h3>Two different empty states</h3></div>
        <p style="margin-top:0"><b>Empty table</b> means no records exist — the action creates one. <b>No results</b> means records exist but the filters exclude them — the action clears the filters.</p>
      </div>
    </div>
  </div>
  <div class="cover-foot"><span>Hope, Inc. ERP · UI/UX Sprint 2</span><span>Design system source: “Design System and visual foundation for the Hope, Inc”</span></div>
</div>`)]);

/* State index */
const indexCol = (title, items) => `<div class="legend-col"><h3>${title}</h3>${items.map(([n, t]) => `<div class="legend-item"><b>${n}</b><span>${t}</span></div>`).join('')}</div>`;
boards.push(['01-state-index', page('State index', '', `
<div class="board legend">
  <h1>State index</h1>
  <p class="lead">Every board below applies one standardized state to a live module screen. The full trigger/message/action specification is in <code>STATE-SPEC.md</code>.</p>
  <div class="legend-grid">
    ${indexCol('Empty states', [
      ['01', 'Product list — no records yet'],
      ['02', 'Product list — filters match nothing'],
      ['03', 'Customer list — no records yet'],
      ['04', 'Customer list — filters match nothing'],
      ['05', 'Price History — no price rows'],
    ])}
    ${indexCol('Error states', [
      ['06', 'Product form — field errors only'],
      ['07', 'Product form — summary + field errors'],
      ['08', 'Product list — API load failure'],
      ['09', 'Customer form — save failed'],
      ['10', 'Price History — load failed'],
    ])}
    ${indexCol('Confirm & blocked', [
      ['11', 'Soft-delete — customer'],
      ['12', 'Soft-delete — product'],
      ['13', 'Soft-delete — price row'],
      ['14', 'Blocked — customer has sales'],
      ['15', 'Blocked — product has children'],
    ])}
  </div>
  <div class="legend-grid" style="margin-top:22px">
    ${indexCol('Phone states (390 × 844)', [
      ['16', 'Empty product list'],
      ['17', 'No-result customer search'],
      ['18', 'Soft-delete confirmation'],
      ['19', 'Blocked product delete'],
    ])}
    ${indexCol('Rules applied', [
      ['R1', 'Empty ≠ no results'],
      ['R2', 'Summary + field errors together'],
      ['R3', 'API error keeps entered values'],
      ['R4', 'Blocked names the child records'],
    ])}
    ${indexCol('Tokens', [
      ['T1', 'Danger #c0392b / #fdecea'],
      ['T2', 'Warning #8a5200 / #fff3d6'],
      ['T3', 'Info #2458a6 / #eaf2ff'],
      ['T4', 'Radius 10 / 14 / 18 px'],
    ])}
  </div>
  <div class="legend-note"><b>Scope note.</b> Copy in this deck is proposed where the issue, linked tickets or database do not define it. No new colour, type size or radius was introduced; each state is composed from the approved tokens and existing primitives (card, table, dialog, badge, button, input).</div>
</div>`)]);

/* 01 — product empty */
boards.push(['empty-state_product-list', page('Product list — empty', '', shell({
  active: 'product', title: 'Product',
  body: productListBody({
    table: emptyState({
      kind: 'empty', title: 'No products yet',
      copy: 'Products you add will appear here with their unit and effective current price.',
      action: 'Add product',
    }),
  }),
}))]);

/* 02 — product no results */
boards.push(['no-results_product-list', page('Product list — no results', '', shell({
  active: 'product', title: 'Product',
  body: productListBody({
    search: 'gasket', clear: true,
    table: emptyState({
      kind: 'no-results', title: 'No products match your filters',
      copy: 'Nothing matches “gasket” with the current unit and status filters.',
      action: 'Clear filters',
    }),
    note: '0 results for “gasket”.',
  }),
}))]);

/* 03 — customer empty */
boards.push(['empty-state_customer-list', page('Customer list — empty', '', shell({
  active: 'customer', title: 'Customer',
  body: customerListBody({
    table: emptyState({
      kind: 'empty', title: 'No customers yet',
      copy: 'Customers you add will appear here with their payment terms and status.',
      action: 'Add customer',
    }),
  }),
}))]);

/* 04 — customer no results */
boards.push(['no-results_customer-list', page('Customer list — no results', '', shell({
  active: 'customer', title: 'Customer',
  body: customerListBody({
    search: 'acme', terms: 'Net 45', clear: true,
    table: emptyState({
      kind: 'no-results', title: 'No customers match your filters',
      copy: 'Nothing matches “acme” with Net 45 payment terms.',
      action: 'Clear filters',
    }),
    note: '0 results for “acme” with Net 45.',
  }),
}))]);

/* 05 — price history empty */
function productDetail({ id, name, unit, status, price = '', eff = '' }) {
  return shell({
    active: 'product', title: 'Product',
    body: `<a class="back-link">${icon('arrow')}Back to product list</a>
  <div class="detail-head"><h2>${name}</h2>${pill(status)}</div>
  <p class="view-sub">${id} · ${unit}</p>
  <div class="current-price-card">${price
    ? `<span class="amount">${price}</span><span class="meta"><b>Current price</b><span>effective ${eff}</span></span>`
    : `<span class="amount" style="font-size:20px;color:var(--color-warning)">No current price</span><span class="meta"><b>Not set</b><span>No active effective-dated price</span></span>`}</div>`,
  });
}

const P004 = { id: 'P-004', name: 'Safety Gloves XL', unit: 'pair', status: 'Inactive' };
const P001 = { id: 'P-001', name: 'Industrial Widget A', unit: 'pcs', status: 'Active' };
const detailP004 = productDetail(P004);
const detailP001 = productDetail({ ...P001, price: '$13.75', eff: '2026-10-01' });
boards.push(['empty-state_price-history', page('Price History — empty', '', stage(detailP004, priceModal({ empty: true, product: P004 })))]);

/* 06 — field errors only */
boards.push(['error-field-validation_product-form', page('Product form — field errors', '', shell({
  active: 'product', title: 'Product',
  body: productFormBody({ errors: true }),
}))]);

/* 07 — summary + field errors */
boards.push(['error-summary_product-form', page('Product form — summary', '', shell({
  active: 'product', title: 'Product',
  body: productFormBody({ errors: true, summary: true }),
}))]);

/* 08 — API load failure, product list */
boards.push(['error-api_product-list', page('Product list — load failed', '', shell({
  active: 'product', title: 'Product',
  body: productListBody({
    bannerHtml: banner({
      tone: 'danger', iconName: 'alert', title: 'We couldn\u2019t load products.',
      copy: 'The server didn\u2019t respond. Nothing was changed — try again in a moment.',
      actions: `<button class="btn btn-outline btn-sm">${icon('retry')} Retry</button>`,
    }),
    table: `<div class="table-card" style="padding:18px"><p class="hint" style="text-align:center">Product data is unavailable until the list loads.</p></div>`,
  }),
}))]);

/* 09 — API save failure, customer form */
boards.push(['error-api_customer-form', page('Customer form — save failed', '', shell({
  active: 'customer', title: 'Customer',
  body: customerFormBody({ apiError: true }),
}))]);

/* 10 — API load failure, price history */
boards.push(['error-api_price-history', page('Price History — load failed', '', stage(detailP001, priceModal({ apiError: true, product: P001 })))]);

/* 11 — confirm customer */
boards.push(['confirm-soft-delete_customer', page('Deactivate customer', '', stage(
  shell({ active: 'customer', title: 'Customer', body: customerListBody({ table: customerTable(CUSTOMERS.slice(0, 3)), note: 'Showing 4 active customers.' }) }),
  confirmDialog({
    tone: 'danger',
    title: 'Deactivate Acme Corporation?',
    sub: 'The customer will be marked Inactive and hidden from the active list. The record and its sales history are kept, and it can be restored later.',
    body: 'Existing sales records are not changed.',
    actions: '<button class="btn btn-outline">Cancel</button><button class="btn btn-danger">Deactivate customer</button>',
  }),
))]);

/* 12 — confirm product */
boards.push(['confirm-soft-delete_product', page('Deactivate product', '', stage(
  shell({ active: 'product', title: 'Product', body: productListBody({ table: productTable(PRODUCTS.slice(0, 4)), note: 'Showing 4 active products.' }) }),
  confirmDialog({
    tone: 'danger',
    title: 'Deactivate Industrial Widget A?',
    sub: 'The product will be marked Inactive and hidden from the active list. Its price history is kept, and it can be restored later.',
    body: 'Existing sales lines and prices are not changed.',
    actions: '<button class="btn btn-outline">Cancel</button><button class="btn btn-danger">Deactivate product</button>',
  }),
))]);

/* 13 — confirm price delete */
const priceHistoryModal = `<div class="modal">
    <div class="modal-head"><div><h2>Price History: P-001</h2><p>Industrial Widget A · pcs · Active</p></div><button class="btn btn-outline btn-sm">Close</button></div>
    <div class="modal-toolbar"><span class="current-strip">Current: $13.75 <small>as of 2026-11-24</small></span></div>
    <div class="modal-body">${priceTable([{ date: '2026-10-01', price: '$13.75', label: 'Current', current: true, stamp: 'CREATED system 2026-10-01 9:00 AM' }])}</div>
    <div class="modal-foot"><button class="btn btn-outline">Close</button></div>
  </div>`;
const deletePriceDialog = `<div class="dialog small">
    <div class="dialog-head"><span class="dialog-icon danger">!</span><div><h2>Delete this price?</h2><p class="sub">The entry will be removed from this product\u2019s price history. The next applicable price becomes current if one exists.</p></div></div>
    <div class="context"><b>$13.75</b> · effective 2026-10-01 <span>· P-001</span></div>
    <div class="dialog-actions"><button class="btn btn-outline">Cancel</button><button class="btn btn-danger">Delete price</button></div>
  </div>`;
boards.push(['confirm-soft-delete_price-history', page('Delete price', '',
  `<div class="stage deep">${detailP001}<div class="backdrop"></div>${priceHistoryModal}${deletePriceDialog}</div>`)]);

/* 14 — blocked customer */
boards.push(['blocked-delete_customer', page('Customer delete blocked', '', stage(
  shell({ active: 'customer', title: 'Customer', body: customerListBody({ table: customerTable(CUSTOMERS.slice(0, 3)), note: 'Showing 4 active customers.' }) }),
  `<div class="dialog blocked">
    <div class="dialog-head">
      <span class="dialog-icon warn">!</span>
      <div><h2>Acme Corporation can\u2019t be deactivated</h2>
      <p class="sub">1 sales record uses this customer. Resolve or reassign it before deactivating.</p></div>
    </div>
    <div class="child-table">
      <table><thead><tr><th>Record</th><th>Reference</th><th>Date</th><th>Status</th></tr></thead>
      <tbody><tr><td>Sale</td><td class="num">T-001</td><td class="num">2026-10-01</td><td>${pill('Active')}</td></tr></tbody></table>
    </div>
    <p class="impact">The customer stays Active. No data was changed.</p>
    <div class="dialog-actions"><button class="btn btn-primary">Close</button></div>
  </div>`,
))]);

/* 15 — blocked product */
boards.push(['blocked-delete_product', page('Product delete blocked', '', stage(
  shell({ active: 'product', title: 'Product', body: productListBody({ table: productTable(PRODUCTS.slice(0, 4)), note: 'Showing 4 active products.' }) }),
  `<div class="dialog blocked">
    <div class="dialog-head">
      <span class="dialog-icon warn">!</span>
      <div><h2>Industrial Widget A can\u2019t be deactivated</h2>
      <p class="sub">3 records depend on this product: 2 sales lines and 1 price entry.</p></div>
    </div>
    <div class="child-table">
      <table><thead><tr><th>Record</th><th>Reference</th><th>Date</th><th>Detail</th></tr></thead>
      <tbody>
        <tr><td>Sales line</td><td class="num">T-001</td><td class="num">2026-10-01</td><td class="num">Qty 10</td></tr>
        <tr><td>Sales line</td><td class="num">T-003</td><td class="num">2026-10-08</td><td class="num">Qty 20</td></tr>
        <tr><td>Price entry</td><td class="num">—</td><td class="num">2026-10-01</td><td class="num">$13.75 · current</td></tr>
      </tbody></table>
    </div>
    <p class="impact">The product stays Active. No data was changed.</p>
    <div class="dialog-actions"><button class="btn btn-primary">Close</button></div>
  </div>`,
))]);

/* ---------------------------------------------------------------- phone ---- */

const phone = (title, body) => `<div class="phone">
  <div class="phone-top"><div class="left"><span class="hamburger">${icon('menu')}</span><span class="title">${title}</span></div><span class="role-badge">Super Admin</span></div>
  <div class="phone-body">${body}</div>
</div>`;

const phoneStage = (body, overlay = '') => `<div class="phone-stage">${phone('Product', body)}${overlay}</div>`;

/* 16 — phone empty product */
boards.push(['empty-state_product-list_mobile', page('Phone — empty products', 'phone-stage', phone('Product', `
  <h1 class="view-title">Product</h1>
  <p class="view-sub">Active products with their unit and current price.</p>
  <div class="toolbar">
    <div class="search-wrap">${icon('search')}<input class="input" placeholder="Search product ID or name"></div>
    <select class="select">${options(['All units', 'pcs', 'pair', 'meter'], 'All units')}</select>
    <select class="select">${options(['Active', 'All statuses', 'Inactive'], 'Active')}</select>
    <button class="btn btn-primary span-2">Add product</button>
  </div>
  <div class="empty-state">
    <span class="empty-icon">${icon('box')}</span>
    <h3>No products yet</h3>
    <p>Products you add will appear here with their unit and effective current price.</p>
    <button class="btn btn-primary">Add product</button>
  </div>
`))]);

/* 17 — phone no results */
boards.push(['no-results_customer-list_mobile', page('Phone — no results', 'phone-stage', phone('Customer', `
  <h1 class="view-title">Customer</h1>
  <p class="view-sub">Active customers.</p>
  <div class="toolbar">
    <div class="search-wrap">${icon('search')}<input class="input" value="acme" placeholder="Search customer name or ID"></div>
    <select class="select">${options(['Active', 'All statuses', 'Inactive'], 'Active')}</select>
    <select class="select">${options(['All payment terms', 'Net 30', 'Net 45'], 'Net 45')}</select>
    <button class="btn btn-outline span-2">Clear filters</button>
  </div>
  <div class="empty-state">
    <span class="empty-icon">${icon('searchOff')}</span>
    <h3>No customers match your filters</h3>
    <p>Nothing matches “acme” with Net 45 payment terms.</p>
    <button class="btn btn-outline">Clear filters</button>
  </div>
`))]);

/* 18 — phone confirm */
boards.push(['confirm-soft-delete_customer_mobile', page('Phone — confirm deactivate', 'phone-stage', `
  ${phone('Customer', `
    <h1 class="view-title">Customer</h1>
    <p class="view-sub">Active customers.</p>
    <div class="card-list" style="margin-top:14px">
      <div class="m-card"><div class="m-card-top"><span class="m-card-name">Acme Corporation</span>${pill('Active')}</div><div class="m-card-meta">C-001 · Net 30</div><div class="m-card-meta">123 Main St, Metro City</div><div class="row-actions"><button class="btn btn-outline btn-sm">Edit</button><button class="btn btn-danger btn-sm">Deactivate</button></div></div>
      <div class="m-card"><div class="m-card-top"><span class="m-card-name">Globex Industries</span>${pill('Active')}</div><div class="m-card-meta">C-002 · Net 45</div><div class="m-card-meta">456 Oak Ave, Harbor Town</div><div class="row-actions"><button class="btn btn-outline btn-sm">Edit</button><button class="btn btn-danger btn-sm">Deactivate</button></div></div>
    </div>`)}
  <div class="backdrop"></div>
  <div class="dialog">
    <div class="dialog-head"><span class="dialog-icon danger">!</span><div><h2>Deactivate Acme Corporation?</h2><p class="sub">Marked Inactive and hidden from the active list. The record is kept and can be restored later.</p></div></div>
    <div class="dialog-body">Existing sales records are not changed.</div>
    <div class="dialog-actions"><button class="btn btn-outline">Cancel</button><button class="btn btn-danger">Deactivate</button></div>
  </div>`)]);

/* 19 — phone blocked */
boards.push(['blocked-delete_product_mobile', page('Phone — blocked delete', 'phone-stage', `
  ${phone('Product', `
    <h1 class="view-title">Product</h1>
    <p class="view-sub">Active products.</p>
    <div class="card-list" style="margin-top:14px">
      <div class="m-card"><div class="m-card-top"><span class="m-card-name">Industrial Widget A</span>${pill('Active')}</div><div class="m-card-meta">P-001 · pcs · <b>$13.75</b></div><div class="row-actions"><button class="btn btn-outline btn-sm">Edit</button><button class="btn btn-danger btn-sm">Deactivate</button></div></div>
    </div>`)}
  <div class="backdrop"></div>
  <div class="dialog blocked">
    <div class="dialog-head"><span class="dialog-icon warn">!</span><div><h2>Industrial Widget A can\u2019t be deactivated</h2><p class="sub">3 records depend on this product.</p></div></div>
    <div class="child-table">
      <table><thead><tr><th>Record</th><th>Reference</th><th>Detail</th></tr></thead>
      <tbody>
        <tr><td>Sales line</td><td class="num">T-001</td><td class="num">Qty 10</td></tr>
        <tr><td>Sales line</td><td class="num">T-003</td><td class="num">Qty 20</td></tr>
        <tr><td>Price entry</td><td class="num">—</td><td class="num">2026-10-01 · $13.75</td></tr>
      </tbody></table>
    </div>
    <p class="impact">No data was changed.</p>
    <div class="dialog-actions"><button class="btn btn-primary">Close</button></div>
  </div>`)]);

/* ----------------------------------------------------------------- write --- */

for (const [name, html] of boards) {
  writeFileSync(join(here, `${name}.html`), html, 'utf8');
}
console.log(`Wrote ${boards.length} boards to ${here}`);
