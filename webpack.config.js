const path = require('path');
const mode = process.env.NODE_ENV || 'development';
const minimize = mode === 'production';
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const {DefinePlugin} = webpack;
const npm = require('./package.json');

module.exports = {
  mode,
  devtool: 'source-map',
  entry: {
    osjs: path.resolve(__dirname, 'src/client/index.js')
  },
  performance: {
    maxEntrypointSize: 500 * 1024,
    maxAssetSize: 500 * 1024
  },
  optimization: {
    minimize,
    minimizer: ['...', new CssMinimizerPlugin()],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendorStyles: {
          test: /[\\/](node_modules|vendor)[\\/]/,
          name: 'vendors~osjs',
          type: 'css/mini-extract',
          chunks: 'all',
          enforce: true
        },
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors~osjs',
          priority: -10,
          reuseExistingChunk: true
        }
      }
    }
  },
  plugins: [
    new DefinePlugin({
      OSJS_VERSION: JSON.stringify(npm.version)
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/client/index.ejs'),
      favicon: path.resolve(__dirname, 'src/client/favicon.png'),
      title: 'OS.js'
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  module: {
    rules: [
      {
        test: /\.(svg|png|jpe?g|gif|webp)$/,
        exclude: /typeface/,
        type: 'asset/resource'
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        include: /typeface/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]'
        }
      },
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
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        exclude: /vendor[\\/].*[\\/]dist/,
        use: {
          loader: 'source-map-loader'
        }
      }
    ]
  }
};
