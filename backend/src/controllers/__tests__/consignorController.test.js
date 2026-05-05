/* eslint-disable global-require */
describe('consignorController', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getConsignors returns pagination', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '2' }] };
      return { rows: [{ id: 1 }] };
    } }));
    const { getConsignors } = require('../consignorController');
    const res = makeRes(); const next = jest.fn();
    await getConsignors({ query: {} }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, pagination: expect.any(Object) }));
  });

  test('getConsignor returns 404 and success path', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => ({ rows: [] }) }));
    const { getConsignor } = require('../consignorController');
    const res = makeRes(); const next = jest.fn();
    await getConsignor({ params: { id: 99 } }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async (sql) => ({ rows: [{ id: 1 }] }) }));
    const { getConsignor: getCons } = require('../consignorController');
    const res2 = makeRes();
    await getCons({ params: { id: 1 } }, res2, next);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

});
