const webpack = require('webpack');

module.exports = function override(config) {
    config.resolve.fallback = {
        ...config.resolve.fallback,
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify"),
        "url": require.resolve("url"),
        "zlib": require.resolve("browserify-zlib"),
        "process": require.resolve("process/browser"),
        "path": require.resolve("path-browserify"),
        "fs": false,
        "vm": require.resolve("vm-browserify") // Add this line
    };

    config.plugins.push(
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer']
        })
    );

    config.module.rules.push({
        test: /\.m?js/,
        resolve: {
            fullySpecified: false
        }
    });

    // Add this section to handle Node.js core modules
    config.resolve.alias = {
        ...config.resolve.alias,
        "path": "path-browserify",
        "os": "os-browserify/browser",
        "crypto": "crypto-browserify"
    };

    return config;
}