module.exports = {
	globDirectory: 'dist/',
	globPatterns: [
		'**/*.{js,css,html,json,ico,png,webmanifest}',
		// Only the icon fonts used by the app, the other ones are loaded on demand
		'assets/**/{FontAwesome6_Solid,FontAwesome6_Regular,MaterialCommunityIcons,Ionicons}.*.ttf',
	],
	// The licenses chunk is large and rarely used, it is cached on demand
	globIgnores: ['sw.js', '404.html', 'metadata.json', '_expo/static/js/web/licenses-*.js'],
	swSrc: 'src/sw.js',
	swDest: 'temp/sw.js',
	injectionPoint: 'self.__WB_MANIFEST',
	maximumFileSizeToCacheInBytes: 8 * 1024 ** 2, // 8 MB
}
