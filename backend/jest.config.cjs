module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  // Collect coverage across the entire backend source tree.
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  // We report coverage for the whole backend; exclude non-production scripts.
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/src/scripts/'],
  testPathIgnorePatterns: ['/node_modules/']
}
