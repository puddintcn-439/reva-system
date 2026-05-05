/* eslint-disable global-require */
describe('bankController', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getBanks and getActiveBank', async () => {
    jest.doMock('../../config/database', () => ({ query: async (sql) => ({ rows: [{ id: 1 }] }) }));
    const { getBanks, getActiveBank } = require('../bankController');
    const res = makeRes(); const next = jest.fn();
    await getBanks({}, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    await getActiveBank({}, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('createBank validation and success', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1 }] }) }));
    const { createBank } = require('../bankController');
    const res = makeRes(); const next = jest.fn();
    await createBank({ body: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    await createBank({ body: { bank_id: 'VCB', bank_name: 'Vietcom', account_no: '123', account_name: 'A' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

});
