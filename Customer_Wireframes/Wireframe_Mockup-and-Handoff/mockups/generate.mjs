// Generates the high-fidelity mockup HTML boards for the S2-UIX-03 package.
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
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  arrow: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
};
function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

function page(title, bodyClass, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${title} | Hope, Inc. ERP</title>
<link rel="stylesheet" href="mockup.css">
</head>
<body class="${bodyClass}">
${body}
</body>
</html>`;
}

const NAV = [
  ['dashboard', 'Dashboard'],
  ['customer', 'Customer'],
  ['product', 'Product'],
  ['hr', 'Human Resources'],
  ['sales', 'Sales'],
  ['reports', 'Reports'],
  ['users', 'User Management'],
];

function sidebar(active) {
  return `<aside class="sidebar">
  <div class="brand"><span class="brand-mark">H</span>Hope, Inc. ERP</div>
  <nav class="nav">
    ${NAV.map(([key, label]) => `<div class="nav-item ${key === active ? 'on' : ''}">${icon(key)}${label}</div>`).join('\n    ')}
  </nav>
  <div class="side-user"><span class="avatar">S</span><span class="who"><b>Super Admin</b><span>Super Admin</span></span><span class="logout">Log out</span></div>
</aside>`;
}

function topbar(title, role) {
  return `<div class="topbar">
  <div class="topbar-left"><span class="hamburger">${icon('menu')}</span><span class="top-title">${title}</span></div>
  <span class="role-badge">${role}</span>
</div>`;
}

function shell({ active = 'customer', title = 'Customer', sub = '', body = '', role = 'Super Admin' }) {
  return `<div class="app">${sidebar(active)}<div class="main">${topbar(title, role)}<div class="content"><div class="content-inner">${body}</div></div></div></div>`;
}

function stage(appHtml, overlay) {
  return `<div class="stage">${appHtml}<div class="backdrop"></div>${overlay}</div>`;
}

function options(values, selected) {
  return values.map(v => `<option${v === selected ? ' selected' : ''}>${v}</option>`).join('');
}

const CUSTOMERS = [
  { id: 'C-001', name: 'Acme Corporation', address: '123 Main St, Metro City', terms: 'Net 30', status: 'Active' },
  { id: 'C-002', name: 'Globex Industries', address: '456 Oak Ave, Harbor Town', terms: 'Net 45', status: 'Active' },
  { id: 'C-003', name: 'Initech LLC', address: '789 Pine Rd, Silicon Valley', terms: 'COD', status: 'Active' },
  { id: 'C-005', name: 'Stark Enterprises', address: '200 Park Avenue, New York', terms: 'Net 15', status: 'Active' },
  { id: 'C-004', name: 'Umbrella Corp', address: '1 Raccoon City Blvd', terms: 'Prepaid', status: 'Inactive' },
];

function customerTable(rows) {
  return `<div class="table-card"><table>
  <thead><tr><th>Customer ID</th><th>Customer name</th><th>Address</th><th>Payment terms</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
  <tbody>
  ${rows.map(r => `<tr>
    <td class="id">${r.id}</td>
    <td><a class="link" href="#">${r.name}</a></td>
    <td>${r.address}</td>
    <td>${r.terms}</td>
    <td><span class="pill ${r.status === 'Active' ? 'active' : 'inactive'}"><span class="dot"></span>${r.status}</span></td>
    <td><div class="row-actions">
      <button class="btn btn-outline btn-sm">Edit <span class="perm">E</span></button>
      ${r.status === 'Active'
        ? '<button class="btn btn-danger btn-sm">Deactivate <span class="perm">D</span></button>'
        : '<button class="btn btn-primary btn-sm">Restore <span class="perm">R</span></button>'}
    </div></td>
  </tr>`).join('\n  ')}
  </tbody></table></div>`;
}

function customerLegend() {
  return `<div class="perm-legend"><b>Permission key</b>
    <span class="key"><span class="perm">A</span> Add Customer</span>
    <span class="key"><span class="perm">E</span> Edit Customer</span>
    <span class="key"><span class="perm">D</span> Delete Customer</span>
    <span class="key"><span class="perm">R</span> Restore (mapping open)</span>
  </div>`;
}

function customerListBody({ rows, search = '', status = 'Active', terms = 'All payment terms', clear = false, note = '', sub = 'Active customers. Search by name or ID, then narrow by status or payment terms.' }) {
  return `<h1 class="view-title">Customer</h1>
  <p class="view-sub">${sub}</p>
  <div class="toolbar">
    <div class="search-wrap">${icon('search')}<input class="input" value="${search}" placeholder="Search customer name or ID"></div>
    <select class="select">${options(['Active', 'All statuses', 'Inactive'], status)}</select>
    <select class="select">${options(['All payment terms', 'Net 15', 'Net 30', 'Net 45', 'COD', 'Prepaid'], terms)}</select>
    ${clear ? '<button class="btn btn-outline">Clear filters</button>' : ''}
    <button class="btn btn-primary">Add customer <span class="perm">A</span></button>
  </div>
  ${customerTable(rows)}
  <p class="result-note">${note}</p>
  ${customerLegend()}`;
}

function emptyState({ title, copy, action = 'Clear filters' }) {
  return `<div class="empty-state">
    <span class="empty-icon">${icon('search')}</span>
    <h3>${title}</h3>
    <p>${copy}</p>
    <button class="btn btn-outline">${action}</button>
  </div>`;
}

const PRODUCTS = [
  { id: 'P-001', name: 'Industrial Widget A', unit: 'pcs', price: '$13.75', eff: 'Effective 2026-10-01', status: 'Active' },
  { id: 'P-002', name: 'Steel Bracket Heavy', unit: 'pcs', price: '$48.50', eff: 'Effective 2026-10-01', status: 'Active' },
  { id: 'P-003', name: 'Lubricant Oil 5L', unit: 'can', price: '$28.00', eff: 'Effective 2026-02-01', status: 'Active' },
  { id: 'P-005', name: 'Copper Wire 2.5mm', unit: 'meter', price: '$2.35', eff: 'Effective 2026-10-05', status: 'Active' },
  { id: 'P-004', name: 'Safety Gloves XL', unit: 'pair', price: null, eff: '', status: 'Inactive' },
];

function productTable(rows) {
  return `<div class="table-card"><table>
  <thead><tr><th>Product ID</th><th>Product</th><th>Unit</th><th>Current price</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
  <tbody>
  ${rows.map(r => `<tr>
    <td class="id">${r.id}</td>
    <td><a class="link" href="#">${r.name}</a></td>
    <td>${r.unit}</td>
    <td>${r.price
      ? `<span class="price-cell"><b>${r.price}</b><small>${r.eff}</small></span>`
      : '<span class="price-cell none"><b>No current price</b><small>Add an effective-date price</small></span>'}</td>
    <td><span class="pill ${r.status === 'Active' ? 'active' : 'inactive'}"><span class="dot"></span>${r.status}</span></td>
    <td><div class="row-actions">
      <button class="btn btn-outline btn-sm">View <span class="perm">V</span></button>
      ${r.status === 'Active' ? '<button class="btn btn-outline btn-sm">Edit <span class="perm">E</span></button>' : ''}
      <button class="btn btn-outline btn-sm">Price History <span class="perm">H</span></button>
      ${r.status === 'Active'
        ? '<button class="btn btn-danger btn-sm">Deactivate <span class="perm">D</span></button>'
        : '<button class="btn btn-primary btn-sm">Restore <span class="perm">R</span></button>'}
    </div></td>
  </tr>`).join('\n  ')}
  </tbody></table></div>`;
}

function productLegend() {
  return `<div class="perm-legend"><b>Permission key</b>
    <span class="key"><span class="perm">V</span> View / module access (open)</span>
    <span class="key"><span class="perm">A</span> Add Product</span>
    <span class="key"><span class="perm">E</span> Edit Product</span>
    <span class="key"><span class="perm">D</span> Delete Product</span>
    <span class="key"><span class="perm">R</span> Restore (open)</span>
    <span class="key"><span class="perm">H</span> Price History</span>
    <span class="key"><span class="perm">A+</span> Add Price</span>
    <span class="key"><span class="perm">E+</span> Edit Price</span>
    <span class="key"><span class="perm">D+</span> Delete Price</span>
  </div>`;
}

function productListBody({ rows, search = '', unit = 'All units', status = 'Active', clear = false, note = '' }) {
  return `<h1 class="view-title">Product</h1>
  <p class="view-sub">Active products and their effective current price.</p>
  <div class="toolbar">
    <div class="search-wrap">${icon('search')}<input class="input" value="${search}" placeholder="Search product ID or name"></div>
    <select class="select">${options(['All units', 'pc', 'ea', 'mtr', 'pkg', 'ltr', 'pcs', 'pair', 'can', 'meter'], unit)}</select>
    <select class="select">${options(['Active', 'Inactive', 'All statuses'], status)}</select>
    ${clear ? '<button class="btn btn-outline">Clear filters</button>' : ''}
    <button class="btn btn-primary">Add product <span class="perm">A</span></button>
  </div>
  ${productTable(rows)}
  <p class="result-note">${note}</p>
  ${productLegend()}`;
}

/* ---------------- Customer boards ---------------- */

const c01 = shell({
  active: 'customer', title: 'Customer',
  body: customerListBody({
    rows: CUSTOMERS.filter(c => c.status === 'Active'),
    note: 'Showing 4 active customers.',
  }),
});

const c02 = shell({
  active: 'customer', title: 'Customer',
  body: customerListBody({
    rows: [CUSTOMERS[0]],
    search: 'acme', terms: 'Net 30', clear: true,
    note: '1 result for “acme” with Net 30.',
    sub: 'Filters combine. Clear filters resets search, status and payment terms.',
  }),
});

const c03 = shell({
  active: 'customer', title: 'Customer',
  body: `<h1 class="view-title">Customer</h1>
  <p class="view-sub">Filters combine. Clear filters resets search, status and payment terms.</p>
  <div class="toolbar">
    <div class="search-wrap">${icon('search')}<input class="input" value="northwind" placeholder="Search customer name or ID"></div>
    <select class="select">${options(['Active', 'All statuses', 'Inactive'], 'Active')}</select>
    <select class="select">${options(['All payment terms', 'Net 15', 'Net 30', 'Net 45', 'COD', 'Prepaid'], 'All payment terms')}</select>
    <button class="btn btn-outline">Clear filters</button>
    <button class="btn btn-primary">Add customer <span class="perm">A</span></button>
  </div>
  ${emptyState({ title: 'No customers match your filters.', copy: 'Try a different name or ID, or clear the filters to see all active customers.' })}
  ${customerLegend()}`,
});

const c04 = shell({
  active: 'customer', title: 'Customer',
  body: customerListBody({
    rows: [CUSTOMERS[4]],
    status: 'Inactive',
    note: 'Showing 1 inactive customer.',
    sub: 'Inactive customers are kept. Restore returns the record to the active list.',
  }),
});

function customerForm({ mode = 'create', errors = false }) {
  const isEdit = mode === 'edit';
  return `<a class="back-link">${icon('arrow')}${isEdit ? 'Back to customer detail' : 'Back to customer list'}</a>
  <div class="panel">
    <div class="form-head">
      <div><h2>${isEdit ? 'Edit customer' : 'Add customer'}</h2>
      <p>${isEdit ? 'Acme Corporation · C-001' : 'Fields marked * are required.'}</p></div>
      ${isEdit ? '<span class="pill active"><span class="dot"></span>Active</span>' : '<span class="pill neutral">New record</span>'}
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Customer ID ${errors ? '' : '<span class="req">*</span>'}</label>
        <input class="input" value="${isEdit ? 'C-001' : errors ? 'C-001' : ''}" placeholder="e.g. C-006" ${isEdit ? 'disabled' : ''}>
        <span class="hint">${isEdit ? 'Record identifier.' : 'Up to 10 characters.'}</span>
        ${errors ? '<span class="error-msg">That customer ID is already in use.</span>' : ''}
      </div>
      <div class="field">
        <label>Customer name <span class="req">*</span></label>
        <input class="input" value="${isEdit ? 'Acme Corporation' : errors ? '' : ''}" placeholder="e.g. Acme Corporation">
        <span class="hint">Up to 100 characters.</span>
        ${errors ? '<span class="error-msg">Customer name is required.</span>' : ''}
      </div>
      <div class="field">
        <label>Payment terms <span class="req">*</span></label>
        <select class="select">${options(['Select payment terms', 'Net 15', 'Net 30', 'Net 45', 'COD', 'Prepaid'], isEdit || errors ? 'Net 30' : 'Select payment terms')}</select>
        <span class="hint">Values from the CUSTOMER.terms definition.</span>
      </div>
      <div class="field">
        <label>Status</label>
        <select class="select" disabled><option>Active</option></select>
        <span class="hint">Set automatically on create; changed only by Deactivate or Restore.</span>
      </div>
      <div class="field span-2">
        <label>Address</label>
        <input class="input" value="${isEdit || errors ? '123 Main St, Metro City' : ''}" placeholder="Street, city">
        <span class="hint">Optional. Up to 200 characters.</span>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary">${isEdit ? 'Save changes' : 'Save customer'}</button>
      <button class="btn btn-outline">Cancel</button>
    </div>
    ${!isEdit ? '<p class="form-note">Status is Active on create (database default). It changes only through Deactivate or Restore, not through this form.</p>' : ''}
  </div>
  ${isEdit ? `<div class="panel">
    <div class="form-head"><div><h2>Deactivate customer</h2><p>Hides the customer from the active list. The record is kept and can be restored.</p></div><button class="btn btn-danger">Deactivate <span class="perm">D</span></button></div>
  </div>` : ''}`;
}

const c05 = shell({ active: 'customer', title: 'Customer', body: customerForm({ mode: 'create' }) });
const c06 = shell({ active: 'customer', title: 'Customer', body: customerForm({ mode: 'create', errors: true }) });
const c07 = shell({ active: 'customer', title: 'Customer', body: customerForm({ mode: 'edit' }) });

const c08 = shell({
  active: 'customer', title: 'Customer',
  body: `<a class="back-link">${icon('arrow')}Back to customer list</a>
  <div class="detail-card">
    <div class="detail-head">
      <h2>Acme Corporation</h2>
      <span class="pill active"><span class="dot"></span>Active</span>
      <div class="row-actions">
        <button class="btn btn-outline btn-sm">Edit <span class="perm">E</span></button>
        <button class="btn btn-danger btn-sm">Deactivate <span class="perm">D</span></button>
      </div>
    </div>
    <dl class="detail-grid">
      <div class="detail-item"><dt>Customer ID</dt><dd>C-001</dd></div>
      <div class="detail-item"><dt>Payment terms</dt><dd>Net 30</dd></div>
      <div class="detail-item"><dt>Status</dt><dd>Active</dd></div>
      <div class="detail-item"><dt>Address</dt><dd>123 Main St, Metro City</dd></div>
      <div class="detail-item"><dt>Last updated</dt><dd>EDITED user1 2026-10-13 1:01 PM</dd></div>
    </dl>
  </div>
  <div class="info-note"><b>Related records are not shown.</b> Deactivation is blocked when related sales records exist (#92; SALES → CUSTOMER uses ON DELETE RESTRICT). The references do not define a related-records panel, so none is invented here.</div>`,
});

function dialog({ tone = 'danger', glyph = '!', title, sub, body = '', actions = '', small = false }) {
  return `<div class="dialog${small ? ' small' : ''}" role="dialog" aria-modal="true">
    <div class="dialog-head">
      <span class="dialog-icon ${tone}">${glyph}</span>
      <div><h2>${title}</h2><p class="sub">${sub}</p></div>
    </div>
    ${body ? `<div class="dialog-body">${body}</div>` : ''}
    <div class="dialog-actions">${actions}</div>
  </div>`;
}

const c09 = stage(shell({ active: 'customer', title: 'Customer', body: customerListBody({ rows: CUSTOMERS.filter(c => c.status === 'Active'), note: 'Showing 4 active customers.' }) }),
  dialog({
    tone: 'danger', glyph: '!', title: 'Deactivate Acme Corporation?',
    sub: 'The customer will be marked Inactive and hidden from the active list. The record is kept and can be restored.',
    body: 'Existing sales records are not changed.',
    actions: '<button class="btn btn-outline">Cancel</button><button class="btn btn-danger">Deactivate customer</button>',
  }));

const c10 = stage(shell({ active: 'customer', title: 'Customer', body: customerListBody({ rows: CUSTOMERS.filter(c => c.status === 'Active'), note: 'Showing 4 active customers.' }) }),
  dialog({
    tone: 'warn', glyph: '!', title: 'This customer can’t be deactivated',
    sub: 'Acme Corporation has related sales records. Resolve or reassign those records first, then try again.',
    body: 'The customer stays Active. No data is changed.',
    actions: '<button class="btn btn-primary">Close</button>',
  }));

const c11 = stage(shell({ active: 'customer', title: 'Customer', body: customerListBody({ rows: [CUSTOMERS[4]], status: 'Inactive', note: 'Showing 1 inactive customer.' }) }),
  dialog({
    tone: 'ok', glyph: '✓', title: 'Restore Umbrella Corp?',
    sub: 'The customer will be marked Active and appear in the active list again.',
    actions: '<button class="btn btn-outline">Cancel</button><button class="btn btn-primary">Restore customer</button>',
  }));

function phoneShell({ title, body, role = 'Super Admin' }) {
  return `<div class="phone">
    <div class="phone-top"><div class="left"><span class="hamburger">${icon('menu')}</span><span class="title">${title}</span></div><span class="role-badge">${role}</span></div>
    <div class="phone-body">${body}</div>
  </div>`;
}

const c12 = phoneShell({
  title: 'Customer',
  body: `<h1 class="view-title">Customer</h1>
  <p class="view-sub">Active customers.</p>
  <div class="toolbar">
    <div class="search-wrap">${icon('search')}<input class="input" placeholder="Search customer"></div>
    <select class="select"><option>Active</option><option>All statuses</option><option>Inactive</option></select>
    <select class="select"><option>All terms</option><option>Net 30</option><option>COD</option></select>
    <button class="btn btn-primary span-2">Add customer <span class="perm">A</span></button>
  </div>
  <div class="card-list">
    <div class="m-card">
      <div class="m-card-top"><span class="m-card-name">Acme Corporation</span><span class="pill active"><span class="dot"></span>Active</span></div>
      <div class="m-card-meta">C-001 · Net 30</div>
      <div class="m-card-meta">123 Main St, Metro City</div>
      <div class="row-actions"><button class="btn btn-outline btn-sm">Edit <span class="perm">E</span></button><button class="btn btn-danger btn-sm">Deactivate <span class="perm">D</span></button></div>
    </div>
    <div class="m-card">
      <div class="m-card-top"><span class="m-card-name">Globex Industries</span><span class="pill active"><span class="dot"></span>Active</span></div>
      <div class="m-card-meta">C-002 · Net 45</div>
      <div class="m-card-meta">456 Oak Ave, Harbor Town</div>
      <div class="row-actions"><button class="btn btn-outline btn-sm">Edit <span class="perm">E</span></button><button class="btn btn-danger btn-sm">Deactivate <span class="perm">D</span></button></div>
    </div>
    <div class="m-card">
      <div class="m-card-top"><span class="m-card-name">Umbrella Corp</span><span class="pill inactive"><span class="dot"></span>Inactive</span></div>
      <div class="m-card-meta">C-004 · Prepaid</div>
      <div class="m-card-meta">1 Raccoon City Blvd</div>
      <div class="row-actions"><button class="btn btn-outline btn-sm">Edit <span class="perm">E</span></button><button class="btn btn-primary btn-sm">Restore <span class="perm">R</span></button></div>
    </div>
  </div>`,
});

/* ---------------- Product boards ---------------- */

const p01 = shell({
  active: 'product', title: 'Product',
  body: productListBody({
    rows: PRODUCTS.filter(p => p.status === 'Active').concat(PRODUCTS.filter(p => p.status === 'Inactive')),
    note: 'Showing 4 active products and 1 inactive product.',
  }),
});

const p02 = shell({
  active: 'product', title: 'Product',
  body: `<h1 class="view-title">Product</h1>
  <p class="view-sub">Active products and their effective current price.</p>
  <div class="toolbar">
    <div class="search-wrap">${icon('search')}<input class="input" value="not found" placeholder="Search product ID or name"></div>
    <select class="select">${options(['All units', 'pc', 'ea', 'mtr', 'pkg', 'ltr', 'pcs', 'pair', 'can', 'meter'], 'All units')}</select>
    <select class="select">${options(['Active', 'Inactive', 'All statuses'], 'Active')}</select>
    <button class="btn btn-outline">Clear filters</button>
    <button class="btn btn-primary">Add product <span class="perm">A</span></button>
  </div>
  ${emptyState({ title: 'No products match your filters.', copy: 'Try another product name or ID, or clear the filters.' })}
  ${productLegend()}`,
});

function productForm({ mode = 'create', errors = false }) {
  const isEdit = mode === 'edit';
  return `<a class="back-link">${icon('arrow')}${isEdit ? 'Back to product detail' : 'Back to product list'}</a>
  <div class="panel">
    <div class="form-head">
      <div><h2>${isEdit ? 'Edit product' : 'Add product'}</h2>
      <p>${isEdit ? 'P-001 · Industrial Widget A' : 'Fields marked * are required.'}</p></div>
      ${isEdit ? '<span class="pill active"><span class="dot"></span>Active</span>' : '<span class="pill neutral">New record</span>'}
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Product ID ${isEdit ? '' : '<span class="req">*</span>'}</label>
        <input class="input" value="${isEdit ? 'P-001' : 'P-006'}" ${isEdit ? 'disabled' : ''}>
        <span class="hint">${isEdit ? 'Record identifier.' : 'Up to 6 characters.'}</span>
      </div>
      <div class="field">
        <label>Product name ${isEdit ? '' : '<span class="req">*</span>'}</label>
        <input class="input" value="${isEdit ? 'Industrial Widget A' : ''}" placeholder="e.g. Packing Tape">
        <span class="hint">Up to 30 characters.</span>
      </div>
      <div class="field ${errors ? 'has-error' : ''}">
        <label>Unit <span class="req">*</span></label>
        <select class="select">${options(['Select unit', 'pc', 'ea', 'mtr', 'pkg', 'ltr', 'pcs', 'pair', 'can', 'meter'], errors ? 'Select unit' : isEdit ? 'pcs' : 'Select unit')}</select>
        <span class="hint">One of the database CHECK values.</span>
        ${errors ? '<span class="error-msg">Unit is required and must be a valid unit of measure.</span>' : ''}
      </div>
      <div class="field">
        <label>${isEdit ? 'Current price' : 'Status'}</label>
        ${isEdit
          ? '<div class="readonly-value">$13.75 · effective 2026-10-01</div><span class="hint">Read-only; derived from Price History.</span>'
          : '<select class="select" disabled><option>Active</option></select><span class="hint">Set automatically on create.</span>'}
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary">${isEdit ? 'Save changes' : 'Save product'}</button>
      <button class="btn btn-outline">Cancel</button>
    </div>
    ${!isEdit ? '<p class="form-note">Price is not entered here. After the product exists, use Price History under Add/Edit Price rights. Current price is derived, not a Product column.</p>' : ''}
  </div>`;
}

const p03 = shell({ active: 'product', title: 'Product', body: productForm({ mode: 'create' }) });
const p04 = shell({ active: 'product', title: 'Product', body: productForm({ mode: 'edit', errors: true }) });

const p05 = shell({
  active: 'product', title: 'Product',
  body: `<a class="back-link">${icon('arrow')}Back to product list</a>
  <h1 class="view-title">Industrial Widget A</h1>
  <p class="view-sub">P-001 · Unit: pcs · Active</p>
  <div class="current-price-card">
    <div><div class="amount">$13.75</div><div class="meta"><span>Current price · effective 2026-10-01</span></div></div>
    <div class="spacer"></div>
    <span class="pill current">Current</span>
  </div>
  <div class="row-actions" style="justify-content:flex-start;margin-bottom:14px">
    <button class="btn btn-outline">Edit product <span class="perm">E</span></button>
    <button class="btn btn-primary">Open Price History <span class="perm">H</span></button>
    <button class="btn btn-danger">Deactivate <span class="perm">D</span></button>
  </div>
  <div class="detail-card">
    <dl class="detail-grid">
      <div class="detail-item"><dt>Product ID</dt><dd>P-001</dd></div>
      <div class="detail-item"><dt>Product name</dt><dd>Industrial Widget A</dd></div>
      <div class="detail-item"><dt>Unit</dt><dd>pcs</dd></div>
      <div class="detail-item"><dt>Status</dt><dd>Active</dd></div>
      <div class="detail-item"><dt>Last updated</dt><dd>CREATED system 2026-10-01 9:00 AM</dd></div>
      <div class="detail-item"><dt>Current price as of</dt><dd>2026-11-24</dd></div>
    </dl>
  </div>
  <div class="info-note"><b>Current price is derived.</b> Latest active PRICEHIST row where effective_date ≤ the display date. It is not a Product column and is changed only through Price History actions.</div>`,
});

const p06 = shell({
  active: 'product', title: 'Product',
  body: `<h1 class="view-title">Current-price indicator states</h1>
  <p class="view-sub">The indicator must distinguish a current price, a future-dated price, and no applicable price.</p>
  <div class="state-grid">
    <div class="state-card">
      <div class="top"><h3>Current</h3><span class="pill current">Current</span></div>
      <div class="value">$13.75</div>
      <p>Latest active row with effective_date ≤ 2026-11-24. Effective 2026-10-01.</p>
    </div>
    <div class="state-card">
      <div class="top"><h3>Future-dated</h3><span class="pill warning">Upcoming</span></div>
      <div class="value">$15.00</div>
      <p>Effective 2026-12-01. Scheduled, not current. The existing $13.75 remains current until then.</p>
    </div>
    <div class="state-card">
      <div class="top"><h3>No current price</h3><span class="pill inactive">Unavailable</span></div>
      <div class="value none">Not set</div>
      <p>No active row is effective on or before the display date. Never infer $0.00.</p>
    </div>
  </div>
  <div class="info-note"><b>Open decision:</b> #97 allows current price as of today or a selected display date. The mockups show “as of 2026-11-24”; no date selector is approved yet.</div>
  ${productLegend()}`,
});

const p07 = phoneShell({
  title: 'Product',
  body: `<h1 class="view-title">Product</h1>
  <p class="view-sub">Active products.</p>
  <div class="toolbar">
    <div class="search-wrap">${icon('search')}<input class="input" placeholder="Search product"></div>
    <select class="select"><option>All units</option><option>pcs</option><option>can</option></select>
    <select class="select"><option>Active</option><option>Inactive</option></select>
    <button class="btn btn-primary span-2">Add product <span class="perm">A</span></button>
  </div>
  <div class="card-list">
    <div class="m-card">
      <div class="m-card-top"><span class="m-card-name">Industrial Widget A</span><span class="pill active"><span class="dot"></span>Active</span></div>
      <div class="m-card-meta">P-001 · pcs · <b>$13.75</b> · eff. 2026-10-01</div>
      <div class="row-actions"><button class="btn btn-outline btn-sm">View <span class="perm">V</span></button><button class="btn btn-outline btn-sm">Edit <span class="perm">E</span></button><button class="btn btn-outline btn-sm">Price History <span class="perm">H</span></button><button class="btn btn-danger btn-sm">Deactivate <span class="perm">D</span></button></div>
    </div>
    <div class="m-card">
      <div class="m-card-top"><span class="m-card-name">Safety Gloves XL</span><span class="pill inactive"><span class="dot"></span>Inactive</span></div>
      <div class="m-card-meta">P-004 · pair · No current price</div>
      <div class="row-actions"><button class="btn btn-outline btn-sm">View <span class="perm">V</span></button><button class="btn btn-primary btn-sm">Restore <span class="perm">R</span></button><button class="btn btn-outline btn-sm">Price History <span class="perm">H</span></button></div>
    </div>
  </div>`,
});

/* ---------------- Price History boards ---------------- */

function productDetailBehind() {
  return shell({
    active: 'product', title: 'Product',
    body: `<a class="back-link">${icon('arrow')}Back to product list</a>
    <h1 class="view-title">Industrial Widget A</h1>
    <p class="view-sub">P-001 · Unit: pcs · Active</p>
    <div class="current-price-card"><div><div class="amount">$13.75</div><div class="meta"><span>Current price · effective 2026-10-01</span></div></div><div class="spacer"></div><span class="pill current">Current</span></div>
    <div class="row-actions" style="justify-content:flex-start"><button class="btn btn-outline">Edit product <span class="perm">E</span></button><button class="btn btn-primary">Open Price History <span class="perm">H</span></button><button class="btn btn-danger">Deactivate <span class="perm">D</span></button></div>`,
  });
}

const ph01 = stage(productDetailBehind(), `<div class="modal" role="dialog" aria-modal="true">
  <div class="modal-head">
    <div><h2>Price History: P-001</h2><p>Industrial Widget A · pcs</p></div>
    <button class="btn btn-outline btn-sm">Close</button>
  </div>
  <div class="modal-toolbar">
    <span class="current-strip">Current: $13.75 <small>as of 2026-11-24</small></span>
    <button class="btn btn-primary">Add price <span class="perm">A+</span></button>
  </div>
  <div class="modal-body">
    <div class="table-card"><table>
      <thead><tr><th>Effective date</th><th class="numeric">Unit price</th><th>Status</th><th>Last updated</th><th style="text-align:right">Actions</th></tr></thead>
      <tbody>
        <tr class="history-current"><td>2026-10-01</td><td class="numeric"><b>$13.75</b></td><td><span class="pill current">Current</span></td><td class="id">CREATED system · 2026-10-01</td><td><div class="row-actions"><button class="btn btn-outline btn-sm">Edit <span class="perm">E+</span></button><button class="btn btn-danger btn-sm">Delete <span class="perm">D+</span></button></div></td></tr>
        <tr><td>2026-08-15</td><td class="numeric">$12.90</td><td><span class="pill neutral">Historical</span></td><td class="id">EDITED user1 · 2026-08-15</td><td><div class="row-actions"><button class="btn btn-outline btn-sm">Edit <span class="perm">E+</span></button><button class="btn btn-danger btn-sm">Delete <span class="perm">D+</span></button></div></td></tr>
        <tr><td>2026-12-01</td><td class="numeric">$15.00</td><td><span class="pill warning">Future</span></td><td class="id">CREATED system · 2026-11-20</td><td><div class="row-actions"><button class="btn btn-outline btn-sm">Edit <span class="perm">E+</span></button><button class="btn btn-danger btn-sm">Delete <span class="perm">D+</span></button></div></td></tr>
      </tbody>
    </table></div>
  </div>
  <div class="modal-foot"><button class="btn btn-outline">Close</button></div>
</div>`);

const ph02 = stage(productDetailBehind(), `<div class="modal" style="width:560px" role="dialog" aria-modal="true">
  <div class="modal-head"><div><h2>Add price</h2><p>Industrial Widget A · P-001 · pcs</p></div><button class="btn btn-outline btn-sm">Close</button></div>
  <div class="modal-body" style="overflow:visible;padding-bottom:4px">
    <div class="form-grid">
      <div class="field"><label>Effective date <span class="req">*</span></label><input class="input" type="date" value="2026-12-01"><span class="hint">Must be unique for P-001.</span></div>
      <div class="field"><label>Unit price <span class="req">*</span></label><input class="input" type="number" value="15.00" step="0.01" min="0"><span class="hint">Numeric · two decimals · minimum 0.</span></div>
    </div>
  </div>
  <div class="modal-foot"><button class="btn btn-outline">Cancel</button><button class="btn btn-primary">Add price <span class="perm">A+</span></button></div>
</div>`);

const ph03 = stage(productDetailBehind(), `<div class="modal" style="width:560px" role="dialog" aria-modal="true">
  <div class="modal-head"><div><h2>Edit price</h2><p>P-001 · 2026-10-01</p></div><button class="btn btn-outline btn-sm">Close</button></div>
  <div class="modal-body" style="overflow:visible;padding-bottom:4px">
    <div class="form-grid">
      <div class="field"><label>Effective date</label><input class="input" type="date" value="2026-10-01" disabled><span class="hint">Composite-key date is read-only in this proposal.</span></div>
      <div class="field has-error"><label>Unit price <span class="req">*</span></label><input class="input" type="number" value="-1.00" step="0.01" min="0"><span class="error-msg">Unit price must be zero or greater.</span></div>
    </div>
  </div>
  <div class="modal-foot"><button class="btn btn-outline">Cancel</button><button class="btn btn-primary">Save changes <span class="perm">E+</span></button></div>
</div>`);

const ph04 = stage(productDetailBehind(), dialog({
  tone: 'danger', glyph: '!', title: 'Delete P-001 price?', sub: '$13.75 · effective 2026-10-01',
  body: '<b>Impact check.</b> The next applicable active price will become current if one exists. Sales already recorded keep their historical applicable price.',
  actions: '<button class="btn btn-outline">Cancel</button><button class="btn btn-danger">Delete price <span class="perm">D+</span></button>',
}));

const ph05 = stage(shell({ active: 'product', title: 'Product', body: productListBody({ rows: [PRODUCTS[4]], status: 'Inactive', note: 'Showing 1 inactive product.' }) }),
  dialog({
    tone: 'warn', glyph: '!', title: 'Restore Safety Gloves XL?', sub: 'P-004 · pair · restore Status to Active.',
    body: '<b>No current price.</b> Restoring the product does not create a price. Add Price rights can add P-004’s first effective-dated price.',
    actions: '<button class="btn btn-outline">Cancel</button><button class="btn btn-primary">Restore product <span class="perm">R</span></button>',
  }));

const ph06 = `<div class="phone">
  <div class="phone-top"><div class="left"><span class="hamburger">${icon('menu')}</span><span class="title">Price History</span></div><span class="role-badge">Super Admin</span></div>
  <div class="phone-body">
    <h1 class="view-title" style="font-size:20px">P-001 · Industrial Widget A</h1>
    <p class="view-sub">pcs · current $13.75</p>
    <div class="toolbar" style="grid-template-columns:1fr;margin:12px 0">
      <button class="btn btn-primary">Add price <span class="perm">A+</span></button>
    </div>
    <div class="card-list">
      <div class="m-card">
        <div class="m-card-top"><span class="m-card-name">2026-10-01</span><span class="pill current">Current</span></div>
        <div class="m-card-meta"><b>$13.75</b></div>
        <div class="m-card-meta">CREATED system · 2026-10-01</div>
        <div class="row-actions"><button class="btn btn-outline btn-sm">Edit <span class="perm">E+</span></button><button class="btn btn-danger btn-sm">Delete <span class="perm">D+</span></button></div>
      </div>
      <div class="m-card">
        <div class="m-card-top"><span class="m-card-name">2026-08-15</span><span class="pill neutral">Historical</span></div>
        <div class="m-card-meta"><b>$12.90</b></div>
        <div class="m-card-meta">EDITED user1 · 2026-08-15</div>
        <div class="row-actions"><button class="btn btn-outline btn-sm">Edit <span class="perm">E+</span></button><button class="btn btn-danger btn-sm">Delete <span class="perm">D+</span></button></div>
      </div>
      <div class="m-card">
        <div class="m-card-top"><span class="m-card-name">2026-12-01</span><span class="pill warning">Future</span></div>
        <div class="m-card-meta"><b>$15.00</b></div>
        <div class="m-card-meta">CREATED system · 2026-11-20</div>
        <div class="row-actions"><button class="btn btn-outline btn-sm">Edit <span class="perm">E+</span></button><button class="btn btn-danger btn-sm">Delete <span class="perm">D+</span></button></div>
      </div>
    </div>
  </div>
</div>`;

/* ---------------- Cover and legend ---------------- */

const cover = `<div class="board cover">
  <div class="cover-top"><span class="brand-mark">H</span>Hope, Inc. ERP</div>
  <div class="cover-main">
    <div>
      <p class="eyebrow">S2-UIX-03 · High-fidelity mockups and handoff</p>
      <h1>Customer, Product &amp; Price History</h1>
      <p class="lead">High-fidelity screens built on the approved Hope, Inc. design system: the #0e5a6b accent, Avenir Next/Segoe UI type stack, 42&nbsp;px controls, 10/14/18&nbsp;px radii and the 240&nbsp;px app sidebar.</p>
      <dl class="cover-meta">
        <div><dt>Issue</dt><dd>#112 · [S2-UIX-03]</dd></div>
        <div><dt>Modules</dt><dd>Customer · Product · Price History</dd></div>
        <div><dt>Source</dt><dd>S2-UIX-01 / S2-UIX-02 wireframes</dd></div>
        <div><dt>Date</dt><dd>2026-11-24</dd></div>
        <div><dt>Viewports</dt><dd>1440 × 900 · 390 × 844</dd></div>
        <div><dt>Status</dt><dd>For design review</dd></div>
      </dl>
    </div>
    <div>
      <div class="swatch-grid">
        <div class="swatch" style="background:var(--accent);color:#fff"><b>Primary</b><code>#0e5a6b</code></div>
        <div class="swatch" style="background:var(--accent-dark);color:#fff"><b>Hover</b><code>#0a4653</code></div>
        <div class="swatch" style="background:var(--accent-light);color:var(--text)"><b>Subtle</b><code>#d9ecf0</code></div>
        <div class="swatch" style="background:var(--sun);color:#10222e"><b>Highlight</b><code>#f2a541</code></div>
        <div class="swatch" style="background:var(--surface);color:var(--text)"><b>Surface</b><code>#ffffff</code></div>
        <div class="swatch" style="background:var(--soft);color:var(--text)"><b>Soft</b><code>#f1f6f8</code></div>
        <div class="swatch" style="background:var(--sidebar);color:var(--sidebar-text)"><b>Sidebar</b><code>#0f2430</code></div>
        <div class="swatch" style="background:var(--color-success-bg);color:var(--color-success)"><b>Active</b><code>#18794e</code></div>
        <div class="swatch" style="background:var(--color-danger-bg);color:var(--danger)"><b>Inactive</b><code>#c0392b</code></div>
      </div>
      <div class="type-card">
        <div class="t1">Aa · Industrial Widget A</div>
        <div class="t2">Page title 30 px / 700</div>
        <div class="t3">Body 16 px / 1.55 · Labels 12.5 px / 700 · Table 13 px</div>
      </div>
    </div>
  </div>
  <div class="cover-foot"><span>Hope, Inc. ERP · UI/UX Sprint 2</span><span>Design system source: “Design System and visual foundation for the Hope, Inc”</span></div>
</div>`;

const legend = `<div class="board legend">
  <p class="eyebrow">Screen index</p>
  <h1>Mockup set</h1>
  <p class="lead">25 high-fidelity screens. Desktop boards are 1440 × 900; phone boards are 390 × 844. Permission badges use the key below.</p>
  <div class="legend-grid">
    <div class="legend-col">
      <h3>Customer</h3>
      <div class="legend-item"><b>C01</b><span>Customer list — default Active</span></div>
      <div class="legend-item"><b>C02</b><span>Search + payment-terms filter</span></div>
      <div class="legend-item"><b>C03</b><span>No matching customers</span></div>
      <div class="legend-item"><b>C04</b><span>Inactive list — restore entry</span></div>
      <div class="legend-item"><b>C05</b><span>Add customer</span></div>
      <div class="legend-item"><b>C06</b><span>Add customer — validation</span></div>
      <div class="legend-item"><b>C07</b><span>Edit customer</span></div>
      <div class="legend-item"><b>C08</b><span>Customer detail</span></div>
      <div class="legend-item"><b>C09</b><span>Deactivate confirmation</span></div>
      <div class="legend-item"><b>C10</b><span>Deactivate blocked</span></div>
      <div class="legend-item"><b>C11</b><span>Restore confirmation</span></div>
      <div class="legend-item"><b>C12</b><span>Phone customer list</span></div>
    </div>
    <div class="legend-col">
      <h3>Product</h3>
      <div class="legend-item"><b>P01</b><span>Product list — current prices</span></div>
      <div class="legend-item"><b>P02</b><span>No matching products</span></div>
      <div class="legend-item"><b>P03</b><span>Add product</span></div>
      <div class="legend-item"><b>P04</b><span>Edit product — validation</span></div>
      <div class="legend-item"><b>P05</b><span>Product detail — current price</span></div>
      <div class="legend-item"><b>P06</b><span>Current-price edge states</span></div>
      <div class="legend-item"><b>P07</b><span>Phone product list</span></div>
      <h3 style="margin-top:18px">Price History</h3>
      <div class="legend-item"><b>PH01</b><span>Price History modal</span></div>
      <div class="legend-item"><b>PH02</b><span>Add price</span></div>
      <div class="legend-item"><b>PH03</b><span>Edit price — validation</span></div>
      <div class="legend-item"><b>PH04</b><span>Delete price confirmation</span></div>
      <div class="legend-item"><b>PH05</b><span>Restore product confirmation</span></div>
      <div class="legend-item"><b>PH06</b><span>Phone Price History</span></div>
    </div>
    <div class="legend-col">
      <h3>Permission key</h3>
      <div class="legend-item"><b>A</b><span>Add Customer / Add Product</span></div>
      <div class="legend-item"><b>E</b><span>Edit Customer / Edit Product</span></div>
      <div class="legend-item"><b>D</b><span>Delete Customer / Delete Product</span></div>
      <div class="legend-item"><b>V</b><span>View / module access — no named right</span></div>
      <div class="legend-item"><b>R</b><span>Restore — authorization open</span></div>
      <div class="legend-item"><b>H</b><span>Open Price History</span></div>
      <div class="legend-item"><b>A+</b><span>Add Price</span></div>
      <div class="legend-item"><b>E+</b><span>Edit Price</span></div>
      <div class="legend-item"><b>D+</b><span>Delete Price</span></div>
    </div>
  </div>
  <div class="legend-note"><b>Read with the handoff notes.</b> Every screen has a Markdown note covering field specs, responsive behaviour and role/permission visibility. Items the sources leave undefined are marked “open” rather than invented.</div>
</div>`;

const boards = [
  ['cover', '', cover],
  ['legend', '', legend],
  ['c01-customer-list', '', c01],
  ['c02-customer-filtered', '', c02],
  ['c03-customer-no-match', '', c03],
  ['c04-customer-inactive', '', c04],
  ['c05-customer-create', '', c05],
  ['c06-customer-create-errors', '', c06],
  ['c07-customer-edit', '', c07],
  ['c08-customer-detail', '', c08],
  ['c09-customer-deactivate', '', c09],
  ['c10-customer-deactivate-blocked', '', c10],
  ['c11-customer-restore', '', c11],
  ['c12-customer-mobile', 'phone-board', c12],
  ['p01-product-list', '', p01],
  ['p02-product-no-match', '', p02],
  ['p03-product-create', '', p03],
  ['p04-product-edit-errors', '', p04],
  ['p05-product-detail', '', p05],
  ['p06-product-price-states', '', p06],
  ['p07-product-mobile', 'phone-board', p07],
  ['ph01-price-history', '', ph01],
  ['ph02-price-add', '', ph02],
  ['ph03-price-edit-errors', '', ph03],
  ['ph04-price-delete', '', ph04],
  ['ph05-product-restore', '', ph05],
  ['ph06-price-history-mobile', 'phone-board', ph06],
];

for (const [name, cls, body] of boards) {
  writeFileSync(join(here, `${name}.html`), page(name, cls, body), 'utf8');
}
console.log(`Wrote ${boards.length} boards to ${here}`);
