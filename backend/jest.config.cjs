module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  // Collect coverage only for the focused module we fully test.
  collectCoverageFrom: ['src/middleware/errorHandler.js'],
  coverageThreshold: {
    './src/middleware/errorHandler.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['/node_modules/']
}
