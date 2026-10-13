module.exports = {
	preset: 'jest-expo/web',
	moduleNameMapper: {
		'^@/assets/(.*)$': '<rootDir>/assets/$1',
		'^@/(.*)$': '<rootDir>/src/$1',
	},
	testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/dist/'],
	setupFiles: ['<rootDir>/jest.setup.js'],
}
