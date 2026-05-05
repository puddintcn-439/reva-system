/**
 * Integration tests for /api/inbox routes (supertest)
 */
const request = require('supertest');

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', username: 'admin', role: 'admin' };
    next();
  },
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../config/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

// Mock DB
const mockQuery = jest.fn();
jest.mock('../../config/database', () => ({ query: (...args) => mockQuery(...args) }));

// Mock systemSettings to avoid DB read
jest.mock('../../config/systemSettings', () => ({
  getJwtSecret: jest.fn().mockResolvedValue('test-secret'),
  getAllowedOrigins: jest.fn().mockResolvedValue(['http://localhost:5173']),
}));

let app;
beforeAll(() => {
  app = require('../../app');
});

beforeEach(() => {
  mockQuery.mockReset();
});

const THREAD_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER_ID   = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MSG_ID    = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const mockThread = {
  id: THREAD_ID, title: 'Câu hỏi vận hành', status: 'open',
  created_by: USER_ID, created_at: new Date().toISOString(),
};
const mockMessage = {
  id: MSG_ID, thread_id: THREAD_ID, sender_id: USER_ID,
  body: 'Xin hỏi...', created_at: new Date().toISOString(),
  sender_name: 'Admin', sender_username: 'admin', sender_role: 'admin',
};

// ── GET /api/inbox/threads ────────────────────────────────────────────────────

describe('GET /api/inbox/threads', () => {
  test('returns 200 with list of threads', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockThread] });

    const res = await request(app).get('/api/inbox/threads');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('returns empty array when no threads', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/inbox/threads');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ── POST /api/inbox/threads ───────────────────────────────────────────────────

describe('POST /api/inbox/threads', () => {
  test('returns 201 with new thread', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockThread] });

    const res = await request(app)
      .post('/api/inbox/threads')
      .send({ title: 'Câu hỏi vận hành' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Câu hỏi vận hành');
  });

  test('returns 400 when title is empty', async () => {
    const res = await request(app)
      .post('/api/inbox/threads')
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/inbox/threads')
      .send({});

    expect(res.status).toBe(400);
  });

  test('returns 400 when title exceeds 200 chars', async () => {
    const res = await request(app)
      .post('/api/inbox/threads')
      .send({ title: 'a'.repeat(201) });

    expect(res.status).toBe(400);
  });
});

// ── GET /api/inbox/threads/:id/messages ──────────────────────────────────────

describe('GET /api/inbox/threads/:id/messages', () => {
  test('returns 200 with messages', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: THREAD_ID, title: 'Test', status: 'open' }] }) // thread check
      .mockResolvedValueOnce({ rows: [mockMessage] }); // messages

    const res = await request(app).get(`/api/inbox/threads/${THREAD_ID}/messages`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('returns 404 when thread not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`/api/inbox/threads/${THREAD_ID}/messages`);
    expect(res.status).toBe(404);
  });

  test('returns 400 when id is not a valid UUID', async () => {
    const res = await request(app).get('/api/inbox/threads/not-a-uuid/messages');
    expect(res.status).toBe(400);
  });

  test('supports after query param', async () => {
    const after = new Date().toISOString();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: THREAD_ID, title: 'Test', status: 'open' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`/api/inbox/threads/${THREAD_ID}/messages?after=${encodeURIComponent(after)}`);
    expect(res.status).toBe(200);
  });

  test('returns 400 for invalid after timestamp', async () => {
    const res = await request(app).get(`/api/inbox/threads/${THREAD_ID}/messages?after=not-a-date`);
    expect(res.status).toBe(400);
  });
});

// ── POST /api/inbox/threads/:id/messages ─────────────────────────────────────

describe('POST /api/inbox/threads/:id/messages', () => {
  test('returns 201 with message when thread is open', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: THREAD_ID, status: 'open' }] }) // thread check
      .mockResolvedValueOnce({ rows: [{ id: MSG_ID, body: 'Xin hỏi...', created_at: new Date().toISOString(), sender_id: USER_ID }] }) // insert
      .mockResolvedValueOnce({ rows: [] }); // update updated_at

    const res = await request(app)
      .post(`/api/inbox/threads/${THREAD_ID}/messages`)
      .send({ body: 'Xin hỏi...' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.body).toBe('Xin hỏi...');
  });

  test('returns 409 when thread is closed', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: THREAD_ID, status: 'closed' }] });

    const res = await request(app)
      .post(`/api/inbox/threads/${THREAD_ID}/messages`)
      .send({ body: 'Test' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/đóng/i);
  });

  test('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post(`/api/inbox/threads/${THREAD_ID}/messages`)
      .send({ body: '' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when body is missing', async () => {
    const res = await request(app)
      .post(`/api/inbox/threads/${THREAD_ID}/messages`)
      .send({});

    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid thread UUID', async () => {
    const res = await request(app)
      .post('/api/inbox/threads/bad-uuid/messages')
      .send({ body: 'test' });

    expect(res.status).toBe(400);
  });
});

// ── PATCH /api/inbox/threads/:id/close ───────────────────────────────────────

describe('PATCH /api/inbox/threads/:id/close', () => {
  test('returns 200 when thread closed', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...mockThread, status: 'closed' }] });

    const res = await request(app).patch(`/api/inbox/threads/${THREAD_ID}/close`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('closed');
  });

  test('returns 404 when thread not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).patch(`/api/inbox/threads/${THREAD_ID}/close`);
    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/inbox/threads/:id/reopen ──────────────────────────────────────

describe('PATCH /api/inbox/threads/:id/reopen', () => {
  test('returns 200 when thread reopened', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...mockThread, status: 'open' }] });

    const res = await request(app).patch(`/api/inbox/threads/${THREAD_ID}/reopen`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('open');
  });
});

// ── DELETE /api/inbox/threads/:id ────────────────────────────────────────────

describe('DELETE /api/inbox/threads/:id', () => {
  test('returns 200 when thread deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: THREAD_ID }] });

    const res = await request(app).delete(`/api/inbox/threads/${THREAD_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 404 when thread not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete(`/api/inbox/threads/${THREAD_ID}`);
    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid UUID', async () => {
    const res = await request(app).delete('/api/inbox/threads/bad-uuid');
    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/inbox/messages/:id ───────────────────────────────────────────

describe('DELETE /api/inbox/messages/:id', () => {
  test('returns 200 when owner deletes own message', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: MSG_ID, sender_id: USER_ID }] }) // find msg
      .mockResolvedValueOnce({ rows: [] }); // delete

    const res = await request(app).delete(`/api/inbox/messages/${MSG_ID}`);
    expect(res.status).toBe(200);
  });

  test('returns 404 when message not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete(`/api/inbox/messages/${MSG_ID}`);
    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid UUID', async () => {
    const res = await request(app).delete('/api/inbox/messages/bad-uuid');
    expect(res.status).toBe(400);
  });
});
