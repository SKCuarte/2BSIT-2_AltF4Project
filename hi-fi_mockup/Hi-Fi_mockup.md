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
- **Title:** Create account
- **Subtitle:** New accounts start with the User role.
- **Fields:** Full name, Email, Password (6 characters minimum), Confirm password
- **Primary action:** "Create account"
- **Link:** Back to log in
- **Messages:**
  - Passwords do not match.
  - This email is already registered. Log in instead.
- **After success:** returns to Login with "Account created. Log in to continue."
- **Default rights for new accounts:** Product View and Customer View.

### Set Password
- **Shown when:** a user whose account was added by an administrator logs in for the first time with the temporary password.
- **Title:** Set your password
- **Subtitle:** Your account was created by an administrator. Choose a password only you know.
- **Fields:** New password, Confirm new password
- **Primary action:** "Save and continue" (goes straight into the dashboard)
- **Message:** Passwords do not match.

### Reset Password
- **Title:** Reset password
- **Subtitle:** Enter your email and choose a new password.
- **Fields:** Email, New password, Confirm new password
- **Primary action:** "Save new password"
- **Link:** Back to log in
- **Messages:**
  - Passwords do not match.
  - No account uses that email.
- **After success:** returns to Login with "Password updated. Log in with your new password."

---

## Main navigation dashboard

### 
- **Sidebar (left, dark):**
  - Logo: sunrise "H" mark with "Hope, Inc. ERP"
  - Menu items with line icons: Dashboard, Product Management, Human Resource Management, Customer Management, User Management
  - Profile block at the bottom: round avatar with the first letter of the name, full name, role, and a Log out button
- **Top bar:** menu (hamburger) button, view title, "Edit content" button, role badge
- **Sliding menu:** the hamburger button slides the sidebar out and back in. On phones and narrow windows (860 px and below) the sidebar starts closed, opens over the page, and a dim backdrop closes it when tapped.

### Content
- **Welcome banner:** teal card with "Welcome back, [first name]!", a short line of text and two sunrise circles in the corner
- **Four stat tiles:** Total Customers, Products, Open Orders, Revenue (MTD), each with a note line. The figures are sample values that can be replaced with Edit content.
- **Module tiles (5):** Product Management, Human Resource Management, Customer Management, User Management, Reports & Settings. Each shows an icon, a title, a one-line description and "n of N rights".

### Tile and menu states
| State | Look and behaviour |
|---|---|
| Allowed | Full colour, pointer cursor, reachable with the keyboard, opens the module |
| No View right | Dimmed, red "Access off" tag, no click and no tab stop |
| User Management for a User account | Tile and menu item are removed |
| Reports & Settings | Allowed tile shows a short notice that the module opens in a later sprint |

Menu items follow the same rule: an item appears only if the user holds the View right for that module.

---

## Module screens (Products, HR, Customers)

Each module has a view title, an add form (shown only with the Create right) and a table.

| Module | Columns |
|---|---|
| Product Management | SKU, Product, Price, Stock |
| Human Resource Management | Employee, Position, Department, Status |
| Customer Management | Name, Email, Phone, Status |

- Edit and Delete buttons appear only with the Edit and Delete rights.
- Delete always asks for confirmation.
- Status tags: Active in teal; Inactive and On leave in red.

---

## User Management

### List view
- **Toolbar:** search box (name or email), status filter (All, Active, Blocked), and for Super Admins a role filter (All roles, Admins, Users). "Add user" sits at the right.
- **Table columns:** Name, Email, Role, Status, Rights (for example "3 / 36"), Actions
- **Row actions:** Edit, Rights, Block or Unblock, Delete. Each button appears only if the viewer holds the matching right.
- **Empty result:** "No accounts match your filters."

### Add / Edit User form (dialog)
- **Fields:** Full name, Email, Role, and (Add only) Temporary password
- **Add subtitle:** The user sets their own password at first login.
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

**Product Management (8)**
View · Create · Edit · Delete · Import · Export · Adjust stock · Set prices

**Human Resource Management (8)**
View · Create · Edit · Delete · Approve leave · Run payroll · View salaries · Export

**Customer Management (8)**
View · Create · Edit · Delete · Import · Export · Merge duplicates · View history

**User Management (7)**
View users · Add users · Edit users · Block / Unblock · Reset passwords · Assign rights · Delete users

**Reports & Settings (5)**
View reports · Export reports · Schedule reports · Edit settings · View audit log

### Admin Rules/Rights
Admin can grant only rights they hold themselves. Any other right is greyed out with the tooltip "You don't hold this right, so you can't grant it."

---

## Component states

| Component | States |
|---|---|
| Primary, transparent and warning buttons | Default, hover, keyboard focus (2 px teal outline) |
| Input and select | Default, focus (teal border), required, error message below the form |
| Module tile | Default, hover (teal border), focus, dimmed |
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
| Not yet defined | 600 px and 480 px breakpoints (logged as audit ticket UI-08) |

Light and dark themes follow the device setting.
