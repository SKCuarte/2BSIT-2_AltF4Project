// Hope, Inc. ERP
const R = (...items) => items.map(item => item.split(":"));

/*
 * Permission catalogue follows db/migrations/003_user_management.sql exactly:
 * Customer 3, Product 6, Human Resources 13, Sales 7, Reports 7 = 36.
 * User Management is an administrative area, not a sixth permission module.
 */
const MODS = {
  customers: {
    title: "Customer",
    blurb: "Customer records and profiles",
    rights: R("add:Add Customer", "edit:Edit Customer", "delete:Delete Customer"),
    cols: [["name", "Customer"], ["email", "Email", "email"], ["phone", "Phone"], ["status", "Status", ["Active", "Inactive"]]],
    seed: [
      ["Maria Santos", "maria@example.com", "+63 917 555 0101", "Active"],
      ["Daniel Cruz", "daniel@example.com", "+63 917 555 0102", "Active"],
      ["Aiko Tanaka", "aiko@example.com", "+63 917 555 0103", "Active"],
      ["Liam Walker", "liam@example.com", "+63 917 555 0104", "Inactive"]
    ]
  },
  products: {
    title: "Product",
    blurb: "Products and pricing",
    rights: R("add:Add Product", "edit:Edit Product", "delete:Delete Product", "price_add:Add Price", "price_edit:Edit Price", "price_delete:Delete Price"),
    cols: [["sku", "SKU"], ["name", "Product"], ["price", "Price", "number"], ["stock", "Stock", "number"]],
    seed: [
      ["HP-1001", "Standing Desk", "249.00", "38"],
      ["HP-1002", "Ergonomic Chair", "189.00", "52"],
      ["HP-1003", "Desk Lamp", "34.50", "120"],
      ["HP-1004", "Notebook Pack", "12.00", "300"]
    ]
  },
  hr: {
    title: "Human Resources",
    blurb: "Jobs, departments, employees and job history",
    rights: R(
      "job_add:Add Job", "job_edit:Edit Job", "job_delete:Delete Job",
      "department_add:Add Department", "department_edit:Edit Department", "department_delete:Delete Department",
      "employee_add:Add Employee", "employee_edit:Edit Employee", "employee_delete:Delete Employee",
      "jobhistory_view:View Job History", "jobhistory_add:Add Job History",
      "jobhistory_edit:Edit Job History", "jobhistory_delete:Delete Job History"
    ),
    cols: [["name", "Employee"], ["role", "Position"], ["dept", "Department"], ["status", "Status", ["Active", "On leave"]]],
    seed: [
      ["Alex Rivera", "Sales Associate", "Sales", "Active"],
      ["Grace Lim", "HR Officer", "People", "Active"],
      ["Marco Reyes", "Warehouse Lead", "Operations", "On leave"]
    ]
  },
  sales: {
    title: "Sales",
    blurb: "Sales transactions and sale details",
    rights: R(
      "add:Add Sale", "edit:Edit Sale", "delete:Delete Sale",
      "detail_view:View Sale Details", "detail_add:Add Sale Detail",
      "detail_edit:Edit Sale Detail", "detail_delete:Delete Sale Detail"
    ),
    cols: [["sale", "Sale ID"], ["customer", "Customer"], ["date", "Date"], ["total", "Total", "number"]],
    seed: [
      ["S-1001", "Maria Santos", "2026-10-28", "1250.00"],
      ["S-1002", "Daniel Cruz", "2026-10-29", "840.00"],
      ["S-1003", "Aiko Tanaka", "2026-10-30", "2190.00"]
    ]
  },
  reports: {
    title: "Reports",
    blurb: "Business and operational reports",
    rights: R(
      "top_customers:Top Customers", "product_master_list:Product Master List",
      "top_products:Top Products", "active_employees:Active Employees",
      "all_employees:All Employees", "employee_job_history:Employee Job History",
      "top_sales:Top Sales"
    )
  }
};

const ALLK = Object.entries(MODS).flatMap(([moduleCode, module]) =>
  module.rights.map(([action]) => moduleCode + "." + action)
);
const grant = keys => Object.fromEntries(keys.map(key => [key, true]));
const ADMIN_ROLES = ["superadmin", "admin"];
const ICONS = {
  dashboard: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  customers: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5a3.5 3.5 0 0 1 0 6.5M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  products: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  hr: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/>',
  sales: '<path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-7"/>',
  reports: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  users: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'
};

// Demo accounts are illustrative. Regular users start with no rights.
const demoUsers = [
  { name: "Super Admin", email: "superadmin@hope.com", pw: "SuperAdmin#1", role: "superadmin", status: "active", blocked: false, needsPasswordSetup: false, rights: {} },
  { name: "Admin", email: "admin@hope.com", pw: "Admin#1234", role: "admin", status: "active", blocked: false, needsPasswordSetup: false, rights: grant(ALLK) },
  { name: "User", email: "user@hope.com", pw: "User@User", role: "user", status: "active", blocked: false, needsPasswordSetup: false, rights: {} }
];

const USER_STORAGE = "hope_users_v6";
const roleNames = {
  user: "User",
  admin: "Admin",
  superadmin: "Super Admin"
};

// Get an HTML element by its ID.
function get(id) {
  return document.getElementById(id);
}

// Load saved accounts. Use demo accounts if no saved list exists.
let users = demoUsers;
try {
  const savedUsers = localStorage.getItem(USER_STORAGE);
  if (savedUsers) {
    const parsedUsers = JSON.parse(savedUsers);
    if (Array.isArray(parsedUsers)) users = parsedUsers;
  }
} catch (error) {
  users = demoUsers;
}

// Save account changes in this browser.
function saveUsers() {
  try {
    localStorage.setItem(USER_STORAGE, JSON.stringify(users));
  } catch (error) {
    // The demo can still run if browser storage is unavailable.
  }
}

// Find an account using its email address.
function findUser(email) {
  const cleanEmail = email.trim().toLowerCase();
  return users.find(function (user) {
    return user.email.toLowerCase() === cleanEmail;
  });
}

let currentUser = null;

// Show one form inside the existing pop-up.
function openForm(formName) {
  const formIds = ["fLogin", "fReg", "fForgot", "fSetPassword", "fReset"];

  formIds.forEach(function (id) {
    get(id).hidden = true;
  });

  const formNames = {
    login: "fLogin",
    reg: "fReg",
    forgot: "fForgot",
    setPassword: "fSetPassword",
    reset: "fReset"
  };

  get(formNames[formName]).hidden = false;
  document.querySelectorAll(".msg").forEach(function (message) {
    message.textContent = "";
    message.className = "msg";
  });

  get("ov").hidden = false;
  const firstInput = get(formNames[formName]).querySelector("input");
  if (firstInput) firstInput.focus();
}

function closeForm() {
  get("ov").hidden = true;
}

// Show a message below a form.
function showMessage(id, message, success) {
  get(id).textContent = message;
  get(id).className = success ? "msg ok" : "msg";
}

// Open the login or registration form from the landing page.
get("loginBtn").onclick = function () { openForm("login"); };
get("startBtn").onclick = function () { openForm("login"); };
get("regBtn").onclick = function () { openForm("reg"); };

// Switch forms using the links inside the pop-up.
document.querySelectorAll("[data-go]").forEach(function (button) {
  button.onclick = function () {
    openForm(button.dataset.go);
  };
});

get("close").addEventListener("click", function (event) {
  event.preventDefault();
  closeForm();
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    if (!get("md").hidden) closeModal();
    else if (!get("ov").hidden) closeForm();
  }
});

// LOG IN
get("fLogin").onsubmit = function (event) {
  event.preventDefault();

  const user = findUser(get("le").value);

  if (!user) {
    showMessage("lm", "Email or password is incorrect.");
    return;
  }

  if (user.status === "pending") {
    showMessage("lm", "Your account request is awaiting administrator approval. You cannot sign in yet.");
    return;
  }

  if (user.pw !== get("lp").value) {
    showMessage("lm", "Email or password is incorrect.");
    return;
  }

  if (user.blocked) {
    showMessage("lm", "This account is temporarily blocked. Contact your Hope ERP administrator for assistance.");
    return;
  }

  if (user.needsPasswordSetup) {
    openForm("setPassword");
    get("se").value = user.email;
    showMessage("sm", "Your account is approved. Set a password to continue.", true);
    return;
  }

  currentUser = user;
  get("lp").value = "";
  closeForm();
  showDashboard();
};

// REGISTER: new accounts must be approved by an administrator.
get("fReg").onsubmit = function (event) {
  event.preventDefault();

  const firstName = get("rn").value.trim();
  const lastName = get("rl").value.trim();
  const email = get("re").value.trim().toLowerCase();

  if (!firstName || !lastName || !email) {
    showMessage("rm", "Please complete all fields.");
    return;
  }

  if (findUser(email)) {
    showMessage("rm", "This email already has an account or request. Try signing in or contact your administrator.");
    return;
  }

  users.push({
    name: firstName + " " + lastName,
    email: email,
    pw: "",
    role: "user",
    status: "pending",
    blocked: false,
    needsPasswordSetup: false,
    rights: {}
  });

  saveUsers();
  event.target.reset();
  openForm("login");
  showMessage("lm", "Your account request has been submitted. An administrator will review it before you can sign in.", true);
};

// FORGOT PASSWORD: show a general message for privacy.
get("fForgot").onsubmit = function (event) {
  event.preventDefault();
  showMessage("fm", "If an account matches that email, recovery instructions will be sent shortly.", true);
};

// This button only previews the reset form in this prototype.
get("previewReset").onclick = function () {
  const email = get("fe").value.trim().toLowerCase();
  openForm("reset");
  get("pe").value = email;
};

// FIRST-TIME PASSWORD SETUP after approval.
get("fSetPassword").onsubmit = function (event) {
  event.preventDefault();

  const user = findUser(get("se").value);

  if (!user || user.status !== "active" || !user.needsPasswordSetup) {
    showMessage("sm", "We couldn’t verify an approved account that needs password setup. Contact your administrator.");
    return;
  }

  if (get("sp").value !== get("sc").value) {
    showMessage("sm", "Passwords do not match.");
    return;
  }

  user.pw = get("sp").value;
  user.needsPasswordSetup = false;
  saveUsers();
  event.target.reset();
  openForm("login");
  showMessage("lm", "Your password has been set. You can now sign in.", true);
};

// RESET PASSWORD (simulated for this prototype).
get("fReset").onsubmit = function (event) {
  event.preventDefault();

  if (get("pp").value !== get("pc").value) {
    showMessage("pm", "Passwords do not match.");
    return;
  }

  const user = findUser(get("pe").value);
  if (!user || user.status !== "active" || user.blocked) {
    showMessage("pm", "If an account matches that email, recovery can’t be completed right now. Contact your administrator if you need help.");
    return;
  }

  user.pw = get("pp").value;
  user.needsPasswordSetup = false;
  saveUsers();
  event.target.reset();
  openForm("login");
  showMessage("lm", "Password updated. Log in with your new password.", true);
};

// DASHBOARD
function showDashboard() {
  get("site").hidden = true;
  get("app").hidden = false;
  window.scrollTo(0, 0);
  view = "dashboard";
  setMenu(window.innerWidth > 860);
  fillDashboard();
}

get("out").onclick = function () {
  currentUser = null;
  get("app").hidden = true;
  get("site").hidden = false;
  window.scrollTo(0, 0);
};

function fillDashboard() {
  const firstName = currentUser.name.split(" ")[0];
  const roleName = roleNames[currentUser.role];

  get("who").textContent = currentUser.name;
  get("role").textContent = roleName;
  get("badge").textContent = roleName;
  get("avatar").textContent = currentUser.name.charAt(0).toUpperCase();
  get("hello").textContent = "Welcome back, " + firstName + "!";

  // The canonical catalogue has action rights rather than separate View rights.
  const hasAccess = currentUser.role === "superadmin" || ALLK.some(function (key) { return can(currentUser, key); });
  get("dash").hidden = !hasAccess;
  get("locked").hidden = hasAccess;
  showView(view);
}

/* ===== MODULES: Product, HR, Customer and User management ===== */
/* ---------- helpers ---------- */
const store = {
  get(k, fallback) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch (e) { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
};
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e[k] = v;
    else e.setAttribute(k, v);
  }
  kids.flat().forEach(c => e.append(c));
  return e;
}
const icon = k => { const s = el("span", { class: "ic" }); s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[k] + "</svg>"; return s; };
const btn = (t, fn, danger) => el("button", { type: "button", class: "ghost sm" + (danger ? " danger" : ""), onclick: fn }, t);
const lab = (t, i) => el("label", {}, t, i);
function toast(text) {
  const t = el("div", { class: "toast", role: "status" }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}


let data = store.get("hope_data_v1", null);
if (!data || typeof data !== "object") data = {};
for (const [k, m] of Object.entries(MODS)) {
  if (m.cols && !Array.isArray(data[k])) {
    data[k] = m.seed.map(row => Object.fromEntries(m.cols.map((column, i) => [column[0], row[i]])));
  }
}
const saveData = () => store.set("hope_data_v1", data);
const editRow = { customers: -1, products: -1, hr: -1, sales: -1 };

/* ---------- generic modal (user form, rights, confirmations) ---------- */
function modal(node) {
  const b = get("mdb");
  b.replaceChildren(node);
  b.classList.remove("wide");
  get("md").hidden = false;
  const f = b.querySelector("input,select,button");
  if (f) f.focus();
}
const closeModal = () => { get("md").hidden = true; };
get("md").addEventListener("click", e => { if (e.target === get("md")) closeModal(); });
function confirmBox(title, text, label, go, danger) {
  modal(el("div", {}, el("h2", {}, title), el("p", { class: "sub" }, text),
    el("div", { class: "mact mt" },
      el("button", { type: "button", class: danger ? "danger" : "pri", onclick: () => { closeModal(); go(); } }, label),
      el("button", { type: "button", class: "ghost", onclick: closeModal }, "Cancel"))));
}


/* ---------- slidable sidebar, role-based menu and views ---------- */
const can = (u, k) => !!u && (u.role === "superadmin" || !!(u.rights && u.rights[k]));
const canManageUsers = user => !!user && ADMIN_ROLES.includes(user.role);
const visible = k => {
  if (k === "users") return canManageUsers(currentUser);
  const module = MODS[k];
  return !!module && (currentUser.role === "superadmin" || module.rights.some(([action]) => can(currentUser, k + "." + action)));
};
let view = "dashboard";
function setMenu(open) {
  get("app").classList.toggle("collapsed", !open);
  get("tog").setAttribute("aria-expanded", String(open));
}
get("tog").onclick = function () { setMenu(get("app").classList.contains("collapsed")); };
get("scrim").onclick = function () { setMenu(false); };
function renderNav() {
  const keys = ["dashboard", ...Object.keys(MODS).filter(visible), ...(canManageUsers(currentUser) ? ["users"] : [])];
  get("nav").replaceChildren(...keys.map(v => {
    const a = el("a", { class: "side-link" + (v === view ? " on" : ""), href: "#" }, icon(v), v === "dashboard" ? "Dashboard" : (v === "users" ? "User Management" : MODS[v].title));
    if (v === view) a.setAttribute("aria-current", "page");
    a.onclick = e => { e.preventDefault(); showView(v); if (innerWidth <= 860) setMenu(false); window.scrollTo(0, 0); };
    return a;
  }));
}
function showView(v) {
  if (v !== "dashboard" && v !== "users" && !(MODS[v] && visible(v))) v = "dashboard";
  if (v === "users" && !canManageUsers(currentUser)) v = "dashboard";
  view = v;
  document.querySelectorAll(".view").forEach(x => { x.hidden = x.id !== "v-" + v; });
  get("vtitle").textContent = v === "dashboard" ? "Dashboard" : (v === "users" ? "User Management" : MODS[v].title);
  renderNav();
  if (v === "users") usersView();
  else if (v === "reports") reportsView();
  else if (v !== "dashboard") modView(v);
}

/* ---------- module tables: products, HR, customers ---------- */
function modView(k) {
  const m = MODS[k], box = get("v-" + k), rows = data[k], ed = editRow[k];
  box.replaceChildren(el("h2", { class: "vt" }, m.title));
  const hasAction = suffix => m.rights.some(([action]) => (action === suffix || action.endsWith("_" + suffix)) && can(currentUser, k + "." + action));
  const cC = hasAction("add"), cE = hasAction("edit"), cD = hasAction("delete");
  if (ed >= 0 || cC) {
    const fs = m.cols.map(([key, , t]) => {
      const f = Array.isArray(t) ? el("select", {}, t.map(o => el("option", { value: o }, o))) : el("input", { type: t || "text" });
      if (t === "number") { f.min = "0"; f.step = "any"; }
      f.required = true;
      if (ed >= 0) f.value = rows[ed][key];
      return f;
    });
    const form = el("form", { class: "mform" }, m.cols.map((c, i) => el("label", {}, c[1], fs[i])),
      el("div", { class: "mact" },
        el("button", { class: "pri", type: "submit" }, ed >= 0 ? "Save changes" : "Add record"),
        ed >= 0 ? el("button", { class: "ghost", type: "button", onclick: () => { editRow[k] = -1; modView(k); } }, "Cancel") : ""));
    form.onsubmit = e => {
      e.preventDefault();
      const rec = Object.fromEntries(m.cols.map((c, i) => [c[0], fs[i].value.trim()]));
      if (ed >= 0) rows[ed] = rec; else rows.push(rec);
      editRow[k] = -1; saveData(); modView(k); toast(ed >= 0 ? "Changes saved" : "Record added");
    };
    box.append(form);
  }
  if (!rows.length) { box.append(el("p", { class: "muted" }, "No records yet.")); return; }
  const cell = (key, v) => key === "status" ? el("span", { class: "tag" + (v === "Inactive" || v === "On leave" ? " off" : "") }, v) : key === "price" ? "$" + Number(v).toFixed(2) : v;
  const acts = cE || cD;
  const body = rows.map((r, i) => el("tr", {}, m.cols.map(c => el("td", {}, cell(c[0], r[c[0]]))),
    acts ? el("td", {}, el("div", { class: "racts" },
      cE ? btn("Edit", () => { editRow[k] = i; modView(k); }) : "",
      cD ? btn("Delete", () => confirmBox("Delete this record?", "This cannot be undone.", "Delete", () => { rows.splice(i, 1); editRow[k] = -1; saveData(); modView(k); toast("Record deleted"); }, true), true) : "")) : ""));
  box.append(el("div", { class: "tw" }, el("table", {}, el("thead", {}, el("tr", {}, [...m.cols.map(c => c[1]), ...(acts ? ["Actions"] : [])].map(t => el("th", {}, t)))), el("tbody", {}, body))));
}


/* ---------- reports: seven catalogue entries ---------- */
function reportsView() {
  const box = get("v-reports");
  box.replaceChildren(el("h2", { class: "vt" }, "Reports"));
  const reports = MODS.reports.rights;
  const cards = reports.map(([action, label]) => {
    const key = "reports." + action;
    const allowed = can(currentUser, key);
    return el("article", { class: "stat report-card" },
      el("p", { class: "st-l" }, "REPORT"),
      el("h3", {}, label),
      el("p", { class: "st-n" }, allowed ? "Available with your permissions" : "Permission required"));
  });
  box.append(el("div", { class: "stats" }, cards));
}

/* ---------- user management (Superadmin and Admin) ---------- */

const uf = { q: "", role: "all", st: "all" };
function usersView() {
  const box = get("v-users"), sa = currentUser.role === "superadmin";
  box.replaceChildren(el("h2", { class: "vt" }, "User Management"));
  const q = el("input", { type: "search", placeholder: "Search name or email", "aria-label": "Search users" });
  q.value = uf.q;
  const sel = (label, key, opts) => {
    const s = el("select", { "aria-label": label }, opts.map(([v, t]) => el("option", { value: v }, t)));
    s.value = uf[key]; s.onchange = () => { uf[key] = s.value; rows(); };
    return s;
  };
  box.append(el("div", { class: "toolbar" }, q,
    sa ? sel("Filter by role", "role", [["all", "All roles"], ["admin", "Admins"], ["user", "Users"]]) : "", // role filter is hidden from Admins
    sel("Filter by status", "st", [["all", "All statuses"], ["active", "Active"], ["pending", "Pending approval"], ["blocked", "Blocked"]]),
    el("button", { class: "pri addu", type: "button", onclick: () => userForm() }, "Add user")));
  const out = el("div", {});
  box.append(out);
  q.oninput = () => { uf.q = q.value; rows(); };
  function rows() {
    const t = uf.q.trim().toLowerCase();
    // Super Admin sees admins and users; Admin sees users only (admin and super admin accounts are hidden).
    const list = users.filter(u => (sa ? u.role !== "superadmin" : u.role === "user")
      && (!sa || uf.role === "all" || u.role === uf.role)
      && (uf.st === "all" || (uf.st === "blocked" ? u.blocked : uf.st === "pending" ? u.status === "pending" : !u.blocked && u.status === "active"))
      && (!t || (u.name + " " + u.email).toLowerCase().includes(t)));
    out.replaceChildren();
    if (!list.length) { out.append(el("p", { class: "muted" }, "No accounts match your filters.")); return; }
    const cE = true, cA = true, cB = true, cD = sa;
    const trs = list.map(u => el("tr", {},
      el("td", {}, u.name), el("td", {}, u.email), el("td", {}, roleNames[u.role]),
      el("td", {}, el("span", { class: u.status === "pending" ? "tag pending" : ("tag" + (u.blocked ? " off" : "")) }, u.blocked ? "Blocked" : (u.status === "pending" ? "Pending approval" : "Active"))),
      el("td", {}, ALLK.filter(k => u.rights && u.rights[k]).length + " / " + ALLK.length),
      el("td", {}, el("div", { class: "racts" },
        cE && u.status === "pending" ? el("button", { type: "button", class: "pri sm", onclick: () => approveUser(u) }, "Approve") : "",
        cE ? btn("Edit", () => userForm(u)) : "",
        cA ? btn("Rights", () => rightsDialog(u)) : "",
        cB ? btn(u.blocked ? "Unblock" : "Block", () => confirmBox((u.blocked ? "Unblock " : "Block ") + u.name + "?",
          u.blocked ? "They will be able to log in again." : "They will not be able to log in until unblocked.",
          u.blocked ? "Unblock" : "Block", () => { u.blocked = !u.blocked; saveUsers(); usersView(); toast(u.blocked ? "User blocked" : "User unblocked"); }, !u.blocked), !u.blocked) : "",
        cD ? btn("Delete", () => confirmBox("Delete " + u.name + "?", "The account is removed permanently.", "Delete",
          () => { users.splice(users.indexOf(u), 1); saveUsers(); usersView(); toast("User deleted"); }, true), true) : ""))));
    out.append(el("div", { class: "tw" }, el("table", {}, el("thead", {}, el("tr", {}, ["Name", "Email", "Role", "Status", "Rights", "Actions"].map(h => el("th", {}, h)))), el("tbody", {}, trs))));
  }
  rows();
}

function approveUser(user) {
  const temporaryPassword = el("input", { type: "password", minlength: "8", autocomplete: "new-password" });
  temporaryPassword.required = true;
  const message = el("div", { class: "msg", role: "status" });
  const form = el("form", { class: "uf" },
    el("h2", {}, "Approve account"),
    el("p", { class: "sub" }, "Set a temporary password for " + user.name + ". Share it through a secure channel. The user must create a new password at first sign-in."),
    lab("Temporary password (minimum 8 characters)", temporaryPassword),
    message,
    el("div", { class: "mact mt" },
      el("button", { class: "pri", type: "submit" }, "Approve account"),
      el("button", { class: "ghost", type: "button", onclick: closeModal }, "Cancel")
    )
  );
  form.onsubmit = event => {
    event.preventDefault();
    if (temporaryPassword.value.length < 8) {
      message.textContent = "Use at least 8 characters.";
      return;
    }
    user.pw = temporaryPassword.value;
    user.status = "active";
    user.needsPasswordSetup = true;
    user.rights = {};
    saveUsers();
    closeModal();
    usersView();
    toast("Account approved. No rights were assigned.");
  };
  modal(form);
}

function userForm(u) {
  const sa = currentUser.role === "superadmin";
  const n = el("input", { type: "text", autocomplete: "off" }), e = el("input", { type: "email" });
  const p = el("input", { type: "password", minlength: "8", autocomplete: "new-password" });
  const r = el("select", {}, (sa ? ["admin", "user"] : ["user"]).map(x => el("option", { value: x }, roleNames[x]))); // "Admin" option is hidden from Admins
  n.required = e.required = true;
  if (u) { n.value = u.name; e.value = u.email; r.value = u.role; } else p.required = true;
  const err = el("div", { class: "msg", role: "status" });
  const f = el("form", { class: "uf" }, el("h2", {}, u ? "Edit user" : "Add user"),
    el("p", { class: "sub" }, u ? "Update the account details." : "A temporary password is used for the first sign-in. The account receives no rights until they are explicitly assigned."),
    lab("Full name", n), lab("Email", e), lab("Role", r), u ? "" : lab("Temporary password", p), err,
    el("div", { class: "mact mt" }, el("button", { class: "pri", type: "submit" }, u ? "Save changes" : "Add user"), el("button", { class: "ghost", type: "button", onclick: closeModal }, "Cancel")));
  f.onsubmit = ev => {
    ev.preventDefault();
    const dup = findUser(e.value);
    if (dup && dup !== u) { err.textContent = "That email is already registered."; return; }
    const role = sa ? r.value : "user";
    if (u) Object.assign(u, { name: n.value.trim(), email: e.value.trim().toLowerCase(), role });
    else users.push({ name: n.value.trim(), email: e.value.trim().toLowerCase(), pw: p.value, role, status: "active", blocked: false, needsPasswordSetup: true, rights: {} });
    saveUsers(); closeModal(); usersView(); toast(u ? "Changes saved" : "User added");
  };
  modal(f);
}


/* ---------- rights assignment dialog: 5 modules, 36 rights ---------- */
function rightsDialog(u) {
  const sa = currentUser.role === "superadmin", draft = Object.assign({}, u.rights || {}), inputs = {}, masters = {};
  const grantable = k => sa || can(currentUser, k); // Admin can grant only rights assigned to their own account
  const count = el("strong", { "aria-live": "polite" });
  const sync = () => {
    count.textContent = ALLK.filter(k => draft[k]).length + " of " + ALLK.length + " selected";
    for (const [m, d] of Object.entries(MODS)) {
      const ks = d.rights.map(x => m + "." + x[0]).filter(grantable), n = ks.filter(k => draft[k]).length, c = masters[m];
      c.checked = ks.length > 0 && n === ks.length; c.indeterminate = n > 0 && n < ks.length; c.disabled = !ks.length;
    }
    ALLK.forEach(k => { inputs[k].checked = !!draft[k]; });
  };
  const setMany = (ks, v) => { ks.filter(grantable).forEach(k => { draft[k] = v; }); sync(); };
  const cards = Object.entries(MODS).map(([m, d]) => {
    const ks = d.rights.map(x => m + "." + x[0]);
    const mc = el("input", { type: "checkbox" }); masters[m] = mc; mc.onchange = () => setMany(ks, mc.checked);
    return el("fieldset", { class: "rcard" }, el("legend", {}, el("label", { class: "chk" }, mc, d.title)),
      d.rights.map(([a, lbl]) => {
        const k = m + "." + a, c = el("input", { type: "checkbox" });
        inputs[k] = c; c.disabled = !grantable(k); c.onchange = () => { draft[k] = c.checked; sync(); };
        return el("label", { class: "rt" + (c.disabled ? " dis" : ""), title: c.disabled ? "You don't hold this right, so you can't grant it." : "" }, c, lbl);
      }));
  });
  const wrap = el("div", {}, el("h2", {}, "Rights: " + u.name), el("p", { class: "sub" }, roleNames[u.role] + " · " + u.email),
    el("div", { class: "rbar" }, count, btn("Select all", () => setMany(ALLK, true)), btn("Clear all", () => setMany(ALLK, false))),
    el("p", { class: "muted note" }, "Newly approved accounts start with no rights. Assign only the permissions needed for the user's work."),
    sa ? "" : el("p", { class: "muted note" }, "Greyed-out rights are ones you don't hold, so you can't grant them."),
    el("div", { class: "rg" }, cards),
    el("div", { class: "mact mt" },
      el("button", { class: "pri", type: "button", onclick: () => { u.rights = draft; saveUsers(); closeModal(); usersView(); toast("Rights saved"); } }, "Save rights"),
      el("button", { class: "ghost", type: "button", onclick: closeModal }, "Cancel")));
  modal(wrap);
  get("mdb").classList.add("wide");
  sync();
}
