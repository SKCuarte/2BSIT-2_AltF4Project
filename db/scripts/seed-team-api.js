const path = require('node:path');
const { readTeamFile, required, root } = require('./lib/accounts');

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
    if (match) return match.id;
    if (users.length < 200) return null;
  }
  return null;
}

async function ensureAuthUser(api, email) {
  const response = await fetch(`${api.base}/auth/v1/admin/users`, {
    method: 'POST',
    headers: api.headers,
    body: JSON.stringify({ email, email_confirm: true }),
  });
  if (response.ok) return { id: (await response.json()).id, created: true };
  const existingId = await findAuthUser(api, email);
  if (existingId) return { id: existingId, created: false };
  throw new Error(`Supabase Auth creation failed (HTTP ${response.status}).`);
}

async function findAppUser(api, email) {
  const url = new URL(`${api.base}/rest/v1/app_user`);
  url.searchParams.set('select', 'id,role');
  url.searchParams.set('email', `eq.${email}`);
  const response = await fetch(url, { headers: api.headers });
  if (!response.ok) throw new Error(`app_user lookup failed (HTTP ${response.status}).`);
  return response.json();
}

async function insertAppUser(api, member, authUserId) {
  const response = await fetch(`${api.base}/rest/v1/app_user`, {
    method: 'POST',
    headers: { ...api.headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      first_name: member.firstName,
      last_name: member.lastName,
      email: member.email,
      role: 'Superadmin',
      auth_user_id: authUserId,
      approval_status: 'Approved',
    }),
  });
  if (!response.ok) {
    const error = new Error(`app_user insert failed (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function removeAuthUser(api, userId) {
  const response = await fetch(`${api.base}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: api.headers,
  });
  return response.ok;
}

async function seedMember(api, member) {
  const existing = await findAppUser(api, member.email);
  if (existing.length) {
    if (existing[0].role !== 'Superadmin') {
      console.warn(`Skipped ${member.email}: existing role is not Superadmin; role left unchanged.`);
    } else {
      console.log(`Superadmin ${member.email} already exists.`);
    }
    return;
  }

  const authUser = await ensureAuthUser(api, member.email);
  try {
    const inserted = await insertAppUser(api, member, authUser.id);
    if (!inserted.length) throw new Error('app_user insert returned no row.');
    console.log(`Created Superadmin ${member.email} with no password.`);
  } catch (error) {
    const current = error.status === 409 ? await findAppUser(api, member.email) : [];
    if (current.length) {
      if (authUser.created) await removeAuthUser(api, authUser.id).catch(() => false);
      if (current[0].role !== 'Superadmin') {
        console.warn(`Skipped ${member.email}: concurrent account has a different role; role left unchanged.`);
      } else {
        console.log(`Superadmin ${member.email} already exists.`);
      }
      return;
    }
    if (authUser.created) await removeAuthUser(api, authUser.id).catch(() => false);
    throw error;
  }
}

async function main() {
  const file = path.resolve(root, 'db', 'seeds', 'team.csv');
  const members = await readTeamFile(file);
  const api = getApi();
  for (const member of members) await seedMember(api, member);
}

main().catch((error) => {
  console.error(`Team seed failed: ${error.message}`);
  process.exitCode = 1;
});
