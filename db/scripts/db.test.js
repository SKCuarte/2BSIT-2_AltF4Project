const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { test } = require('node:test');
const { assertMigrationSafety } = require('./db');
const { assertDevOnly, authApi } = require('./lib/accounts');

const development = { DB_ENV: 'development', DB_NAME: 'hope_dev', DB_HOST: 'localhost' };
const hosted = {
  DB_ENV: 'development',
  DB_HOST: 'aws-0-test.pooler.supabase.com',
  DB_NAME: 'postgres',
  DB_USER: 'postgres.testdev',
  DB_SSL: 'true',
  DB_ALLOWED_DEV_HOSTS: 'aws-0-test.pooler.supabase.com',
  DB_CONFIRM_DEV_PROJECT: 'aws-0-test.pooler.supabase.com/postgres/postgres.testdev',
};

test('migration safety rejects invalid environments, names, and hosts', () => {
  for (const [changes, message] of [
    [{ DB_ENV: '' }, /DB_ENV=development/],
    [{ DB_ENV: 'production' }, /DB_ENV=development/],
    [{ DB_NAME: '' }, /DB_NAME/],
    [{ DB_NAME: 'hope' }, /DB_NAME/],
    [{ DB_NAME: 'postgres' }, /DB_NAME/],
    [{ DB_NAME: 'hope_dev_backup' }, /DB_NAME/],
    [{ DB_HOST: '' }, /DB_HOST/],
    [{ DB_HOST: 'production.example.invalid' }, /DB_ALLOWED_DEV_HOSTS/],
  ]) {
    assert.throws(() => assertMigrationSafety({ ...development, ...changes }), message);
  }
});

test('migration safety accepts local development and approved Supabase DEV targets', () => {
  for (const env of [
    development,
    { ...development, DB_NAME: 'hope_development', DB_HOST: '127.0.0.1' },
    hosted,
    {
      ...hosted, DB_HOST: 'db.testdev.supabase.co', DB_USER: 'postgres',
      DB_ALLOWED_DEV_HOSTS: ' DB.testdev.supabase.co ',
      DB_CONFIRM_DEV_PROJECT: 'db.testdev.supabase.co/postgres/postgres',
    },
    {
      ...hosted, DB_NAME: 'hope_dev',
      DB_CONFIRM_DEV_PROJECT: 'aws-0-test.pooler.supabase.com/hope_dev/postgres.testdev',
    },
    {
      ...hosted, DB_HOST: 'dev.example.invalid', DB_NAME: 'hope_dev', DB_USER: 'hope',
      DB_ALLOWED_DEV_HOSTS: 'dev.example.invalid',
      DB_CONFIRM_DEV_PROJECT: 'dev.example.invalid/hope_dev/hope',
    },
  ]) {
    assert.doesNotThrow(() => assertMigrationSafety(env));
  }
});

test('remote targets require exact allowlisting, SSL, and matching project confirmation', () => {
  for (const [changes, message] of [
    [{ DB_ALLOWED_DEV_HOSTS: '' }, /DB_ALLOWED_DEV_HOSTS/],
    [{ DB_ALLOWED_DEV_HOSTS: '*.pooler.supabase.com' }, /DB_ALLOWED_DEV_HOSTS/],
    [{ DB_SSL: '' }, /DB_SSL=true/],
    [{ DB_SSL: 'false' }, /DB_SSL=true/],
    [{ DB_USER: 'postgres', DB_CONFIRM_DEV_PROJECT: 'aws-0-test.pooler.supabase.com/postgres/postgres' }, /project reference/],
    [{ DB_PORT: '6543' }, /advisory lock/],
    [{ DB_CONFIRM_DEV_PROJECT: '' }, /DB_CONFIRM_DEV_PROJECT/],
    [{ DB_CONFIRM_DEV_PROJECT: 'aws-0-test.pooler.supabase.com/postgres/postgres.other' }, /DB_CONFIRM_DEV_PROJECT/],
    [{ DB_USER: 'postgres.other' }, /DB_CONFIRM_DEV_PROJECT/],
    [{ DB_NAME: 'production' }, /DB_NAME/],
    [{ DB_HOST: 'dev.example.invalid' }, /DB_NAME/],
    [{ DB_ENV: 'production' }, /DB_ENV=development/],
  ]) {
    assert.throws(() => assertMigrationSafety({ ...hosted, ...changes }), message);
  }
  assert.throws(() => assertMigrationSafety({
    ...hosted, DB_HOST: 'db.testdev.supabase.co', DB_USER: 'postgres',
    DB_ALLOWED_DEV_HOSTS: 'db.testdev.supabase.co', DB_PORT: '6543',
    DB_CONFIRM_DEV_PROJECT: 'db.testdev.supabase.co/postgres/postgres',
  }), /advisory lock/);
});

test('migrate rejects unsafe configuration before connecting', () => {
  for (const [target, changes] of [
    [development, { DB_ENV: 'production' }],
    [development, { DB_NAME: '' }],
    [development, { DB_HOST: 'production.example.invalid' }],
    [hosted, { DB_ALLOWED_DEV_HOSTS: '' }],
    [hosted, { DB_SSL: 'false' }],
    [hosted, { DB_CONFIRM_DEV_PROJECT: '' }],
  ]) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'db.js'), 'migrate'], {
      encoding: 'utf8',
      env: {
        ...process.env, DB_ALLOWED_DEV_HOSTS: '', DB_CONFIRM_DEV_PROJECT: '',
        DB_USER: '', DB_PASSWORD: '', ...target, ...changes,
      },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Migration refused:/);
    assert.doesNotMatch(result.stderr, /Missing DB_USER|Missing DB_PASSWORD|ECONNREFUSED/);
  }
});

test('DEV seed guard checks the effective connection target', () => {
  const keys = ['DB_ENV', 'DB_HOST', 'DB_ALLOWED_DEV_HOSTS', 'DB_CONFIRM_DEV_PROJECT', 'DATABASE_URL'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const [settings, allowed] of [
      [{ DB_HOST: 'localhost', DATABASE_URL: '' }, true],
      [{ DB_HOST: 'localhost', DATABASE_URL: 'postgres://test:test@production.example.invalid/postgres' }, false],
      [{ DB_HOST: 'localhost', DATABASE_URL: 'postgres://test:test@localhost/postgres?host=production.example.invalid' }, false],
      [{ DB_HOST: 'localhost', DATABASE_URL: 'postgres://test:test@localhost/postgres?host=localhost&host=production.example.invalid' }, false],
      [{ DB_HOST: 'production.example.invalid', DATABASE_URL: 'postgres://test:test@localhost/hope_dev' }, true],
      [{ DB_HOST: 'localhost', DATABASE_URL: 'postgres://test:test@dev.example.invalid/postgres', DB_ALLOWED_DEV_HOSTS: 'DEV.example.invalid' }, false],
      [{ DB_HOST: 'localhost', DATABASE_URL: 'postgres://test:test@dev.example.invalid/postgres', DB_ALLOWED_DEV_HOSTS: 'DEV.example.invalid', DB_CONFIRM_DEV_PROJECT: 'dev.example.invalid/postgres/test' }, true],
      [{ DB_HOST: 'localhost', DATABASE_URL: 'postgres://test:test@dev.example.invalid/postgres', DB_ALLOWED_DEV_HOSTS: '*.example.invalid' }, false],
      [{ DB_HOST: 'localhost', DATABASE_URL: 'postgres://postgres.testdev:test@aws-0-test.pooler.supabase.com/postgres?user=postgres.testprod', DB_ALLOWED_DEV_HOSTS: 'aws-0-test.pooler.supabase.com', DB_CONFIRM_DEV_PROJECT: 'aws-0-test.pooler.supabase.com/postgres/postgres.testdev' }, false],
      [{ DB_HOST: 'localhost', DATABASE_URL: 'postgres://postgres.testdev:test@aws-0-test.pooler.supabase.com/postgres', DB_ALLOWED_DEV_HOSTS: 'aws-0-test.pooler.supabase.com', DB_CONFIRM_DEV_PROJECT: 'aws-0-test.pooler.supabase.com/postgres/postgres.testdev' }, true],
    ]) {
      process.env.DB_ENV = 'development';
      process.env.DB_HOST = settings.DB_HOST;
      process.env.DB_ALLOWED_DEV_HOSTS = settings.DB_ALLOWED_DEV_HOSTS || '';
      process.env.DB_CONFIRM_DEV_PROJECT = settings.DB_CONFIRM_DEV_PROJECT || '';
      process.env.DATABASE_URL = settings.DATABASE_URL;
      if (allowed) {
        assert.doesNotThrow(() => assertDevOnly('Dev user seed'));
      } else {
        assert.throws(() => assertDevOnly('Dev user seed'), /database connection host|DB_CONFIRM_DEV_PROJECT/);
      }
    }
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('Auth API credentials require HTTPS and certificate verification for remote hosts', () => {
  const keys = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NODE_TLS_REJECT_UNAUTHORIZED'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.SUPABASE_SECRET_KEY = 'test-key';
    for (const [url, tls, allowed, message] of [
      ['https://testdev.supabase.co', '1', true],
      ['http://127.0.0.1:54321', '1', true],
      ['ftp://localhost', '1', false, /must use HTTP or HTTPS/],
      ['http://testdev.supabase.co', '1', false, /require HTTPS/],
      ['https://testdev.supabase.co', '0', false, /require certificate verification/],
    ]) {
      process.env.SUPABASE_URL = url;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = tls;
      if (allowed) assert.equal(authApi().base, url);
      else assert.throws(() => authApi(), message);
    }
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('selected Supabase project checks the effective connection identity before connecting', () => {
  const accountsPath = path.join(__dirname, 'lib', 'accounts.js');
  const pgPath = path.join(__dirname, '..', '..', 'node_modules', 'pg');
  const envFile = path.join(__dirname, '__nonexistent_test_env__', '.env');
  const noHostnameCheck = new URL('postgres://postgres:test@db.testdev.supabase.co/postgres');
  noHostnameCheck.searchParams.set('sslmode', 'verify-ca');
  noHostnameCheck.searchParams.set('uselibpqcompat', 'true');
  noHostnameCheck.searchParams.set('sslrootcert', path.join(__dirname, '..', '..', 'package.json'));
  const script = `
    const { Client } = require(${JSON.stringify(pgPath)});
    Client.prototype.connect = async () => { console.log('mock-connected'); };
    process.argv = [process.execPath, 'test', '--env-file', ${JSON.stringify(envFile)}];
    require(${JSON.stringify(accountsPath)}).connect().catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  `;
  for (const [url, allowed, errorMessage, insecureTlsEnv] of [
    ['postgres://postgres:test@db.testdev.supabase.co/postgres', true],
    ['postgres://postgres:test@db.testdev.supabase.co/postgres?host=db.testprod.supabase.co', false, /Database connection and SUPABASE_URL must point to the same Supabase project/],
    ['postgres://postgres.testdev:test@aws-0-test.pooler.supabase.com/postgres', true],
    ['postgres://postgres.testdev:test@aws-0-test.pooler.supabase.com/postgres?user=postgres.testprod', false, /Database connection and SUPABASE_URL must point to the same Supabase project/],
    ['postgres://postgres.testdev:test@other.example.invalid/postgres', false, /Database connection and SUPABASE_URL must point to the same Supabase project/],
    ['postgres://postgres:test@db.testdev.supabase.co/postgres?sslmode=disable', false, /certificate-verified TLS/],
    ['postgres://postgres:test@db.testdev.supabase.co/postgres?sslmode=no-verify', false, /certificate-verified TLS/],
    ['postgres://postgres:test@db.testdev.supabase.co/postgres?sslmode=prefer&uselibpqcompat=true', false, /certificate-verified TLS/],
    [noHostnameCheck.toString(), false, /certificate-verified TLS/],
    ['postgres://postgres:test@db.testdev.supabase.co/postgres?sslmode=require', true],
    ['postgres://postgres:test@db.testdev.supabase.co/postgres?ssl=true', true],
    ['postgres://postgres:test@db.testdev.supabase.co/postgres?ssl=true', false, /certificate-verified TLS/, true],
  ]) {
    const result = spawnSync(process.execPath, ['-e', script], {
      encoding: 'utf8',
      env: {
        ...process.env,
        SUPABASE_URL: 'https://testdev.supabase.co',
        SUPABASE_SECRET_KEY: insecureTlsEnv ? '' : 'test-key',
        DATABASE_URL: url,
        DATABASE_SSL_ROOT_CERT: '',
        NODE_TLS_REJECT_UNAUTHORIZED: insecureTlsEnv ? '0' : '1',
      },
    });
    assert.equal(result.status, allowed ? 0 : 1);
    if (allowed) {
      assert.match(result.stdout, /mock-connected/);
    } else {
      assert.match(result.stderr, errorMessage);
      assert.doesNotMatch(result.stdout, /mock-connected/);
    }
  }
});

test('configured Auth API and effective database target must identify the same project', () => {
  const accountsPath = path.join(__dirname, 'lib', 'accounts.js');
  const pgPath = path.join(__dirname, '..', '..', 'node_modules', 'pg');
  const envFile = path.join(__dirname, '__nonexistent_test_env__', '.env');
  const script = `
    const { Client } = require(${JSON.stringify(pgPath)});
    Client.prototype.connect = async () => { console.log('mock-connected'); };
    process.argv = [process.execPath, 'test'];
    if (process.env.TEST_SELECTED_ENV === 'true') process.argv.push('--env-file', ${JSON.stringify(envFile)});
    require(${JSON.stringify(accountsPath)}).connect().catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  `;
  for (const [settings, allowed, errorMessage] of [
    [{ DB_HOST: 'db.testdev.supabase.co', DB_USER: 'postgres' }, true],
    [{ DB_HOST: 'aws-0-test.pooler.supabase.com', DB_USER: 'postgres.testdev' }, true],
    [{ DB_HOST: 'db.testprod.supabase.co', DB_USER: 'postgres' }, false],
    [{ DB_HOST: 'aws-0-test.pooler.supabase.com', DB_USER: 'postgres.testprod' }, false],
    [{ DB_HOST: 'localhost', DB_USER: 'postgres' }, false],
    [{ DB_HOST: 'localhost', DB_USER: 'postgres', SUPABASE_URL: 'http://127.0.0.1:54321' }, true],
    [{ DB_HOST: 'db.testprod.supabase.co', DB_USER: 'postgres', TEST_SELECTED_ENV: 'true' }, false],
    [{ DATABASE_URL: 'postgres://postgres:test@db.testprod.supabase.co/postgres' }, false],
    [{ DB_HOST: 'db.testdev.supabase.co', SUPABASE_URL: 'http://testdev.supabase.co' }, false, /Remote Supabase Auth API connections require HTTPS/],
    [{ DB_HOST: 'localhost', DB_USER: 'postgres', SUPABASE_URL: '', SUPABASE_SECRET_KEY: '' }, true],
  ]) {
    const result = spawnSync(process.execPath, ['-e', script], {
      encoding: 'utf8',
      env: {
        ...process.env,
        DATABASE_URL: '',
        DATABASE_SSL_ROOT_CERT: '',
        DB_HOST: 'localhost',
        DB_NAME: 'postgres',
        DB_USER: 'postgres',
        DB_PASSWORD: 'test',
        DB_SSL: '',
        SUPABASE_URL: 'https://testdev.supabase.co',
        SUPABASE_SECRET_KEY: 'test-key',
        TEST_SELECTED_ENV: '',
        NODE_TLS_REJECT_UNAUTHORIZED: '1',
        ...settings,
      },
    });
    assert.equal(result.status, allowed ? 0 : 1);
    if (allowed) {
      assert.match(result.stdout, /mock-connected/);
    } else {
      assert.match(result.stderr, errorMessage || /Database connection and SUPABASE_URL must point to the same Supabase project/);
      assert.doesNotMatch(result.stdout, /mock-connected/);
    }
  }
});
