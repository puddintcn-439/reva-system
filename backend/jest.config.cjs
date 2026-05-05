module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  // Collect coverage for the focused modules we fully test.
  collectCoverageFrom: [
    'src/middleware/errorHandler.js',
    'src/config/systemSettings.js'
  ],
  coverageThreshold: {
    './src/middleware/errorHandler.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/config/systemSettings.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['/node_modules/']
}
