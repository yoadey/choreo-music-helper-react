jest.mock('react-native-track-player', () => {
	const mock = jest.requireActual('./src/testUtils/trackPlayerMock')
	return { __esModule: true, ...mock, default: mock.default }
})

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'de-DE' }] }))
