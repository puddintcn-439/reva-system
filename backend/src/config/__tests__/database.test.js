describe('database module', () => {
  afterEach(() => {
    // Clean up env vars after each test
    delete process.env.DATABASE_URL;
    delete process.env.PGHOST;
  });

  test('exports query, getClient and pool (default path)', () => {
    jest.resetModules();
    const db = require('../database');
    expect(db).toBeDefined();
    expect(typeof db.query).toBe('function');
    expect(typeof db.getClient).toBe('function');
    expect(db.pool).toBeDefined();
  });

  test('uses DATABASE_URL when set', () => {
    jest.resetModules();
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    const db = require('../database');
    expect(db.pool).toBeDefined();
    expect(typeof db.query).toBe('function');
    expect(typeof db.getClient).toBe('function');
  });

  test('uses PGHOST env vars when set (without DATABASE_URL)', () => {
    jest.resetModules();
    delete process.env.DATABASE_URL;
    process.env.PGHOST = 'pg-host';
    process.env.PGPORT = '5433';
    process.env.PGDATABASE = 'mydb';
    process.env.PGUSER = 'myuser';
    process.env.PGPASSWORD = 'mypass';
    const db = require('../database');
    expect(db.pool).toBeDefined();
    delete process.env.PGPORT;
    delete process.env.PGDATABASE;
    delete process.env.PGUSER;
    delete process.env.PGPASSWORD;
  });
});
