const { assertDevOnly, connect, ensureAppUser } = require('./lib/accounts');

const devUsers = [
  {
    firstName: 'Lisa',
    lastName: 'Park',
    email: 'lisa.park@example.invalid',
    roleName: 'Admin',
    rights: ['CUSTOMER_ADD', 'CUSTOMER_EDIT', 'PRODUCT_ADD', 'REPORT_TOP_CUSTOMERS'],
  },
  {
    firstName: 'Alex',
    lastName: 'Rivera',
    email: 'alex.rivera@example.invalid',
    roleName: 'User',
    rights: ['CUSTOMER_ADD', 'SALES_ADD', 'SALESDETAIL_VIEW', 'REPORT_TOP_SALES'],
  },
];

async function main() {
  assertDevOnly('Dev user seed');

  const client = await connect();
  try {
    await client.query('BEGIN');
    try {
      const actor = await client.query(
        `SELECT account.id
         FROM public.app_user account
         JOIN public.role account_role ON account_role.id = account.role_id
         WHERE account_role.name = 'Superadmin' AND account.approval_status = 'Approved'
           AND account.is_blocked = FALSE AND account.status = 'Active'
         ORDER BY account.id
         LIMIT 1`,
      );
      if (actor.rowCount === 0) throw new Error('No active Superadmin found; run npm run db:seed:team first.');
      await client.query("SELECT set_config('app.user_id', $1, TRUE)", [String(actor.rows[0].id)]);

      for (const { rights, ...user } of devUsers) {
        const account = await ensureAppUser(client, user);
        await client.query(
          `INSERT INTO public.user_permission (user_id, right_id, granted_by)
           SELECT $1, permission_right.id, $2
           FROM public.rights permission_right
           WHERE permission_right.code = ANY($3::text[])
           ON CONFLICT (user_id, right_id) DO NOTHING`,
          [account.id, actor.rows[0].id, rights],
        );
        console.log(`${account.created ? 'Created' : 'Found'} ${user.roleName} ${user.email}.`);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log('Dev users have no password; run npm run db:setup-links to issue setup links.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Dev user seed failed: ${error.message}`);
  process.exitCode = 1;
});
