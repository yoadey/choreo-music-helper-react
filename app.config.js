/**
 * Extends app.json. EXPO_BASE_URL allows hosting the web app in a sub directory,
 * e.g. "/choreo-music-helper-react" for a GitHub Pages project site (set by the deploy workflow).
 */
module.exports = ({ config }) => ({
	...config,
	experiments: {
		...config.experiments,
		baseUrl: process.env.EXPO_BASE_URL || undefined,
	},
})
