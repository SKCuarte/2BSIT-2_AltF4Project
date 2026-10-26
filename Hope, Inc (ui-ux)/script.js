// Hope, Inc. ERP - simple prototype script

// Demo accounts used when the page is opened for the first time.
const demoUsers = [
  {
    name: "Super Admin",
    email: "superadmin@hope.com",
    pw: "SuperAdmin#1",
    role: "superadmin",
    status: "active",
    blocked: false,
    needsPasswordSetup: false,
    rights: { dashboard: true }
  },
  {
    name: "Admin",
    email: "admin@hope.com",
    pw: "Admin#1234",
    role: "admin",
    status: "active",
    blocked: false,
    needsPasswordSetup: false,
    rights: { dashboard: true }
  },
  {
    name: "User",
    email: "user@hope.com",
    pw: "User@User",
    role: "user",
    status: "active",
    blocked: false,
    needsPasswordSetup: false,
    rights: { dashboard: true }
  }
];

const USER_STORAGE = "hope_users_v2";
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
get("ov").addEventListener("click", function (event) {
  if (event.target === get("ov")) closeForm();
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") closeForm();
});

// LOG IN
get("fLogin").onsubmit = function (event) {
  event.preventDefault();

  const user = findUser(get("le").value);

  if (!user || user.pw !== get("lp").value) {
    showMessage("lm", "Email or password is incorrect.");
    return;
  }

  if (user.blocked) {
    showMessage("lm", "This account is temporarily blocked. Contact your Hope ERP administrator for assistance.");
    return;
  }

  if (user.status === "pending") {
    showMessage("lm", "Your account request is awaiting administrator approval. You’ll receive an update when access is ready.");
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

  const email = get("re").value.trim().toLowerCase();

  if (get("rp").value !== get("rc").value) {
    showMessage("rm", "Passwords do not match.");
    return;
  }

  if (findUser(email)) {
    showMessage("rm", "This email already has an account or request. Try signing in or contact your administrator.");
    return;
  }

  users.push({
    name: get("rn").value.trim(),
    email: email,
    pw: get("rp").value,
    role: "user",
    status: "pending",
    blocked: false,
    needsPasswordSetup: false,
    rights: { dashboard: false }
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

  const hasAccess = Boolean(currentUser.rights && currentUser.rights.dashboard);
  get("dash").hidden = !hasAccess;
  get("locked").hidden = hasAccess;
  showManageTable();
}

// Add a cell to the account table.
function addCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  row.appendChild(cell);
  return cell;
}

// ADMIN TABLE: admins can manage accounts from the existing dashboard layout.
function showManageTable() {
  const box = get("mgmt");
  box.innerHTML = "";

  if (currentUser.role === "user") return;

  const isSuperAdmin = currentUser.role === "superadmin";
  const accounts = users.filter(function (user) {
    if (isSuperAdmin) return user.role !== "superadmin";
    return user.role === "user";
  });

  const title = document.createElement("h3");
  title.textContent = isSuperAdmin ? "Manage admins and users" : "Manage users";
  box.appendChild(title);

  if (accounts.length === 0) {
    const emptyText = document.createElement("p");
    emptyText.className = "muted";
    emptyText.textContent = "No accounts to manage yet.";
    box.appendChild(emptyText);
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Rights</th><th>Actions</th></tr></thead>";
  const body = document.createElement("tbody");
  table.appendChild(body);

  accounts.forEach(function (user) {
    const row = document.createElement("tr");
    addCell(row, user.name);
    addCell(row, user.email);
    addCell(row, roleNames[user.role]);

    const status = document.createElement("span");
    status.className = user.blocked ? "tag off" : "tag";
    status.textContent = user.blocked ? "Blocked" : (user.status === "pending" ? "Pending approval" : "Active");
    addCell(row, "").appendChild(status);

    const access = document.createElement("input");
    access.type = "checkbox";
    access.checked = Boolean(user.rights && user.rights.dashboard);
    access.onchange = function () {
      user.rights = { dashboard: access.checked };
      saveUsers();
    };

    const accessLabel = document.createElement("label");
    accessLabel.className = "chk";
    accessLabel.append(access, "Dashboard access");
    addCell(row, "").appendChild(accessLabel);

    const actions = addCell(row, "");

    if (user.status === "pending") {
      const approve = document.createElement("button");
      approve.type = "button";
      approve.className = "pri sm";
      approve.textContent = "Approve";
      approve.onclick = function () {
        user.status = "active";
        user.needsPasswordSetup = true;
        user.rights = { dashboard: true };
        saveUsers();
        showManageTable();
      };
      actions.appendChild(approve);
    }

    const block = document.createElement("button");
    block.type = "button";
    block.className = user.blocked ? "ghost sm" : "ghost sm danger";
    block.textContent = user.blocked ? "Unblock" : "Block";
    block.style.marginLeft = user.status === "pending" ? "6px" : "0";
    block.onclick = function () {
      user.blocked = !user.blocked;
      saveUsers();
      showManageTable();
    };
    actions.appendChild(block);
    body.appendChild(row);
  });

  const tableBox = document.createElement("div");
  tableBox.className = "tw";
  tableBox.appendChild(table);
  box.appendChild(tableBox);
}
