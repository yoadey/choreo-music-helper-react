module.exports = {
	globDirectory: 'dist/',
	globPatterns: [
		'**/*.{js,ico,html,json}'
	],
	swSrc: 'src/sw.js',
	swDest: 'temp/sw.js',
	injectionPoint: 'self.__WB_MANIFEST',
	maximumFileSizeToCacheInBytes: 5 * 1024 ** 2, // 5 MB
};