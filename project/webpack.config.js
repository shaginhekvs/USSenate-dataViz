var webpack = require('webpack');
var path = require('path');
var OpenBrowserPlugin = require('open-browser-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
    node: {
        fs: "empty"
    },
    devServer: {
        historyApiFallback: true,
        hot: true,
        inline: true,
        progress: true,
        contentBase: './app',
        port: 8080
    },
    devtool: 'source-map',
    entry: [
        'webpack-dev-server/client?http://localhost:8080',
        path.resolve(__dirname, 'app/main.js')
    ],
    output: {
        path: __dirname + '/build',
        publicPath: '/',
        filename: './bundle.js'
    },
    module: {
        loaders: [{
                test: /\.jsx?$/,
                include: path.resolve(__dirname, 'app'),
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015', 'stage-0', 'react']
                }
            },
            { test: /\.css$/, include: path.resolve(__dirname, 'app'), loader: ['style-loader', 'css-loader'] },
            { test: /\.scss$/, loader: ExtractTextPlugin.extract({ fallback: 'style-loader', use: 'css-loader?sourceMap!sass-loader?sourceMap' }) },
            { test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' }
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx', '.css'],
        alias: {
            leaflet_css: __dirname + "/node_modules/leaflet/dist/leaflet.css",

        }
    },
    plugins: [
        new ExtractTextPlugin({ filename: 'main.css' }),
        new webpack.HotModuleReplacementPlugin(),
        // new OpenBrowserPlugin({ url: 'http://localhost:8080' }),
        new webpack.LoaderOptionsPlugin({
            options: {
                sassLoader: {
                    includePaths: ['app/style']
                },
                context: path.join(__dirname, 'src'),
                output: {
                    path: path.join(__dirname, 'www')
                }
            }
        }), new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery'
        })
    ]
};