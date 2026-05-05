/* eslint-disable global-require */
describe('announcementController - extra', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getAllAnnouncements returns rows', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1, content: 'a' }] }) }));
    const { getAllAnnouncements } = require('../announcementController');
    const res = makeRes(); const next = jest.fn();
    await getAllAnnouncements({}, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('updateAnnouncement success', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 5, content: 'X' }] }) }));
    const { updateAnnouncement } = require('../announcementController');
    const res = makeRes(); const next = jest.fn();
    await updateAnnouncement({ params: { id: '5' }, body: { content: 'X', is_active: true, sort_order: 1 } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // Error propagation – catch blocks
  test('getAnnouncements propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db fail'); } }));
    const { getAnnouncements } = require('../announcementController');
    const next = jest.fn();
    await getAnnouncements({}, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('getAllAnnouncements propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db fail'); } }));
    const { getAllAnnouncements } = require('../announcementController');
    const next = jest.fn();
    await getAllAnnouncements({}, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('createAnnouncement propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db fail'); } }));
    const { createAnnouncement } = require('../announcementController');
    const next = jest.fn();
    await createAnnouncement({ body: { content: 'x' } }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('updateAnnouncement propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db fail'); } }));
    const { updateAnnouncement } = require('../announcementController');
    const next = jest.fn();
    await updateAnnouncement({ params: { id: '1' }, body: {} }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('deleteAnnouncement propagates db error', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => { throw new Error('db fail'); } }));
    const { deleteAnnouncement } = require('../announcementController');
    const next = jest.fn();
    await deleteAnnouncement({ params: { id: '1' } }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
