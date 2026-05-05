/* eslint-disable global-require */
describe('consignorController – extra branches', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('getConsignors with search query', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '1' }] };
        return { rows: [{ id: 1, full_name: 'A' }] };
      },
    }));
    const { getConsignors } = require('../consignorController');
    const res = makeRes(); const next = jest.fn();
    await getConsignors({ query: { search: 'A' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('updateConsignor success', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 5, full_name: 'B' }] }),
    }));
    const { updateConsignor } = require('../consignorController');
    const req = { params: { id: '5' }, body: { full_name: 'B', phone: '', email: '', address: '', notes: '', bank_id: null, bank_account_no: null, bank_account_name: null } };
    const res = makeRes(); const next = jest.fn();
    await updateConsignor(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
  });

  test('updateConsignor 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [] }),
    }));
    const { updateConsignor } = require('../consignorController');
    const req = { params: { id: '99' }, body: { full_name: 'X', phone: '', email: '', address: '', notes: '' } };
    const res = makeRes(); const next = jest.fn();
    await updateConsignor(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getStats returns aggregate data', async () => {
    const statsRow = { active_count: '2', sold_count: '1', pending_count: '0', total_revenue: '500', total_commission: '50', total_payout_all: '450' };
    let call = 0;
    jest.doMock('../../config/database', () => ({
      query: async () => {
        call += 1;
        if (call === 1) return { rows: [statsRow] };
        if (call === 2) return { rows: [{ count: '3' }] };
        if (call === 3) return { rows: [{ pending_count: '1', pending_payout: '200' }] };
        return { rows: [{ pending: '0' }] };
      },
    }));
    const { getStats } = require('../consignorController');
    const res = makeRes(); const next = jest.fn();
    await getStats({}, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
  });

  test('getReports with period=day default', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [] }),
    }));
    const { getReports } = require('../consignorController');
    const res = makeRes(); const next = jest.fn();
    await getReports({ query: {} }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
    const data = res.json.mock.calls[0][0].data;
    expect(data.period).toBe('day');
    expect(data.months).toBe(3);
  });

  test('getReports with period=month and months clamping', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ period: new Date(), revenue: 100 }] }),
    }));
    const { getReports } = require('../consignorController');
    const res = makeRes(); const next = jest.fn();
    // months=-5 -> clamped up to 1, period=month
    await getReports({ query: { period: 'month', months: '-5' } }, res, next);
    const data = res.json.mock.calls[0][0].data;
    expect(data.period).toBe('month');
    expect(data.months).toBe(1);

    jest.resetModules();
    jest.doMock('../../config/database', () => ({ query: async () => ({ rows: [] }) }));
    const { getReports: getReports2 } = require('../consignorController');
    const res2 = makeRes();
    // months=100 -> clamp to 24
    await getReports2({ query: { months: '100' } }, res2, next);
    const data2 = res2.json.mock.calls[0][0].data;
    expect(data2.months).toBe(24);
  });
});
