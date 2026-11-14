const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  devtool: 'source-map',
  entry: [
    path.resolve(__dirname, 'index.js'),
  ],
  output: {
    library: {
      name: 'osjsDialogs',
      type: 'umd',
      umdNamedDefine: true
    },
    globalObject: 'this',
    sourceMapFilename: '[file].map',
    filename: '[name].js'
  },
  optimization: {
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
        test: /\.(sa|sc|c)ss$/,
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
        exclude: /node_modules\/(?!@osjs)/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  }
};
