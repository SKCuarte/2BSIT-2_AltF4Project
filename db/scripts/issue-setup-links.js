const crypto = require('node:crypto');
const { connect, required } = require('./lib/accounts');

const args = process.argv.slice(2);
const emailIndex = args.indexOf('--email');
const emailFilter = emailIndex >= 0 ? (args[emailIndex + 1] || '').trim().toLowerCase() : '';
const assumeNoPassword = args.includes('--assume-no-password');

function setupBaseUrl() {
  const url = new URL(required('APP_BASE_URL'));
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw new Error('APP_BASE_URL must use https unless it is localhost.');
  return url.origin;
}

function setupTtlHours() {
  const hours = Number(process.env.SET_PASSWORD_TTL_HOURS || 24);
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
    throw new Error('SET_PASSWORD_TTL_HOURS must be a whole number from 1 to 168.');
  }
  return hours;
}

async function pendingAccounts(client) {
  const passwordColumn = await client.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'encrypted_password'",
  );
  if (passwordColumn.rowCount === 0 && !assumeNoPassword) {
    throw new Error('auth.users.encrypted_password is unavailable (local stub?). Re-run with --assume-no-password to cover every unblocked account.');
  }
  const conditions = ['account.is_blocked = FALSE'];
  const params = [];
  if (passwordColumn.rowCount > 0) {
    conditions.push("COALESCE(auth_account.encrypted_password, '') = ''");
    conditions.push("COALESCE(auth_account.raw_app_meta_data->>'provider', 'email') = 'email'");
  }
  if (emailFilter) {
    params.push(emailFilter);
    conditions.push(`account.email = $${params.length}`);
  }
  const result = await client.query(
    `SELECT account.id, account.email
     FROM public.app_user account
     JOIN auth.users auth_account ON auth_account.id = account.auth_user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY account.email`,
    params,
  );
  return result.rows;
}

// Same transaction as the documented issuance SQL: lock account, invalidate older link, insert new hash.
async function issue(client, account, ttlHours) {
  const token = crypto.randomBytes(32).toString('base64url');
  const digest = crypto.createHash('sha256').update(token).digest();
  await client.query('BEGIN');
  try {
    const locked = await client.query(
      'SELECT id FROM public.app_user WHERE id = $1 AND is_blocked = FALSE FOR UPDATE',
      [account.id],
    );
    if (locked.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(
      `UPDATE public.password_reset_token
       SET status = 'Inactive',
           stamp = 'INVALIDATED system ' || to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD FMHH12:MI AM')
       WHERE user_id = $1 AND purpose = 'set_password' AND status = 'Active' AND used_at IS NULL`,
      [account.id],
    );
    const inserted = await client.query(
      `INSERT INTO public.password_reset_token (user_id, purpose, token_hash, expires_at)
       VALUES ($1, 'set_password', $2, CURRENT_TIMESTAMP + make_interval(hours => $3::int))
       RETURNING expires_at`,
      [account.id, digest, ttlHours],
    );
    await client.query('COMMIT');
    return { token, expiresAt: inserted.rows[0].expires_at };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  if (!process.stdout.isTTY) {
    throw new Error('Refusing to print one-time links to a non-interactive stream; run this in a terminal.');
  }
  const baseUrl = setupBaseUrl();
  const ttlHours = setupTtlHours();

  const client = await connect();
  try {
    const accounts = await pendingAccounts(client);
    if (accounts.length === 0) {
      console.log('No accounts need a setup link.');
      return;
    }
    for (const account of accounts) {
      const issued = await issue(client, account, ttlHours);
      if (!issued) continue;
      console.log(`${account.email}\n  ${baseUrl}/set-password#token=${issued.token}\n  expires ${issued.expiresAt.toISOString()}`);
    }
    console.log('\nLinks are shown once and stored only as SHA-256 hashes. Re-running invalidates older links.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Setup link issuance failed: ${error.message}`);
  process.exitCode = 1;
});
