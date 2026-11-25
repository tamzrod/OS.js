const {UnsafeObjectInputError} = require('@osjs/common');
const Core = require('../src/core.js');

const options = {kill: false, argv: []};

test('server configuration rejects reserved keys recursively', () => {
  const hostile = JSON.parse('{"public":"/tmp","constructor":{"prototype":{"admin":true}}}');
  expect(() => new Core(hostile, options)).toThrow(UnsafeObjectInputError);
  expect(({}).admin).toBeUndefined();
});

test('server configuration rejects accessors without invoking them', () => {
  let invoked = 0;
  const hostile = {public: '/tmp'};
  Object.defineProperty(hostile, 'secret', {enumerable: true, get: () => ++invoked});
  expect(() => new Core(hostile, options)).toThrow(UnsafeObjectInputError);
  expect(invoked).toBe(0);
});

test('CLI configuration preserves precedence with explicit array replacement', () => {
  const core = new Core({public: '/tmp', development: false}, {
    ...options,
    argv: ['--development', 'true']
  });
  expect(core.config('development')).toBe(true);
  return core.destroy();
});
