module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
}