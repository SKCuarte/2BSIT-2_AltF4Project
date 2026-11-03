# Hope, Inc. registration UI

This prototype contains only the public registration screen for S1-DEV-02:

- First Name
- Last Name
- Email address
- Notice that new accounts use the `User` role and await approval

The form sends these three fields to `POST /api/register`. Role and status are not
sent by the browser; the backend must assign `User` and `Pending` itself.

The registration endpoint is not part of this static UI prototype. The form will
show an error until the backend endpoint is available. No login, password reset,
dashboard, or user-management screens are included here.
