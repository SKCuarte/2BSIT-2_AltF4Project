
/* ===== 1. SETTINGS AND DEMO ACCOUNTS ===== */

// Names shown for each role
const ROLE_NAMES = { user: "User", admin: "Admin", superadmin: "Super Admin" };

// true = new accounts can open the dashboard (an admin can switch it off later)
const NEW_RIGHTS = true;

// Demo accounts. They are never shown on the page. Change or delete them for your own use.
const SEED = [
  { name: "Super Admin", email: "superadmin@hope.com", pw: "Super@Admin1", role: "superadmin", blocked: false, rights: { dashboard: true } },
  { name: "Admin",       email: "admin@hope.com",      pw: "Admin@Admin",   role: "admin",      blocked: false, rights: { dashboard: true } },
  { name: "User", email: "user@hope.com",       pw: "User@User",   role: "user",       blocked: false, rights: { dashboard: true } }
];

// Names used to save data in the browser
const USERS_KEY = "hope_users_v2";


//HELPER FUNCTIONS

// Short name for document.getElementById
function byId(id) {
  return document.getElementById(id);
}

// Read saved data from the browser (returns "fallback" if nothing is saved)
function loadFromBrowser(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    if (text === null) return fallback;
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

// Save data in the browser
function saveToBrowser(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // The browser blocked storage; the page still works, but nothing is remembered
  }
}

// The list of accounts: 
let users = loadFromBrowser(USERS_KEY, null);
if (!Array.isArray(users)) {
  users = JSON.parse(JSON.stringify(SEED));
}

function saveUsers() {
  saveToBrowser(USERS_KEY, users);
}

// Find an account by email 
function findAccount(email) {
  const wanted = email.trim().toLowerCase();
  return users.find(function (account) {
    return account.email.toLowerCase() === wanted;
  });
}

let currentUser = null;


// LOG IN / REGISTER / RESET PASSWORD POP-UP
const FORM_IDS = { login: "fLogin", reg: "fReg", reset: "fReset" };

function openDialog(which) {
  Object.values(FORM_IDS).forEach(function (id) {
    byId(id).hidden = true;
  });
  byId(FORM_IDS[which]).hidden = false;
  document.querySelectorAll(".msg").forEach(function (message) {
    message.textContent = "";
  });
  byId("ov").hidden = false;

  const firstField = byId(FORM_IDS[which]).querySelector("input");
  if (firstField) firstField.focus();
}

function closeDialog() {
  byId("ov").hidden = true;
}

function showMessage(id, text, isGood) {
  byId(id).textContent = text;
  byId(id).className = isGood ? "msg ok" : "msg";
}

byId("loginBtn").onclick = function () { openDialog("login"); };
byId("startBtn").onclick = function () { openDialog("login"); };
byId("glanceBtn").onclick = function () { openDialog("login"); };
byId("regBtn").onclick = function () { openDialog("reg"); };

document.querySelectorAll("[data-go]").forEach(function (button) {
  button.onclick = function () { openDialog(button.dataset.go); };
});

byId("close").onclick = closeDialog;
byId("ov").addEventListener("click", function (event) {
  if (event.target === byId("ov")) closeDialog();
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") closeDialog();
});

// LOGIN
byId("fLogin").onsubmit = function (event) {
  event.preventDefault();   

  const account = findAccount(byId("le").value);

  if (!account || account.pw !== byId("lp").value) {
    showMessage("lm", "Email or password is incorrect.");
    return;
  }
  if (account.blocked) {
    showMessage("lm", "This account is blocked. Contact an administrator.");
    return;
  }

  currentUser = account;
  byId("lp").value = "";
  closeDialog();
  showDashboard();
};

//REGISTER
byId("fReg").onsubmit = function (event) {
  event.preventDefault();

  if (byId("rp").value !== byId("rc").value) {
    showMessage("rm", "Passwords do not match.");
    return;
  }
  if (findAccount(byId("re").value)) {
    showMessage("rm", "This email is already registered. Log in instead.");
    return;
  }

  users.push({
    name: byId("rn").value.trim(),
    email: byId("re").value.trim().toLowerCase(),
    pw: byId("rp").value,
    role: "user",
    blocked: false,
    rights: { dashboard: NEW_RIGHTS }
  });
  saveUsers();

  event.target.reset();
  openDialog("login");
  showMessage("lm", "Account created. Log in to continue.", true);
};

// Reset password
byId("fReset").onsubmit = function (event) {
  event.preventDefault();

  if (byId("pp").value !== byId("pc").value) {
    showMessage("pm", "Passwords do not match.");
    return;
  }
  const account = findAccount(byId("pe").value);
  if (!account) {
    showMessage("pm", "No account uses that email.");
    return;
  }

  account.pw = byId("pp").value;
  saveUsers();

  event.target.reset();
  openDialog("login");
  showMessage("lm", "Password updated. Log in with your new password.", true);
};


//DASHBOARD

// Hide the landing page, show the dashboard
function showDashboard() {
  byId("site").hidden = true;
  byId("app").hidden = false;
  window.scrollTo(0, 0);
  fillDashboard();
}

// Log out: hide the dashboard, show the landing page
byId("out").onclick = function () {
  currentUser = null;
  byId("app").hidden = true;
  byId("site").hidden = false;
  window.scrollTo(0, 0);
};

// Fill in the name, role and welcome text, and show or hide the figure cards
function fillDashboard() {
  const roleName = ROLE_NAMES[currentUser.role];
  const firstName = currentUser.name.split(" ")[0];

  byId("who").textContent = currentUser.name;
  byId("role").textContent = roleName;
  byId("badge").textContent = roleName;
  byId("avatar").textContent = currentUser.name.charAt(0).toUpperCase();
  byId("hello").textContent = "Welcome back, " + firstName + "!";

  // If an admin turned off dashboard access, show a notice instead of the figures
  const hasAccess = Boolean(currentUser.rights && currentUser.rights.dashboard);
  byId("dash").hidden = !hasAccess;
  byId("locked").hidden = hasAccess;

  showManageTable();
}


//ADMIN TABLE: FOR SUPER ADMINS AND ADMINS ONLY

// Add one table cell to a row and return it
function addCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  row.appendChild(cell);
  return cell;
}

function showManageTable() {
  const box = byId("mgmt");
  box.innerHTML = "";   // empty the box first

  // Normal users do not get this table
  if (currentUser.role === "user") return;

  // Super Admin manages admins and users. Admin manages users only.
  const isSuperAdmin = currentUser.role === "superadmin";
  const accounts = users.filter(function (account) {
    return isSuperAdmin ? account.role !== "superadmin" : account.role === "user";
  });

  const title = document.createElement("h3");
  title.textContent = isSuperAdmin ? "Manage admins and users" : "Manage users";
  box.appendChild(title);

  if (accounts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No accounts to manage yet.";
    box.appendChild(empty);
    return;
  }

  // Table with a heading row
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Rights</th><th></th></tr></thead>";
  const body = document.createElement("tbody");
  table.appendChild(body);

  // One row per account
  accounts.forEach(function (account) {
    const row = document.createElement("tr");

    addCell(row, account.name);
    addCell(row, account.email);
    addCell(row, ROLE_NAMES[account.role]);

    // Status: Active or Blocked
    const statusTag = document.createElement("span");
    statusTag.className = account.blocked ? "tag off" : "tag";
    statusTag.textContent = account.blocked ? "Blocked" : "Active";
    addCell(row, "").appendChild(statusTag);

    // Rights: checkbox to allow or remove dashboard access
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(account.rights && account.rights.dashboard);
    checkbox.onchange = function () {
      account.rights = { dashboard: checkbox.checked };
      saveUsers();
    };
    const checkLabel = document.createElement("label");
    checkLabel.className = "chk";
    checkLabel.append(checkbox, "Dashboard access");
    addCell(row, "").appendChild(checkLabel);

    //BLOCK AND UNBLOCK BUTTON
    const blockButton = document.createElement("button");
    blockButton.type = "button";
    blockButton.className = account.blocked ? "ghost sm" : "ghost sm danger";
    blockButton.textContent = account.blocked ? "Unblock" : "Block";
    blockButton.onclick = function () {
      account.blocked = !account.blocked;
      saveUsers();
      showManageTable();   
    };
    addCell(row, "").appendChild(blockButton);

    body.appendChild(row);
  });

  const scrollBox = document.createElement("div");
  scrollBox.className = "tw";
  scrollBox.appendChild(table);
  box.appendChild(scrollBox);
}
