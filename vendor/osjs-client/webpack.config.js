const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const mode = process.env.NODE_ENV || 'development';
const minimize = mode === 'production';
module.exports = {
  mode,
  devtool: 'source-map',
  entry: [
    path.resolve(__dirname, 'index.js'),
  ],
  output: {
    library: {
      name: 'osjsClient',
      type: 'umd',
      umdNamedDefine: true
    },
    globalObject: 'this',
    sourceMapFilename: '[file].map',
    filename: '[name].js'
  },
  optimization: {
    minimize,
    minimizer: ['...', new CssMinimizerPlugin()],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css'
    })
  ],
  module: {
    rules: [
      {
        test: /\.(svg|png|jpe?g|gif|webp)$/,
        exclude: /(node_modules|bower_components)/,
        type: 'asset/resource'
      },
      {
        test: /\.(sa|sc|c)ss$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)\/(?!@osjs)/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  }
};
