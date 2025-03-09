/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/out/'],
  setupFiles: ['dotenv/config'],
  testTimeout: 30000, // 30 seconds for API calls
};

module.exports = config;
