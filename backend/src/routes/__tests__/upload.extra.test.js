const request = require('supertest');
const express = require('express');
const router = require('../upload');

describe('upload.js – extra coverage', () => {
  // File filter rejection (lines 16-17)
  test('rejects disallowed mime type', (done) => {
    jest.resetModules();
    jest.doMock('../../middleware/auth', () => ({ authenticate: (req, res, next) => next() }));
    const patchedRouter = require('../upload');
    const app = express();
    app.use(patchedRouter);
    request(app)
      .post('/image')
      .attach('image', Buffer.from('abc'), { filename: 'x.txt', contentType: 'application/pdf' })
      .expect(400)
      .expect(res => {
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/chỉ chấp nhận ảnh/i);
      })
      .end(done);
  });

  // Fallback to saveLocally (line 84)
  test('saveLocally writes file and returns path', () => {
    const fs = require('fs');
    const path = require('path');
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const { saveLocally } = require('../upload');
    const result = saveLocally(Buffer.from('abc'), 'file.jpg');
    expect(result).toMatch(/\/uploads\/file.jpg$/);
  });

  // Multer error handler (line 93)
  test('handles LIMIT_FILE_SIZE error', (done) => {
    // Test error handler directly
    const handler = require('../upload').stack.find(l => l.handle && l.handle.length === 4).handle;
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    handler({ code: 'LIMIT_FILE_SIZE' }, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(res.json.mock.calls[0][0].message).toMatch(/tối đa 5 MB/i);
    done();
  });
});
