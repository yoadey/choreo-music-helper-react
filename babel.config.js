module.exports = function (api) {
	api.cache(true)
	return {
		presets: [
			'babel-preset-expo',
			[ 'module:metro-react-native-babel-preset', { "useTransformReactJSXExperimental": true }]
		],
		plugins: [
			["@babel/plugin-proposal-decorators", { legacy: true }],
			["@babel/plugin-proposal-class-properties", { "loose": true }],
			[
				"@babel/plugin-transform-runtime",
				{
					"helpers": true,
					"regenerator": true
				}
			]
		]
	}
}
