## 1. Roles and privileges

Roles:
| SUPER ADMIN: |Can EDIT Admins and users, Can BLOCK Admins and users 
| ADMIN: | Can EDIT and BLOCK Users only |
| User: | can EDIT (with limitations)

-A blocked account cannot log in. An account with Dashboard access switched off sees a notice instead of the figures. New registrations have access by default, and an admin can switch it off.
-Credentials are never shown on the pages. The accounts are in the `SEED` list at the top of `script.js`.

## 2. How it works?

- Storage: accounts in `localStorage` key `hope_users_v2`, page text in `hope_content_v2`. Reads and writes are wrapped in try/catch.
- Session: held in memory only; a refresh logs the user out.
- Tables are built with DOM methods and `textContent`, so typed names cannot inject HTML.
- The dialog closes with the close button, a click outside, or Escape.

## 3. Security purpose (important since the data are being stored here ---->)

This is a front-end demo. Before production use:

1. Passwords are being stored in plain text in the browser. Use a server, hash passwords (bcrypt or Argon2) and use secure sessions.
2. Roles, blocking and rights are enforced only in the browser. Enforce them on the server.
3. Password reset has no email verification. Use a time-limited emailed link or code.
4. No rate limiting on login attempts.
5. The card figures are static samples. Connect them to real data.

 Hope, inc. 
   Everything is saved in this browser (localStorage).
   What this file does:
     1. Settings and demo accounts
     2. Small helper functions
     3. Editable page text ("Edit content")
     4. The log in / register / reset password pop-up
     5. The dashboard after login
     6. The admin table (Super Admin and Admin only)

!NOTICE! 
- Never use personal information upon registering new user account, UNLESS supabase was implemented.
- BACKEND Dev or Database will use supabase website to handle information(via server)
## 4. Testing checklist

- Register, then log in: dashboard appears.
- Super Admin: block an admin, then try logging in as that admin.
- Admin: only users are listed; switch off Dashboard access and log in as that user.
- Reset a password and log in with the new one.
- Edit a card figure, save, reload: it persists.
- Check widths 375, 768 and 1366 px in both color themes.

## !NOTICE!
-Developments are underway, updates, Modifications, and Fixes are still ongoing and will be implemented and deployed soon.

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=14&duration=4000&pause=1500&color=3FB950&background=00000000&center=true&vCenter=true&width=420&height=30&lines=BY+UI/UX+Dev:+usr-Chr0nos.;Let%27s+build+something+great+<3." alt="Creator Notice" />
</p>