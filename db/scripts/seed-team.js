const path = require('node:path');
const { connect, ensureAppUser, readTeamFile, root } = require('./lib/accounts');

async function main() {
  const file = path.resolve(process.argv[2] || path.join(root, 'db', 'seeds', 'team.csv'));
  const members = await readTeamFile(file);

  const client = await connect();
  try {
    for (const member of members) {
      await client.query('BEGIN');
      try {
        const result = await ensureAppUser(client, { ...member, roleName: 'Superadmin' });
        await client.query('COMMIT');
        if (result.created) {
          console.log(`Created Superadmin ${member.email} (no password; issue a setup link).`);
        } else if (result.roleName !== 'Superadmin') {
          console.warn(`Skipped ${member.email}: account already exists as ${result.roleName}; role left unchanged.`);
        } else {
          console.log(`Superadmin ${member.email} already exists.`);
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Team seed failed: ${error.message}`);
  process.exitCode = 1;
});
