/* eslint-disable global-require */
describe('announcementController', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getAnnouncements returns rows', async () => {
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [{ id: 1 }] }) }));
    const { getAnnouncements } = require('../announcementController');
    const req = {}; const res = makeRes(); const next = jest.fn();
    await getAnnouncements(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
  });

  test('create/update/delete flows', async () => {
    const query = jest.fn().mockImplementation(async (sql, params) => {
      if (/INSERT INTO announcements/.test(sql)) return { rows: [{ id: 2 }] };
      if (/UPDATE announcements/.test(sql)) return { rows: [] };
      return { rows: [] };
    });
    jest.doMock('../../config/database', () => ({ query }));
    const { createAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../announcementController');
    const res = makeRes(); const next = jest.fn();

    await createAnnouncement({ body: { content: 'x' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(201);

    await updateAnnouncement({ params: { id: 1 }, body: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    await deleteAnnouncement({ params: { id: 1 } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

});
