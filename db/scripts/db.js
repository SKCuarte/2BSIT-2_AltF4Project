const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { Client } = require('pg');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(root, '.env') });

const migrationsDirectory = path.join(root, 'db', 'migrations');
const migrationNamePattern = /^\d{3,}_[a-z0-9_]+\.sql$/;
const migrationLockId = '7212046501';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and set the database connection values.`);
  }
  return value;
}

function databaseConfig(overrides = {}) {
  const config = {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT || 5432),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    connectionTimeoutMillis: 10000,
    ...overrides,
  };
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('DB_PORT must be an integer from 1 to 65535.');
  }
  return config;
}

async function connect(config = databaseConfig()) {
  const client = new Client(config);
  await client.connect();
  const result = await client.query('SHOW server_version_num');
  if (Number(result.rows[0].server_version_num) < 150000) {
    await client.end();
    throw new Error('PostgreSQL 15 or newer is required.');
  }
  return client;
}

function compareNames(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function listMigrations() {
  const entries = await fs.readdir(migrationsDirectory, { withFileTypes: true });
  const invalidFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql') && !migrationNamePattern.test(entry.name))
    .map((entry) => entry.name);
  if (invalidFiles.length) {
    throw new Error(`Migration filenames must match NNN_description.sql: ${invalidFiles.join(', ')}`);
  }
  const files = entries
    .filter((entry) => entry.isFile() && migrationNamePattern.test(entry.name))
    .map((entry) => entry.name)
    .sort(compareNames);
  const numbers = new Set();
  for (const filename of files) {
    const number = filename.match(/^\d+/)[0];
    if (numbers.has(number)) {
      throw new Error(`Duplicate migration number ${number}. Pull the latest changes and renumber the unapplied migration.`);
    }
    numbers.add(number);
  }
  return files;
}

function checksum(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

async function ensureMigrationTable(client) {
  await client.query('BEGIN');
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        filename text PRIMARY KEY,
        checksum char(64) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query("COMMENT ON TABLE public.schema_migrations IS 'Tracks applied migration files and their SHA-256 checksums.'");
    await client.query("COMMENT ON COLUMN public.schema_migrations.filename IS 'Unique migration filename, applied in lexical order.'");
    await client.query("COMMENT ON COLUMN public.schema_migrations.checksum IS 'SHA-256 checksum of the exact migration file contents.'");
    await client.query("COMMENT ON COLUMN public.schema_migrations.applied_at IS 'Time at which the migration transaction committed.'");
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function appliedMigrations(client) {
  const exists = await client.query("SELECT to_regclass('public.schema_migrations') AS table_name");
  if (!exists.rows[0].table_name) return new Map();
  const result = await client.query('SELECT filename, checksum, applied_at FROM public.schema_migrations ORDER BY filename');
  return new Map(result.rows.map((row) => [row.filename, row]));
}

async function verifyChecksums(files, applied) {
  const currentNames = new Set(files);
  for (const [filename, row] of applied) {
    if (!currentNames.has(filename)) {
      throw new Error(`Applied migration ${filename} is missing from db/migrations. Restore the original file; applied migrations are immutable.`);
    }
    const contents = await fs.readFile(path.join(migrationsDirectory, filename));
    if (checksum(contents) !== row.checksum.trim()) {
      throw new Error(`Checksum mismatch for applied migration ${filename}. Restore the committed file; never edit an applied migration.`);
    }
  }
}

async function withMigrationLock(client, action) {
  await client.query('SELECT pg_advisory_lock($1::bigint)', [migrationLockId]);
  try {
    return await action();
  } finally {
    await client.query('SELECT pg_advisory_unlock($1::bigint)', [migrationLockId]);
  }
}

async function migrate(client) {
  await withMigrationLock(client, async () => {
    await ensureMigrationTable(client);
    const files = await listMigrations();
    const applied = await appliedMigrations(client);
    await verifyChecksums(files, applied);
    let count = 0;

    for (const filename of files) {
      if (applied.has(filename)) continue;
      const contents = await fs.readFile(path.join(migrationsDirectory, filename));
      const digest = checksum(contents);
      await client.query('BEGIN');
      try {
        const sql = contents.toString('utf8');
        if (sql.trim()) await client.query(sql);
        await client.query(
          'INSERT INTO public.schema_migrations (filename, checksum) VALUES ($1, $2)',
          [filename, digest],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${filename} failed: ${error.message}`);
      }
      console.log(`Applied ${filename} (sha256 ${digest})`);
      count += 1;
    }
    if (count === 0) console.log('No pending migrations.');
  });
}

async function status(client) {
  const files = await listMigrations();
  const applied = await appliedMigrations(client);
  await verifyChecksums(files, applied);
  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }
  for (const filename of files) {
    console.log(`${applied.has(filename) ? 'APPLIED' : 'PENDING'} ${filename}`);
  }
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function reset() {
  const host = required('DB_HOST').toLowerCase();
  const database = required('DB_NAME');
  if (process.env.DB_ENV !== 'development') {
    throw new Error('Reset refused: set DB_ENV=development in .env to enable the dev-only reset.');
  }
  if (!/(?:_dev|_development)$/.test(database)) {
    throw new Error('Reset refused: DB_NAME must end in _dev or _development.');
  }
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
  const allowedHosts = new Set(
    (process.env.DB_ALLOWED_DEV_HOSTS || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean),
  );
  if (!localHosts.has(host) && !allowedHosts.has(host)) {
    throw new Error(`Reset refused: host ${host} is not localhost or listed in DB_ALLOWED_DEV_HOSTS.`);
  }

  const confirmation = `RESET ${database}`;
  const prompt = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await prompt.question(`This permanently drops and recreates ${database} on ${host}. Type "${confirmation}" to continue: `);
    if (answer !== confirmation) {
      console.log('Reset cancelled.');
      return;
    }
  } finally {
    prompt.close();
  }

  const adminUser = required('DB_ADMIN_USER');
  const adminPassword = required('DB_ADMIN_PASSWORD');
  const adminConfig = databaseConfig({ database: 'postgres', user: adminUser, password: adminPassword });
  const client = await connect(adminConfig);
  try {
    await client.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [database],
    );
    await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(database)}`);
    await client.query(`CREATE DATABASE ${quoteIdentifier(database)} OWNER ${quoteIdentifier(adminUser)}`);
    await client.query(
      `GRANT CONNECT, TEMPORARY ON DATABASE ${quoteIdentifier(database)} TO ${quoteIdentifier(required('DB_USER'))}`,
    );
    console.log(`Recreated development database ${database}.`);
  } finally {
    await client.end();
  }

  const targetClient = await connect(databaseConfig({ user: adminUser, password: adminPassword }));
  try {
    await targetClient.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${quoteIdentifier(required('DB_USER'))}`);
  } finally {
    await targetClient.end();
  }
}

async function main() {
  const command = process.argv[2];
  if (!['migrate', 'status', 'reset'].includes(command)) {
    throw new Error('Usage: npm run db:migrate | db:status | db:reset');
  }
  if (command === 'reset') {
    await reset();
    return;
  }

  const client = await connect();
  try {
    if (command === 'migrate') await migrate(client);
    else await status(client);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Database command failed: ${error.message}`);
  process.exitCode = 1;
});