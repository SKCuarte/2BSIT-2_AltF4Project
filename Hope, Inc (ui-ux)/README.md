## Roles and privileges ##

Roles:
| SUPER ADMIN: |Can EDIT Admins and users, Can BLOCK Admins and users. 
| ADMIN: | Can EDIT and BLOCK Users only.
| User: | can EDIT (with limitations).

-Blocked accounts cannot log in or edit. An account with Dashboard access switched off sees a notice instead of the figures. New registrations have access by default, and admin can switch it off.

## How it works? ##

- Storage: accounts in `localStorage` key `hope_users_v2`, page text in `hope_content_v2`. Reads and writes are wrapped in try/catch.
- Session: held in memory only; a refresh logs the user out.
- Tables are built with DOM methods and `textContent`, so typed names cannot inject HTML.

>>## Security purpose (important since the data are being stored here ---->) ##
1. Passwords are being stored in plain text in the browser. (Use a server, hash passwords (bcrypt or Argon2) and use secure sessions.)
2. Roles, blocking and rights are enforced only in the browser. Enforce them on the server.
3. Password reset has no email verification. Use a time-limited emailed link or code.
4. No rate limiting on login attempts.
  >>Everything is saved in this browsers `localStorage`.
     What this file does:
       1. Settings and accounts.
       2. Small helper functions.
       3. Editable page text ("Edit content").
       4. The log in / register / reset password.
       5. The dashboard after login.
       6. The admin table (Super Admin and Admin only).
       
 >>`DEMO ACCOUNT`
  -  `SUPERADMIN`
     name: "Super Admin"
     email: "superadmin@hope.com"
     pw: "SuperAdmin#1"
     role: "superadmin"

  - `ADMIN`
    name: "Admin"
    email: "admin@hope.com"
    pw: "Admin#1234"
    role: "admin"

  - For `Users`, just register a new account and log in.


 !NOTICE!
- Never use personal information upon registering new user account, UNLESS supabase was implemented.
- BACKEND Dev or Database will use supabase website to handle information(via server).

## !NOTICE! ##
-Developments are underway, updates, Modifications, and Fixes are still ongoing and will be implemented and deployed soon.

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=14&duration=4000&pause=1500&color=3FB950&background=00000000&center=true&vCenter=true&width=420&height=30&lines=BY+UI/UX+Dev:+usr-Chr0nos.;Let%27s+build+something+great+<3." alt="Creator Notice" />
</p>