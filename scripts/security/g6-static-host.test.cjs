'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const dist = path.join(root, 'dist');

const within = (target, base) => target === base || target.startsWith(base + path.sep);

const resolve = requestUrl => {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  if (pathname.includes('\0')) return null;
  const candidate = path.resolve(dist, '.' + pathname);
  if (!within(candidate, dist)) return null;
  let real;
  try { real = fs.realpathSync(candidate); } catch { return null; }
  const allowed = within(real, dist) ||
    /\/node_modules\/@osjs\/[^/]+\/dist(?:\/|$)/.test(real) ||
    /\/vendor\/osjs-[^/]+\/dist(?:\/|$)/.test(real);
  if (!allowed || !fs.statSync(real).isFile()) return null;
  return real;
};

const handler = (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {allow: 'GET, HEAD'}).end();
    return;
  }
  const filename = resolve(request.url === '/' ? '/index.html' : request.url);
  if (!filename) {
    response.writeHead(404).end();
    return;
  }
  const extension = path.extname(filename);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };
  const body = fs.readFileSync(filename);
  response.writeHead(200, {'content-type': types[extension] || 'application/octet-stream'});
  response.end(request.method === 'HEAD' ? undefined : body);
};

const get = (port, requestPath, method = 'GET') => new Promise((resolvePromise, reject) => {
  const request = http.request({host: '127.0.0.1', port, path: requestPath, method}, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolvePromise({
      status: response.statusCode,
      type: response.headers['content-type'],
      body: Buffer.concat(chunks)
    }));
  });
  request.on('error', reject);
  request.end();
});

test('the artifact serves as a clean static site and rejects server paths', async t => {
  const server = http.createServer(handler);
  await new Promise(resolvePromise => server.listen(0, '127.0.0.1', resolvePromise));
  t.after(() => server.close());
  const {port} = server.address();

  const index = await get(port, '/');
  assert.equal(index.status, 200);
  assert.match(index.type, /^text\/html/);
  assert.match(index.body.toString(), /osjs\.js/);

  const script = await get(port, '/osjs.js');
  assert.equal(script.status, 200);
  assert.match(script.type, /^text\/javascript/);
  assert.deepEqual(script.body, fs.readFileSync(path.join(dist, 'osjs.js')));

  const metadata = await get(port, '/metadata.json');
  assert.equal(metadata.status, 200);
  assert(Array.isArray(JSON.parse(metadata.body)));

  const application = await get(port, '/apps/FileManager/main.js');
  assert.equal(application.status, 200);
  assert.match(application.type, /^text\/javascript/);

  for (const forbidden of ['/package.json', '/src/server/index.js', '/%2e%2e/package.json', '/vendor/osjs-server/package.json']) {
    assert.equal((await get(port, forbidden)).status, 404, `${forbidden} must not be served`);
  }
  assert.equal((await get(port, '/', 'POST')).status, 405);
  assert.equal((await get(port, '/osjs.js', 'HEAD')).status, 200);
});
