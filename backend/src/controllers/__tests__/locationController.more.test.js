/* eslint-disable global-require */
describe('locationController – extra branches', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('updateLocation success path – name field', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        if (/UPDATE locations/.test(sql)) return { rows: [{ id: 1, name: 'New' }] };
        return { rows: [] };
      },
    }));
    const { updateLocation } = require('../locationController');
    const req = { params: { id: '1' }, body: { name: 'New' } };
    const res = makeRes(); const next = jest.fn();
    await updateLocation(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
  });

  test('updateLocation 404 when update returns empty', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [] }),
    }));
    const { updateLocation } = require('../locationController');
    const req = { params: { id: '99' }, body: { name: 'X' } };
    const res = makeRes(); const next = jest.fn();
    await updateLocation(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('updateLocation coerces is_active string values correctly', async () => {
    const queries = [];
    jest.doMock('../../config/database', () => ({
      query: async (sql, params) => { queries.push(params); return { rows: [{ id: 2 }] }; },
    }));
    const { updateLocation } = require('../locationController');
    const next = jest.fn();

    // 'true' -> true
    await updateLocation({ params: { id: '2' }, body: { is_active: 'true' } }, makeRes(), next);
    expect(queries[queries.length - 1]).toContain(true);

    // 'false' -> false
    await updateLocation({ params: { id: '2' }, body: { is_active: 'false' } }, makeRes(), next);
    expect(queries[queries.length - 1]).toContain(false);

    // '1' -> true
    await updateLocation({ params: { id: '2' }, body: { is_active: '1' } }, makeRes(), next);
    expect(queries[queries.length - 1]).toContain(true);

    // '0' -> false
    await updateLocation({ params: { id: '2' }, body: { is_active: '0' } }, makeRes(), next);
    expect(queries[queries.length - 1]).toContain(false);

    // 'on' -> true
    await updateLocation({ params: { id: '2' }, body: { is_active: 'on' } }, makeRes(), next);
    expect(queries[queries.length - 1]).toContain(true);

    // 'off' -> false
    await updateLocation({ params: { id: '2' }, body: { is_active: 'off' } }, makeRes(), next);
    expect(queries[queries.length - 1]).toContain(false);
  });

  test('updateLocation skips invalid is_active string (returns 400 if only that field)', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { updateLocation } = require('../locationController');
    const req = { params: { id: '3' }, body: { is_active: 'maybe' } };
    const res = makeRes(); const next = jest.fn();
    await updateLocation(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateLocation normalises empty optional strings to NULL', async () => {
    const queries = [];
    jest.doMock('../../config/database', () => ({
      query: async (sql, params) => { queries.push(params); return { rows: [{ id: 4 }] }; },
    }));
    const { updateLocation } = require('../locationController');
    const req = { params: { id: '4' }, body: { phone: '', type: '', map_url: '' } };
    const res = makeRes(); const next = jest.fn();
    await updateLocation(req, res, next);
    expect(queries[0]).toContain(null); // all three -> null
  });

  test('updateLocation skips empty/NaN sort_order', async () => {
    const queries = [];
    jest.doMock('../../config/database', () => ({
      query: async (sql, params) => { queries.push(params); return { rows: [{ id: 5 }] }; },
    }));
    const { updateLocation } = require('../locationController');

    // empty string sort_order with another valid field
    await updateLocation({ params: { id: '5' }, body: { name: 'X', sort_order: '' } }, makeRes(), jest.fn());
    // sort_order should not be in params
    expect(queries[0]).not.toContain('');

    // numeric sort_order included
    await updateLocation({ params: { id: '5' }, body: { sort_order: '5' } }, makeRes(), jest.fn());
    expect(queries[1]).toContain(5);
  });

  test('deleteLocation success when found', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 10 }] }),
    }));
    const { deleteLocation } = require('../locationController');
    const req = { params: { id: '10' } };
    const res = makeRes(); const next = jest.fn();
    await deleteLocation(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
