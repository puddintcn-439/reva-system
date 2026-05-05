/* eslint-disable global-require */
describe('posController – lookupCustomer, getCustomers, getCustomer, sales filters, calcCommission', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../../config/systemSettings', () => ({
      getJwtSecret: async () => 'secret',
      getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }],
    }));
  });
  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  // ─── calcCommission ──────────────────────────────────────────────────────────
  test('calcCommission – fixed type tier', () => {
    jest.doMock('../../config/database', () => ({ query: jest.fn(), getClient: jest.fn() }));
    const { calcCommission } = require('../posController');
    const result = calcCommission(100, [{ max: null, type: 'fixed', amount: 20 }]);
    expect(result.commission).toBe(20);
    expect(result.consignorAmount).toBe(80);
  });

  test('calcCommission – no tiers fallthrough returns 0 commission', () => {
    jest.doMock('../../config/database', () => ({ query: jest.fn(), getClient: jest.fn() }));
    const { calcCommission } = require('../posController');
    // Pass empty tiers so loop never matches
    const result = calcCommission(100, []);
    expect(result.commission).toBe(0);
    expect(result.consignorAmount).toBe(100);
  });

  test('calcCommission – price over max tier is skipped, null-max tier applies', () => {
    jest.doMock('../../config/database', () => ({ query: jest.fn(), getClient: jest.fn() }));
    const { calcCommission } = require('../posController');
    const tiers = [
      { max: 50, type: 'percent', amount: 5 },
      { max: null, type: 'fixed', amount: 30 },
    ];
    const result = calcCommission(200, tiers);
    expect(result.commission).toBe(30);
    expect(result.consignorAmount).toBe(170);
  });

  // ─── lookupCustomer ──────────────────────────────────────────────────────────
  test('lookupCustomer returns 400 for short phone', async () => {
    jest.doMock('../../config/database', () => ({ query: jest.fn() }));
    const { lookupCustomer } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await lookupCustomer({ query: { phone: '123' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('lookupCustomer returns customer data', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 1, customer_name: 'Alice', customer_phone: '0901234567' }] }),
    }));
    const { lookupCustomer } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await lookupCustomer({ query: { phone: '0901234567' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('lookupCustomer returns null when not found', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [] }),
    }));
    const { lookupCustomer } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await lookupCustomer({ query: { phone: '0901234567' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: null }));
  });

  // ─── getCustomers ────────────────────────────────────────────────────────────
  test('getCustomers returns paginated list without search', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '2' }] };
        return { rows: [{ id: 1 }, { id: 2 }] };
      },
    }));
    const { getCustomers } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await getCustomers({ query: {} }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, pagination: expect.any(Object) }));
  });

  test('getCustomers with search filter', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '1' }] };
        return { rows: [{ id: 3 }] };
      },
    }));
    const { getCustomers } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await getCustomers({ query: { search: 'Alice' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // ─── getCustomer ─────────────────────────────────────────────────────────────
  test('getCustomer returns 404 when not found', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [] }),
    }));
    const { getCustomer } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await getCustomer({ params: { id: '99' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getCustomer returns customer with sales history', async () => {
    let call = 0;
    jest.doMock('../../config/database', () => ({
      query: async () => {
        call += 1;
        if (call === 1) return { rows: [{ id: 5, name: 'Alice', purchase_count: 3 }] }; // customer row
        return { rows: [{ id: 10, invoice_code: 'HD001', final_amount: 200 }] }; // sales
      },
    }));
    const { getCustomer } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await getCustomer({ params: { id: '5' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const data = res.json.mock.calls[0][0].data;
    expect(data.sales).toBeDefined();
  });

  // ─── getSales with filters ────────────────────────────────────────────────────
  test('getSales with date/search/payment_method filters', async () => {
    jest.doMock('../../config/database', () => ({
      query: async (sql) => {
        if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '1' }] };
        return { rows: [{ id: 1, invoice_code: 'HD001' }] };
      },
    }));
    const { getSales } = require('../posController');
    const req = { query: { date: '2024-01-01', payment_method: 'cash', search: 'HD', date_from: '2024-01-01', date_to: '2024-01-31' } };
    const res = makeRes(); const next = jest.fn();
    await getSales(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // ─── markSalePaid already-paid path ──────────────────────────────────────────
  test('markSalePaid returns success when already paid', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 5, status: 'paid' }] }),
    }));
    const { markSalePaid } = require('../posController');
    const req = { params: { id: '5' }, body: {} };
    const res = makeRes(); const next = jest.fn();
    await markSalePaid(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('markSalePaid returns 400 for cancelled sale', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 6, status: 'cancelled' }] }),
    }));
    const { markSalePaid } = require('../posController');
    const req = { params: { id: '6' }, body: {} };
    const res = makeRes(); const next = jest.fn();
    await markSalePaid(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ─── cancelSale already-cancelled path ────────────────────────────────────────
  test('cancelSale returns 400 when already cancelled', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 3, status: 'cancelled', invoice_code: 'HD003' }] }) // SELECT sale
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { cancelSale } = require('../posController');
    const req = { params: { id: '3' }, body: {} };
    const res = makeRes(); const next = jest.fn();
    await cancelSale(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── lookupProduct non-active non-sold ────────────────────────────────────────
  test('lookupProduct returns 409 for expired product', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 1, name: 'P', status: 'expired' }] }),
    }));
    const { lookupProduct } = require('../posController');
    const req = { query: { code: 'SP-1' } };
    const res = makeRes(); const next = jest.fn();
    await lookupProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('lookupProduct returns 200 for active product', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 2, name: 'P', status: 'active' }] }),
    }));
    const { lookupProduct } = require('../posController');
    const req = { query: { code: 'SP-2' } };
    const res = makeRes(); const next = jest.fn();
    await lookupProduct(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // ─── createSale with customer phone ──────────────────────────────────────────
  test('createSale success with customer phone and products', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'P', status: 'active' }] }) // check products
        .mockResolvedValueOnce({ rows: [{ id: 9 }] }) // upsert customer
        .mockResolvedValueOnce({ rows: [] }) // invoice code dup check (no dup)
        .mockResolvedValueOnce({ rows: [{ id: 100, invoice_code: 'HD2401011234', total_amount: 100, final_amount: 100 }] }) // INSERT sales
        .mockResolvedValueOnce(undefined) // INSERT sale_item
        .mockResolvedValueOnce(undefined) // UPDATE products -> sold
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: async () => ({ rows: [{ id: 100, items: [{ id: 1 }] }] }),
    }));
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }],
    }));
    const { createSale } = require('../posController');
    const req = {
      body: {
        items: [{ product_id: 1, product_name: 'P', product_code: 'SP-1', sale_price: 100 }],
        customer_name: 'Alice',
        customer_phone: '0901234567',
        payment_method: 'cash',
      },
      user: { id: 1 },
    };
    const res = makeRes(); const next = jest.fn();
    await createSale(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── getReturns ──────────────────────────────────────────────────────────────
  test('getReturns returns list', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => ({ rows: [{ id: 1, refund_amount: 50, items: [{ id: 1 }] }] }),
    }));
    const { getReturns } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await getReturns({ params: { id: '1' } }, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
  });

  // ─── searchProducts error propagation ────────────────────────────────────────
  test('searchProducts propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { searchProducts } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await searchProducts({ query: { q: 'shirt' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── lookupProduct error propagation ─────────────────────────────────────────
  test('lookupProduct propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { lookupProduct } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await lookupProduct({ query: { code: 'SP-1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── createSale invalid item price (lines 189-190) ──────────────────────────
  test('createSale returns 400 for invalid item price', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'P', status: 'active' }] }) // check products
        .mockResolvedValueOnce({ rows: [] }) // invoice code check
        .mockResolvedValueOnce({ rows: [{ id: 10, invoice_code: 'HD001', total_amount: 0, final_amount: 0 }] }) // INSERT sales
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: jest.fn(),
    }));
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [{ max: null, type: 'percent', amount: 10 }],
    }));
    const { createSale } = require('../posController');
    const req = {
      body: {
        items: [{ product_id: 1, product_name: 'P', product_code: 'SP-1', sale_price: -5 }],
        payment_method: 'cash',
      },
      user: { id: 1 },
    };
    const res = makeRes(); const next = jest.fn();
    await createSale(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── createSale error propagation (catch → ROLLBACK + next) ─────────────────
  test('createSale propagates error via ROLLBACK and next(err)', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('db fail')), // products check throws
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: jest.fn(),
    }));
    jest.doMock('../../config/systemSettings', () => ({
      getCommissionTiers: async () => [],
    }));
    const { createSale } = require('../posController');
    const req = {
      body: {
        items: [{ product_id: 1, product_name: 'P', product_code: 'SP-1', sale_price: 100 }],
        payment_method: 'cash',
      },
      user: { id: 1 },
    };
    const res = makeRes(); const next = jest.fn();
    await createSale(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── getSales error propagation ───────────────────────────────────────────────
  test('getSales propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { getSales } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await getSales({ query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getSale error propagation ────────────────────────────────────────────────
  test('getSale propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { getSale } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await getSale({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── markSalePaid error propagation ───────────────────────────────────────────
  test('markSalePaid propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { markSalePaid } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await markSalePaid({ params: { id: '1' }, body: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── cancelSale not found (ROLLBACK + 404) ───────────────────────────────────
  test('cancelSale returns 404 when sale not found', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT sale → empty
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { cancelSale } = require('../posController');
    const req = { params: { id: '999' }, body: {} };
    const res = makeRes(); const next = jest.fn();
    await cancelSale(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── cancelSale success (restore products + UPDATE + COMMIT + res.json) ───────
  test('cancelSale success restores products and returns updated sale', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 5, status: 'pending', invoice_code: 'HD005' }] }) // SELECT sale
        .mockResolvedValueOnce(undefined) // UPDATE products restore
        .mockResolvedValueOnce({ rows: [{ id: 5, status: 'cancelled', invoice_code: 'HD005' }] }) // UPDATE sales
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({ getClient: async () => mockClient }));
    const { cancelSale } = require('../posController');
    const req = { params: { id: '5' }, body: { cancel_reason: 'test' } };
    const res = makeRes(); const next = jest.fn();
    await cancelSale(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── lookupCustomer error propagation ─────────────────────────────────────────
  test('lookupCustomer propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { lookupCustomer } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await lookupCustomer({ query: { phone: '0901234567' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getCustomers error propagation ───────────────────────────────────────────
  test('getCustomers propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { getCustomers } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await getCustomers({ query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── getCustomer error propagation ────────────────────────────────────────────
  test('getCustomer propagates db error', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db fail'); },
    }));
    const { getCustomer } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await getCustomer({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── createReturn error propagation (ROLLBACK + next) ───────────────────────
  test('createReturn propagates error via ROLLBACK and next(err)', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('db fail')), // SELECT sale – throws
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: jest.fn(),
    }));
    const { createReturn } = require('../posController');
    const req = {
      params: { id: '7' },
      body: { items: [{ product_id: 15, product_name: 'Widget', product_code: 'W1', sale_price: 50 }], refund_amount: 50 },
      user: { id: 1 },
    };
    const res = makeRes(); const next = jest.fn();
    await createReturn(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ─── getReturns error propagation ────────────────────────────────────────────
  test('getReturns propagates db error to next()', async () => {
    jest.doMock('../../config/database', () => ({
      query: async () => { throw new Error('db error'); },
    }));
    const { getReturns } = require('../posController');
    const res = makeRes(); const next = jest.fn();
    await getReturns({ params: { id: '1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── createReturn with product_id (UPDATE products branch) ────────────────────
  test('createReturn executes product status update when product_id present', async () => {
    const clientCalls = [];
    const mockClient = {
      query: jest.fn().mockImplementation(async (sql) => {
        clientCalls.push(typeof sql === 'string' ? sql.trim().slice(0, 30) : 'paramquery');
        if (/BEGIN/.test(sql)) return undefined;
        if (/SELECT id, status, invoice_code/.test(sql)) return { rows: [{ id: 7, status: 'paid', final_amount: 200 }] };
        if (/SELECT ri\.product_id/.test(sql)) return { rows: [] }; // no prev returns
        if (/INSERT INTO sale_returns/.test(sql)) return { rows: [{ id: 88, sale_id: 7, refund_amount: 50 }] };
        if (/INSERT INTO sale_return_items/.test(sql)) return undefined;
        if (/UPDATE products SET status = 'returned'/.test(sql)) return undefined;
        if (/COMMIT/.test(sql)) return undefined;
        return undefined;
      }),
      release: jest.fn(),
    };
    jest.doMock('../../config/database', () => ({
      getClient: async () => mockClient,
      query: async () => ({ rows: [{ id: 88, items: [{ id: 1 }] }] }),
    }));
    const { createReturn } = require('../posController');
    const req = {
      params: { id: '7' },
      body: { items: [{ product_id: 15, product_name: 'Widget', product_code: 'W1', sale_price: 50 }], refund_amount: 50, reason: 'broken' },
      user: { id: 1 },
    };
    const res = makeRes(); const next = jest.fn();
    await createReturn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    // Verify the UPDATE products was called
    const updateCall = clientCalls.some(c => /UPDATE products SET status/.test(c));
    expect(updateCall).toBe(true);
    expect(mockClient.release).toHaveBeenCalled();
  });
});
