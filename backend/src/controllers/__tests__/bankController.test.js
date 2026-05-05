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

  test('updateBank 404 and success, setActiveBank and deleteBank', async () => {
    // update missing
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    let { updateBank } = require('../bankController');
    let res = makeRes(); let next = jest.fn();
    await updateBank({ params: { id: '9' }, body: { bank_id: 'VCB', bank_name: 'N', account_no: '1', account_name: 'A' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    // update success
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 9 }] }) }));
    ({ updateBank } = require('../bankController'));
    res = makeRes(); next = jest.fn();
    await updateBank({ params: { id: '9' }, body: { bank_id: 'vcb', bank_name: 'N', account_no: '1', account_name: 'A' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    // setActiveBank not found
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/SET is_active = FALSE/.test(sql)) return {};
      return { rows: [] };
    } }));
    const { setActiveBank } = require('../bankController');
    res = makeRes(); next = jest.fn();
    await setActiveBank({ params: { id: '10' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    // setActiveBank success
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async (sql) => {
      if (/SET is_active = FALSE/.test(sql)) return {};
      return { rows: [{ id: 10 }] };
    } }));
    const { setActiveBank: setActiveBankOk } = require('../bankController');
    res = makeRes(); next = jest.fn();
    await setActiveBankOk({ params: { id: '10' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));

    // deleteBank
    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async () => ({}) }));
    const { deleteBank } = require('../bankController');
    res = makeRes(); next = jest.fn();
    await deleteBank({ params: { id: '11' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

});
