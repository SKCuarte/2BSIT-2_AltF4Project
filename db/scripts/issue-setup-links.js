const path = require('node:path');
const { readTeamFile, required, root } = require('./lib/accounts');

const args = process.argv.slice(2);
const emailIndex = args.indexOf('--email');
const emailFilter = emailIndex >= 0 ? (args[emailIndex + 1] || '').trim().toLowerCase() : '';

function setupBaseUrl() {
  const url = new URL(required('APP_BASE_URL'));
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw new Error('APP_BASE_URL must use https unless it is localhost.');
  return url.origin;
}

function getApi() {
  const base = required('SUPABASE_URL').replace(/\/+$/, '');
  const key = required('SUPABASE_SECRET_KEY');
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  return { base, headers };
}

async function findAuthUser(api, email) {
  for (let page = 1; page <= 50; page += 1) {
    const response = await fetch(`${api.base}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: api.headers });
    if (!response.ok) throw new Error(`Supabase Auth lookup failed (HTTP ${response.status}).`);
    const users = (await response.json()).users || [];
    const match = users.find((user) => (user.email || '').toLowerCase() === email);
    if (match) return match;
    if (users.length < 200) return null;
  }
  return null;
}

async function findAppUser(api, email) {
  const url = new URL(`${api.base}/rest/v1/app_user`);
  url.searchParams.set('select', 'is_blocked');
  url.searchParams.set('email', `eq.${email}`);
  const response = await fetch(url, { headers: api.headers });
  if (!response.ok) throw new Error(`app_user lookup failed (HTTP ${response.status}).`);
  return (await response.json())[0] || null;
}

async function recoveryLink(api, baseUrl, email) {
  const response = await fetch(`${api.base}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: api.headers,
    body: JSON.stringify({ type: 'recovery', email }),
  });
  if (!response.ok) throw new Error(`Supabase could not generate a link (HTTP ${response.status}).`);
  const hashedToken = (await response.json()).hashed_token;
  if (!hashedToken) throw new Error('Supabase returned no recovery token.');
  // Fragment keeps the one-time token out of server and proxy logs.
  return `${baseUrl}/auth/recovery-callback#token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;
}

async function main() {
  if (!process.stdout.isTTY) {
    throw new Error('Refusing to print one-time links to a non-interactive stream; run this in a terminal.');
  }
  const baseUrl = setupBaseUrl();
  const api = getApi();
  const members = await readTeamFile(path.join(root, 'db', 'seeds', 'team.csv'));
  const emails = members.map((member) => member.email).filter((email) => !emailFilter || email === emailFilter);
  if (emails.length === 0) {
    console.log('No matching team members.');
    return;
  }

  for (const email of emails) {
    const authUser = await findAuthUser(api, email);
    const appUser = authUser ? await findAppUser(api, email) : null;
    if (!authUser || !appUser) {
      console.warn(`Skipped ${email}: run the team seed first.`);
    } else if (appUser.is_blocked) {
      console.warn(`Skipped ${email}: account is blocked.`);
    } else if (authUser.last_sign_in_at) {
      console.log(`Skipped ${email}: already signed in; use Forgot Password for resets.`);
    } else {
      console.log(`${email}\n  ${await recoveryLink(api, baseUrl, email)}`);
    }
  }
  console.log('\nLinks are shown once and never stored by this script. Supabase controls their expiry; re-running issues a new link.');
}

main().catch((error) => {
  console.error(`Setup link issuance failed: ${error.message}`);
  process.exitCode = 1;
});
