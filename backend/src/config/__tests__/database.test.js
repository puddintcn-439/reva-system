describe('database module', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('exports query, getClient and pool', () => {
    const db = require('../database');
    expect(db).toBeDefined();
    expect(typeof db.query).toBe('function');
    expect(typeof db.getClient).toBe('function');
    expect(db.pool).toBeDefined();
  });
});
