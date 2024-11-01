const path = require('path-browserify');

module.exports = {
    webpack: {
        alias: {},
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