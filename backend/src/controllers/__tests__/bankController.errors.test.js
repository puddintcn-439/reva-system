/* eslint-disable global-require */
describe('bankController – error propagation', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
  const throwDb = () => ({ query: async () => { throw new Error('db fail'); } });

  test('getBanks propagates db error', async () => {
    jest.doMock('../../config/database', throwDb);
    const { getBanks } = require('../bankController');
    const next = jest.fn();
    await getBanks({}, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('getActiveBank propagates db error', async () => {
    jest.doMock('../../config/database', throwDb);
    const { getActiveBank } = require('../bankController');
    const next = jest.fn();
    await getActiveBank({}, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('createBank propagates db error', async () => {
    jest.doMock('../../config/database', throwDb);
    const { createBank } = require('../bankController');
    const next = jest.fn();
    await createBank({ body: { bank_id: 'VCB', bank_name: 'N', account_no: '1', account_name: 'A' } }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('updateBank propagates db error', async () => {
    jest.doMock('../../config/database', throwDb);
    const { updateBank } = require('../bankController');
    const next = jest.fn();
    await updateBank({ params: { id: '1' }, body: { bank_id: 'VCB', bank_name: 'N', account_no: '1', account_name: 'A' } }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('setActiveBank propagates db error', async () => {
    jest.doMock('../../config/database', throwDb);
    const { setActiveBank } = require('../bankController');
    const next = jest.fn();
    await setActiveBank({ params: { id: '1' } }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('deleteBank propagates db error', async () => {
    jest.doMock('../../config/database', throwDb);
    const { deleteBank } = require('../bankController');
    const next = jest.fn();
    await deleteBank({ params: { id: '1' } }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
