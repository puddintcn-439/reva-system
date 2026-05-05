/* eslint-disable global-require */
describe('locationController – error propagation and missing paths', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  // ─── getLocations error propagation ──────────────────────────────────────
  test('getLocations propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { getLocations } = require('../locationController');
    const res = makeRes(); const next = jest.fn();
    await getLocations({ query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getAllLocations error propagation ────────────────────────────────────
  test('getAllLocations propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { getAllLocations } = require('../locationController');
    const res = makeRes(); const next = jest.fn();
    await getAllLocations({}, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── createLocation error propagation ────────────────────────────────────
  test('createLocation propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { createLocation } = require('../locationController');
    const res = makeRes(); const next = jest.fn();
    await createLocation({ body: { name: 'Test' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── updateLocation: is_active as non-string boolean (line 64) ───────────
  test('updateLocation accepts boolean is_active directly (non-string path)', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 1, name: 'Shop', is_active: true }] }),
    }));
    const { updateLocation } = require('../locationController');
    const res = makeRes(); const next = jest.fn();
    // Pass is_active as a real boolean (not a string) — hits the else branch (line 64)
    await updateLocation({ params: { id: '1' }, body: { is_active: true } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('updateLocation accepts numeric 1 as is_active (truthy non-string)', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 1, name: 'Shop', is_active: true }] }),
    }));
    const { updateLocation } = require('../locationController');
    const res = makeRes(); const next = jest.fn();
    await updateLocation({ params: { id: '1' }, body: { is_active: 1 } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // ─── updateLocation error propagation ────────────────────────────────────
  test('updateLocation propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { updateLocation } = require('../locationController');
    const res = makeRes(); const next = jest.fn();
    await updateLocation({ params: { id: '1' }, body: { name: 'Updated' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── deleteLocation error propagation ────────────────────────────────────
  test('deleteLocation propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { deleteLocation } = require('../locationController');
    const res = makeRes(); const next = jest.fn();
    await deleteLocation({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
