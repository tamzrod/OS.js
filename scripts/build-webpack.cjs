'use strict';

const mode = process.argv[2] || 'production';
const watch = process.argv[3] === 'watch';

if (!['development', 'production'].includes(mode)) {
  throw new Error(`Unsupported webpack mode: ${mode}`);
}

process.env.NODE_ENV = mode;
process.argv = [process.argv[0], require.resolve('webpack/bin/webpack.js'), '--mode', mode];

if (watch) {
  process.argv.push('--watch');
}

require('webpack/bin/webpack.js');
