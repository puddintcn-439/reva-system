/* eslint-disable global-require */
describe('locationController', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getLocations/getAllLocations', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1 }] }) }));
    const { getLocations, getAllLocations } = require('../locationController');
    const res = makeRes(); const next = jest.fn();
    await getLocations({}, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    await getAllLocations({}, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('create/update/delete flows', async () => {
    const query = jest.fn().mockImplementation(async (sql) => {
      if (/INSERT INTO locations/.test(sql)) return { rows: [{ id: 10 }] };
      if (/UPDATE locations SET/.test(sql)) return { rows: [] };
      if (/DELETE FROM locations/.test(sql)) return { rows: [] };
      return { rows: [] };
    });
    jest.doMock('../../config/database', () => ({ query }));
    const { createLocation, updateLocation, deleteLocation } = require('../locationController');
    const res = makeRes(); const next = jest.fn();

    await createLocation({ body: { name: 'X' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(201);

    await updateLocation({ params: { id: 1 }, body: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    await deleteLocation({ params: { id: 1 } }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

});
