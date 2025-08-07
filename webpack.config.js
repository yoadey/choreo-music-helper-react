const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
    const config = await createExpoWebpackConfigAsync(env, argv);

    // Proxy Setup: Leite /audio an deinen Backend-Server weiter
    config.devServer = {
        ...config.devServer,
        proxy: {
            '/audio': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    };
    config.resolve = {
        extensions: ['.web.js', '.js', '.jsx', '.json'],
        alias: {
            // optional: React Native Aliases
            'react-native$': 'react-native-web',
        },
    }


    return config;
};
