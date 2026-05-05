const fs = require('fs');
const { saveLocally } = require('../upload');

describe('upload.js – saveLocally error branches', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('throws if mkdirSync fails', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => { throw new Error('mkdir fail'); });
    expect(() => saveLocally(Buffer.from('abc'), 'file.jpg')).toThrow('mkdir fail');
  });

  test('throws if writeFileSync fails', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => { throw new Error('write fail'); });
    expect(() => saveLocally(Buffer.from('abc'), 'file.jpg')).toThrow('write fail');
  });
});
