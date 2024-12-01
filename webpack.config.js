
const path = require("path");

module.exports = {

    resolve: {
        extensions: [".js", ".jsx", ".json"],
    },
    module: {
        rules: [
            {
            test: /\.jsx?$/,
            exclude: /node_modules/,
            use: {
                loader: "babel-loader",
                options: {
                presets: ["@babel/preset-env", "@babel/preset-react"],
                },
            },
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
    devtool: "source-map",
}