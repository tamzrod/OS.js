const path = require('path');
const plugins = [];

module.exports = {
  target: 'node',
  devtool: 'source-map',
  entry: [
    path.resolve(__dirname, 'index.js'),
  ],
  output: {
    library: {
      type: 'commonjs'
    },
    sourceMapFilename: '[file].map',
    filename: '[name].js'
  },
  plugins: [
    ...plugins
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  }
};
