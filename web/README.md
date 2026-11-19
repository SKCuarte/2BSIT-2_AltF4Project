This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Dashboard authorization

The dashboard reads the active role and grants from the database on the server.
Admins and Superadmins have access to active modules with active rights; regular
users can open a module when they have at least one active right in it. Only Superadmins can
open System Settings. Dashboard counts are queried only for accessible modules.
The module and settings pages are placeholders until their features are built.
Apply database migration `009_protect_dashboard_module_data.sql` before exposing
the dashboard to prevent bypassing these checks through Supabase's direct API.

Next.js Proxy checks the registered dashboard and API module paths, redirecting
denied page requests to `/no-access` and returning HTTP 403 for denied API
requests. It fails closed for unmapped nested routes and mutations. When adding
an operation, explicitly map its route and action in `routeRequirement` and
also call `requireRight(module, action)` in the server page, route handler or
server action before reading or changing data. Actions are the exact active
`rights.action` values, e.g. `requireRight("CUSTOMER", "ADD")`; omitting the
action checks module access only. Handle unavailable and unauthenticated
results separately from forbidden results. Existing administrator APIs retain
their own stricter authorization checks.
Protected administrator APIs also reject accounts that must set a new password;
password setup remains available through the authentication endpoints.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
