const path = require('path');

module.exports = {
    webpack: {
        alias: {
            '@config': path.resolve(__dirname, 'src/config'),
            '@components': path.resolve(__dirname, 'src/components'),
        },
        configure: {
            resolve: {
                fallback: {
                    fs: false, //fs is not available in the browser.
                    path: require.resolve('path-browserify'),
                    os: require.resolve('os-browserify/browser'),
                },
            },
        },
    },
};