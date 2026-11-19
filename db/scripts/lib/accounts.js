const fs = require('node:fs/promises');
const path = require('node:path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const root = path.resolve(__dirname, '../../..');
const envFileIndex = process.argv.indexOf('--env-file');
const selectedEnvFile = envFileIndex >= 0 ? process.argv[envFileIndex + 1] : null;
if (envFileIndex >= 0 && !selectedEnvFile) {
  throw new Error('--env-file requires a path, for example web/.env.local.');
}
dotenv.config({
  path: selectedEnvFile ? path.resolve(root, selectedEnvFile) : path.join(root, '.env'),
  override: Boolean(selectedEnvFile),
});

if (selectedEnvFile) {
  if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  if (!process.env.SUPABASE_SECRET_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
}

const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and set it.`);
  return value;
}

function isDevHost() {
  const host = required('DB_HOST').toLowerCase();
  const allowed = new Set(
    (process.env.DB_ALLOWED_DEV_HOSTS || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean),
  );
  return localHosts.has(host) || allowed.has(host);
}

function assertDevOnly(action) {
  if (process.env.DB_ENV !== 'development') {
    throw new Error(`${action} refused: set DB_ENV=development in .env.`);
  }
  if (!isDevHost()) {
    throw new Error(`${action} refused: host ${process.env.DB_HOST} is not localhost or listed in DB_ALLOWED_DEV_HOSTS.`);
  }
}

async function connect() {
  const connectionString = process.env.DATABASE_URL;
  const databaseHost = connectionString
    ? new URL(connectionString).hostname.toLowerCase()
    : required('DB_HOST').toLowerCase();
  const clientConfig = connectionString
    ? { connectionString }
    : {
        host: required('DB_HOST'),
        port: Number(process.env.DB_PORT || 5432),
        database: required('DB_NAME'),
        user: required('DB_USER'),
        password: required('DB_PASSWORD'),
      };

  if (!localHosts.has(databaseHost) || process.env.DB_SSL === 'true' || process.env.DATABASE_SSL === 'true') {
    clientConfig.ssl = { rejectUnauthorized: true };
    if (process.env.DATABASE_SSL_ROOT_CERT) {
      clientConfig.ssl.ca = await fs.readFile(path.resolve(root, process.env.DATABASE_SSL_ROOT_CERT), 'utf8');
    }
  }
  clientConfig.connectionTimeoutMillis = 10000;

  if (selectedEnvFile && connectionString) {
    const databaseUrl = new URL(connectionString);
    const projectRef = new URL(required('SUPABASE_URL')).hostname.split('.')[0];
    const databaseMatchesProject = databaseUrl.hostname === `db.${projectRef}.supabase.co`
      || decodeURIComponent(databaseUrl.username).endsWith(`.${projectRef}`);
    if (!databaseMatchesProject) {
      throw new Error('DATABASE_URL and SUPABASE_URL must point to the same Supabase project.');
    }
  }

  const client = new Client(clientConfig);
  await client.connect();
  return client;
}

// The header is fixed so a password column can never be added to the team file.
function parseTeamCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  if (!lines.length || lines[0].toLowerCase().replace(/\s/g, '') !== 'first_name,last_name,email') {
    throw new Error('Team CSV header must be exactly: first_name,last_name,email');
  }
  const seen = new Set();
  const members = lines.slice(1).map((line, index) => {
    const parts = line.split(',').map((part) => part.trim());
    if (parts.length !== 3 || parts.some((part) => !part)) {
      throw new Error(`Team CSV data row ${index + 1} must contain exactly first_name,last_name,email`);
    }
    const email = parts[2].toLowerCase();
    if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)) {
      throw new Error(`Team CSV data row ${index + 1} has an invalid email address`);
    }
    if (seen.has(email)) throw new Error(`Team CSV data row ${index + 1} repeats an earlier email address`);
    seen.add(email);
    return { firstName: parts[0], lastName: parts[1], email };
  });
  if (!members.length) throw new Error('Team CSV contains no members');
  return members;
}

async function readTeamFile(file) {
  try {
    return parseTeamCsv(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`${path.relative(root, file)} not found. Copy db/seeds/team.example.csv to db/seeds/team.csv and fill in the real team.`);
    }
    throw error;
  }
}

function authApi() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  return { base: url.replace(/\/+$/, ''), headers };
}

async function findAuthUserId(api, email) {
  for (let page = 1; page <= 50; page += 1) {
    const response = await fetch(`${api.base}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: api.headers });
    if (!response.ok) throw new Error(`Supabase Auth user lookup failed (HTTP ${response.status}).`);
    const users = (await response.json()).users || [];
    const match = users.find((user) => (user.email || '').toLowerCase() === email);
    if (match) return match.id;
    if (users.length < 200) return null;
  }
  return null;
}

// Creates a passwordless, confirmed Auth identity; the person sets a password through a setup link.
async function ensureAuthUser(client, email) {
  const api = authApi();
  if (api) {
    const response = await fetch(`${api.base}/auth/v1/admin/users`, {
      method: 'POST',
      headers: api.headers,
      body: JSON.stringify({ email, email_confirm: true }),
    });
    if (response.ok) return (await response.json()).id;
    const existing = await findAuthUserId(api, email);
    if (existing) return existing;
    throw new Error(`Supabase Auth could not create an account (HTTP ${response.status}).`);
  }

  const emailColumn = await client.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email'",
  );
  if (emailColumn.rowCount > 0 || process.env.DB_ENV !== 'development' || !isDevHost()) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY so accounts are created through Supabase Auth.');
  }
  const stub = await client.query('INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id');
  return stub.rows[0].id;
}

async function ensureAppUser(client, { firstName, lastName, email, roleName }) {
  const columns = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'app_user'
       AND column_name IN ('role', 'role_id')`,
  );
  const hasRoleId = columns.rows.some((column) => column.column_name === 'role_id');
  const hasRoleText = columns.rows.some((column) => column.column_name === 'role');
  if (hasRoleId === hasRoleText) {
    throw new Error('public.app_user must have exactly one of role_id or role columns.');
  }

  const existing = hasRoleId
    ? await client.query(
        `SELECT account.id, account_role.name AS role_name
         FROM public.app_user account
         JOIN public.role account_role ON account_role.id = account.role_id
         WHERE account.email = $1`,
        [email],
      )
    : await client.query(
        'SELECT id, role AS role_name FROM public.app_user WHERE lower(email) = $1',
        [email],
      );
  if (existing.rowCount > 0) return { created: false, id: existing.rows[0].id, roleName: existing.rows[0].role_name };

  const authUserId = await ensureAuthUser(client, email);
  const inserted = hasRoleId
    ? await client.query(
        `INSERT INTO public.app_user (first_name, last_name, email, role_id, auth_user_id, approval_status)
         SELECT $1, $2, $3, account_role.id, $4, 'Approved'
         FROM public.role account_role
         WHERE account_role.name = $5 AND account_role.status = 'Active'
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [firstName, lastName, email, authUserId, roleName],
      )
    : await client.query(
        `INSERT INTO public.app_user (first_name, last_name, email, role, auth_user_id, approval_status)
         VALUES ($1, $2, $3, $4, $5, 'Approved')
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [firstName, lastName, email, roleName, authUserId],
      );
  if (inserted.rowCount === 0) throw new Error(`Could not create ${roleName} account; run npm run db:seed first.`);
  return { created: true, id: inserted.rows[0].id, roleName };
}

module.exports = { assertDevOnly, connect, ensureAppUser, isDevHost, readTeamFile, required, root };
