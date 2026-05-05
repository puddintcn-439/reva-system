module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  // Collect coverage across the entire backend source tree.
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  // We report coverage for the whole backend; thresholds are not enforced here.
  testPathIgnorePatterns: ['/node_modules/']
}
