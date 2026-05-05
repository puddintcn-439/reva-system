/* eslint-disable global-require */
describe('database.js – pool.on error handler', () => {
  beforeEach(() => { jest.resetModules(); });

  test('should handle pool error and call process.exit', () => {
    const mockOn = jest.fn();
    const mockPool = { on: mockOn };
    jest.doMock('pg', () => ({ Pool: jest.fn(() => mockPool) }));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    require('../database');
    // Simulate error event
    const handler = mockOn.mock.calls.find(([event]) => event === 'error')[1];
    handler(new Error('idle error'));
    expect(errorSpy).toHaveBeenCalledWith('Unexpected error on idle DB client', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(-1);
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
