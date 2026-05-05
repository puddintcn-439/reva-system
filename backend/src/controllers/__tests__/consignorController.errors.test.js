/* eslint-disable global-require */
describe('consignorController – error propagation', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getConsignors propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    const { getConsignors } = require('../consignorController');
    const res = makeRes(); const next = jest.fn();
    await getConsignors({ query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('getConsignor propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    const { getConsignor } = require('../consignorController');
    const res = makeRes(); const next = jest.fn();
    await getConsignor({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('updateConsignor propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    const { updateConsignor } = require('../consignorController');
    const res = makeRes(); const next = jest.fn();
    await updateConsignor({ params: { id: '1' }, body: { full_name: 'B' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('getStats propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    const { getStats } = require('../consignorController');
    const res = makeRes(); const next = jest.fn();
    await getStats({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('getReports propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db'); } }));
    const { getReports } = require('../consignorController');
    const res = makeRes(); const next = jest.fn();
    await getReports({ params: { id: '1' }, query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
