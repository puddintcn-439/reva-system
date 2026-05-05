describe('swagger config', () => {
  test('generates OpenAPI spec with expected version', () => {
    const spec = require('../swagger');
    expect(spec).toBeDefined();
    expect(spec.openapi).toBe('3.0.0');
  });
});
