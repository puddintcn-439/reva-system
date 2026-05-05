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

});
