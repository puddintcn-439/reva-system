/* eslint-disable global-require */
describe('productController – extra branch coverage', () => {
  beforeEach(() => { jest.resetModules(); });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  // Line 198: optional field (e.g. description) empty string → treated as null
  test('updateProduct converts empty optional field to null', async () => {
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }],
    }));
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 1, name: 'P' }] }),
    }));
    const { updateProduct } = require('../productController');
    // description is optional — empty string should become NULL (not reject)
    const req = { params: { id: '1' }, body: { description: '' } };
    const res = makeRes(); const next = jest.fn();
    await updateProduct(req, res, next);
    // Should succeed and return the row
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // Line 205: valid condition_percent → val = n (numeric conversion path)
  test('updateProduct accepts valid condition_percent number', async () => {
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }],
    }));
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 2, condition_percent: 85 }] }),
    }));
    const { updateProduct } = require('../productController');
    const req = { params: { id: '2' }, body: { condition_percent: '85' } };
    const res = makeRes(); const next = jest.fn();
    await updateProduct(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
