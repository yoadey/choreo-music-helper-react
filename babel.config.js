module.exports = function (api) {
	api.cache(true)
	return {
		presets: ['babel-preset-expo'],
		plugins: [
			// Required by the WatermelonDB model decorators. Babel requires the same "loose" mode for
			// class properties, private methods and private properties (used by React Native itself).
			['@babel/plugin-proposal-decorators', { legacy: true }],
			['@babel/plugin-transform-class-properties', { loose: true }],
			['@babel/plugin-transform-private-methods', { loose: true }],
			['@babel/plugin-transform-private-property-in-object', { loose: true }],
		],
	}
}
