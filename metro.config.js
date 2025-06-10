// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

[
    "expo-sqlite",
    {
        "enableFTS": true,
        "useSQLCipher": true,
        "android": {
            // Override the shared configuration for Android
            "enableFTS": false,
            "useSQLCipher": false
        },
        "ios": {
            // You can also override the shared configurations for iOS
            "customBuildFlags": ["-DSQLITE_ENABLE_DBSTAT_VTAB=1 -DSQLITE_ENABLE_SNAPSHOT=1"]
        }
    }
]

module.exports = config;
