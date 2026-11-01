const fs = require('node:fs/promises');
const path = require('node:path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const root = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(root, '.env') });
const seedsDirectory = path.join(root, 'db', 'seeds');

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and set the database connection values.`);
  return value;
}

function compareNames(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function main() {
  const client = new Client({
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT || 5432),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  try {
    const version = await client.query('SHOW server_version_num');
    if (Number(version.rows[0].server_version_num) < 150000) {
      throw new Error('PostgreSQL 15 or newer is required.');
    }

    const entries = await fs.readdir(seedsDirectory, { withFileTypes: true });
    const invalidFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.sql') && !/^\d{3,}_[a-z0-9_]+\.sql$/.test(entry.name))
      .map((entry) => entry.name);
    if (invalidFiles.length) {
      throw new Error(`Seed filenames must match NNN_description.sql: ${invalidFiles.join(', ')}`);
    }
    const files = entries
      .filter((entry) => entry.isFile() && /^\d{3,}_[a-z0-9_]+\.sql$/.test(entry.name))
      .map((entry) => entry.name)
      .sort(compareNames);

    if (files.length === 0) {
      console.log('No seed files found.');
      return;
    }
    for (const filename of files) {
      const sql = await fs.readFile(path.join(seedsDirectory, filename), 'utf8');
      await client.query('BEGIN');
      try {
        if (sql.trim()) await client.query(sql);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Seed ${filename} failed: ${error.message}`);
      }
      console.log(`Ran ${filename}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Seed command failed: ${error.message}`);
  process.exitCode = 1;
});