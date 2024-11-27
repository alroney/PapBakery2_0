const path = require('path');

module.exports = {
    webpack: {
        alias: {
            '@config': path.resolve(__dirname, 'src/config'),
            '@components': path.resolve(__dirname, 'src/components'),
        },
        configure: {
            resolve: {
                modules: [path.resolve(__dirname, 'src'), 'node_modules'],
            },
        },
    },
};