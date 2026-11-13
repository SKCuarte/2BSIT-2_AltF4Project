# Hi-Fi Mockup: Hope, inc.  

 `[S1-UIX-04]` Hi-fi mockups (login, register, main page, User Management, Rights dialog)

---

## Visual foundation

### Color tokens

| Token | Light | Dark | Use |
|----|----|----|----|
| `--bg` | #fbfcfd | #0b161e | Page background |
| `--surface` | #ffffff | #112029 | Cards, dialogs, tables |
| `--soft` | #f1f6f8 | |Hover Background
| `--mist` | #f1f6f8 | #0f1c25 | Panels, hover |
| `--text` | #10222e | #e6eef3 | Body text |
| `--muted` | #5d7080 | #8ea3b2 | Secondary text |
| `--border` | #e1e8ed | #223540 | Dividers |
| `--accent` | #0e5a6b | #5cc4d6 | Primary, links, focus ring |
| `--accent-dark` | #0a4653 | #82d4e2 | Primary hover |
| `--sun` | #f2a541 | |Sunrise accent|
| `--sun-light` | #f2a541 | #f2b258 | Sunrise accent |
| `--danger` | #c0392b | #f08a7e | Warning |

## SIDEBAR

| Token | Color
|---|---|
| `--sidebar` | #0f2430 |
| `--sidebar-text` | #dbe7ee |
| `--sidebar-muted` | #8fa6b4 |
| `--sidebar-active` | #16798d |

### Type

- **Font stack:** Avenir Next, Segoe UI, system-ui, Helvetica Neue, Arial, sans-serif
- **Body:** 16 px, line height 1.6
- **Page title:** 2.2 to 3.7 rem, bold, tight spacing
- **View title:** 1.5 rem
- **Buttons:** 0.94 rem, semi-bold (small buttons 0.85 rem)
- **Labels and table headings:** 0.85 to 0.88 rem

### Shape and spacing

- **Controls and buttons:** corner radius 10 px; padding 9 × 16 px (large 12 × 22, small 5 × 12)
- **Cards, tables, tiles:** radius 14 px, 1 px border, padding 20 to 24 px
- **Dialogs:** radius 18 px; 410 px wide for login screens, 780 px for the rights dialog
- **Status tags:** pill shape
- **Sidebar:** 240 px wide
- **Content area:** up to 1200 px wide, 4% side padding

---

## Authentication screens

All four open as a centred dialog over a dimmed backdrop. Pressing Esc or clicking the backdrop closes them. Each has a one-line message area under the button for errors and success notices.

### Login
- **Title:** Log in
- **Subtitle:** Use your Hope, inc. account.
- **Fields:** Email, Password
- **Primary action:** full-width teal "Log in" button
- **Links:** "Forgot password?" and "Create an account"
- **Messages:**
  - Email or password is incorrect.
  - This account is blocked. Contact an administrator.

### Registration
- **Title:** Create your account
- **Subtitle:** Submit a request for access. An administrator must approve the account before the user can sign in.
- **Fields:** First name, Last name, Email
- **Primary action:** "Submit account request"
- **Link:** Sign in
- **Messages:**
  - Please complete all fields.
  - This email already has an account or request. Try signing in or contact your administrator.
- **After submission:** returns to Login with "Your account request has been submitted. An administrator will review it before you can sign in."
- **Initial role:** User
- **Default rights:** None (0 of 36). Approval does not grant rights automatically; an administrator assigns any needed rights manually.

### Set Password
- **Shown when:** a user whose account was added by an administrator logs in for the first time with the temporary password.
- **Title:** Set your password
- **Subtitle:** Your account was created by an administrator. Choose a password only you know.
- **Fields:** New password, Confirm new password
- **Primary action:** "Set password"
- **Messages:** Passwords do not match; approved-account verification errors are shown below the form.
- **After success:** returns to Login with "Your password has been set. You can now sign in."

### Reset Password
- **Title:** Reset password
- **Subtitle:** Enter your email and choose a new password.
- **Fields:** Email, New password, Confirm new password
- **Primary action:** "Save new password"
- **Link:** Back to log in
- **Messages:**
  - Passwords do not match.
  - A neutral recovery message is shown when the account cannot be verified; do not reveal whether an email is registered.
- **After success:** returns to Login with "Password updated. Log in with your new password."

---

## Main navigation dashboard

- **Sidebar (left, dark):** Hope, Inc. ERP logo, Dashboard, permission-available module links, and a bottom profile block with avatar, name, role, and Log out.
- **Top bar:** hamburger button, current view title, and role badge.
- **Responsive behavior:** at 860 px and below, the sidebar starts closed, opens over the page, and closes when the backdrop is tapped. At narrow widths, tables scroll horizontally and rights cards stack vertically.
- **Welcome banner:** "Welcome back, [first name]!" and a short permissions-aware message.
- **Four sample statistic tiles:** Total Customers, Products, Open Orders, and Revenue (MTD).
- **Module access:** a module appears when the user has at least one right in that module. The prototype uses sidebar navigation; it does not show dashboard module tiles.
- **Reports:** the Reports view shows the seven canonical report actions. There is no separate Settings rights group.

### Access states

Module actions are shown only when the user has the matching action right. User Management is available to Admin and Super Admin accounts by role. Super Admin can grant all 36 module rights; Admin can grant only rights assigned to their own account. Newly registered accounts remain pending and start with no rights.

---

## Module screen previews

| Module | Columns |
|---|---|
| Product Management | SKU, Product, Price, Stock |
| Human Resource Management | Employee, Position, Department, Status |
| Customer Management | Name, Email, Phone, Status |
| Sales | Sale ID, Customer, Date, Total |
| Reports | Report, Description, Last updated |

Create, edit, delete, price, and report controls follow their matching canonical rights. Delete actions ask for confirmation. Active status is teal; inactive and on-leave statuses use the warning color. Product, HR, Customer, Sales, and Reports CRUD views are supporting references; the S1-UIX-04 handoff focuses on authentication, dashboard navigation, User Management, and the rights dialog.

---

## User Management

### List view
- **Toolbar:** search box (name or email), status filter (All, Active, Blocked), and for Super Admins a role filter (All roles, Admins, Users). "Add user" sits at the right.
- **Table columns:** Name, Email, Role, Status, Rights (for example "3 / 36"), Actions
- **Row actions:** Edit, Rights, Block or Unblock, and Delete are available according to the viewer role. Super Admin can manage Admin and User accounts; Admin can manage User accounts only.
- **Empty result:** "No accounts match your filters."

### Add / Edit User form (dialog)
- **Fields:** Full name, Email, Role, and (Add only) Temporary password
- **Add subtitle:** An administrator provides a temporary password; the user sets a new password at first sign-in. New accounts start with no module rights.
- **Buttons:** "Add user" or "Save changes", and Cancel
- **Error:** That email is already registered.

### Block / Unblock
A confirmation dialog appears before the change.
- **Block:** "They will not be able to log in until unblocked." Red button.
- **Unblock:** "They will be able to log in again." Teal button.
- The Delete confirmation reads "The account is removed permanently."

### Roles POV
| Element | Super Admin | Admin |
|---|---|---|
| Admin accounts in the list | Visible | Hidden |
| Role filter | Visible | Hidden |
| Role choices in the form | Admin, User | User only |
| Rights an Admin does not hold | Can grant | Greyed out, with tooltip |

---

## Rights dialog 

### Layout
- **Title:** "Rights: [user name]"
- **Subtitle:** role and email
- **Helper bar:** live counter ("14 of 36 selected"), "Select all" and "Clear all" buttons
- **Admin note:** "Greyed-out rights are ones you don't hold, so you can't grant them."
- **Body:** five bordered cards in a responsive grid (about 210 px minimum width each). The module name in each card heading has a master checkbox.
- **Footer:** "Save rights" (primary) and Cancel

### Checkbox State
- Checked: every grantable right in the card is on
- Partly filled: some are on
- Unchecked: none are on
- Disabled: the Admin can grant nothing in that module

Select all and Clear all only change rights the viewer is allowed to grant.

### Components

**Customer (3)**
Add Customer · Edit Customer · Delete Customer

**Product (6)**
Add Product · Edit Product · Delete Product · Add Price · Edit Price · Delete Price

**HR / Human Resources (13)**
Add Job · Edit Job · Delete Job · Add Department · Edit Department · Delete Department · Add Employee · Edit Employee · Delete Employee · View Job History · Add Job History · Edit Job History · Delete Job History

**Sales (7)**
Add Sale · Edit Sale · Delete Sale · View Sale Details · Add Sale Detail · Edit Sale Detail · Delete Sale Detail

**Reports (7)**
Top Customers · Product Master List · Top Products · Active Employees · All Employees · Employee Job History · Top Sales

User Management is role-gated and is not part of the 36-right module catalog.

### Admin Rules/Rights
Admin can grant only rights they hold themselves. Other rights are disabled and greyed out with the tooltip "You don't hold this right, so you can't grant it." Select all and Clear all affect only grantable rights.

---

## Component states

| Component | States |
|---|---|
| Primary, transparent and warning buttons | Default, hover, keyboard focus (2 px teal outline) |
| Input and select | Default, focus (teal border), required, error message below the form |
| Module navigation link | Available when the user has a right in that module; current view is highlighted |
| Status tag | Active (teal), Blocked / Inactive / On leave (red) |
| Rights toggle | Checked, unchecked, disabled (greyed, tooltip) |
| Toast | Bottom centre, disappears after 2.2 seconds |
| Confirm dialog | Used for Block, Unblock and every Delete |

---

## Responsive behaviour

| Width | Behaviour |
|---|---|
| Above 860 px | Sidebar open by default; landing hero in two columns |
| 860 px and below | Sidebar becomes an overlay and starts closed; hero stacks; tables scroll sideways |
| 680 px and below | User controls stack; rights cards become one column |
| 480 px and below | Authentication name fields stack vertically |

The current prototype uses the light theme. Dark tokens are shown in the palette reference.
