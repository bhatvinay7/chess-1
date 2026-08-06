/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', '<rootDir>/../../node_modules'],
  testMatch: ['**/test/**/*.test.ts'],
  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/../../packages/postgres-db/node_modules/@prisma/client',
    '^@repo/(.*)$': '<rootDir>/../../packages/$1/src',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true,
      },
    ],
  },
  setupFiles: ['<rootDir>/test/setup.ts'],
};
