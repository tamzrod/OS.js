import {UnsafeObjectInputError} from '@osjs/common';
import Settings from '../src/settings';
import Filesystem from '../src/filesystem';
import localStorageSettings from '../src/adapters/settings/localstorage';

const configuration = {
  'settings.defaults': {desktop: {panels: ['default']}},
  'settings.lock': [],
  'vfs.defaultAdapter': 'null'
};

const core = {
  config: (key, fallback) => Object.prototype.hasOwnProperty.call(configuration, key)
    ? configuration[key]
    : fallback,
  emit: jest.fn(),
  make: () => ({translate: value => value})
};

test('settings reject hostile persisted descriptors without invoking them', async () => {
  let invoked = 0;
  const hostile = {};
  Object.defineProperty(hostile, 'value', {enumerable: true, get: () => ++invoked});
  const settings = new Settings(core, {
    adapter: () => ({load: () => Promise.resolve(hostile)})
  });

  await expect(settings.load()).resolves.toBe(false);
  expect(invoked).toBe(0);
  expect(settings.settings).toEqual(configuration['settings.defaults']);
});

test('settings reject reserved namespaces and dotted path segments', () => {
  const settings = new Settings(core, {adapter: () => ({})});
  expect(() => settings.set('__proto__', 'admin', true)).toThrow(UnsafeObjectInputError);
  expect(() => settings.set('desktop', 'constructor.prototype.admin', true))
    .toThrow(UnsafeObjectInputError);
  expect(() => settings.get('desktop', '__proto__.admin')).toThrow(UnsafeObjectInputError);
  expect(({}).admin).toBeUndefined();
});

test('mountpoint input rejects reserved nested keys', () => {
  const filesystem = new Filesystem(core, {adapters: {null: () => ({})}});
  const hostile = JSON.parse('{"name":"bad","attributes":{"constructor":{"prototype":{"admin":true}}}}');
  expect(() => filesystem.createMountpoint(hostile)).toThrow(UnsafeObjectInputError);
});

test('local-storage loading rejects reserved storage keys', async () => {
  localStorage.clear();
  const keys = Object.keys;
  const keySpy = jest.spyOn(Object, 'keys').mockImplementation(value =>
    value === localStorage ? ['constructor'] : keys(value));
  const itemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('{"admin":true}');
  try {
    await expect(localStorageSettings(core).load()).rejects.toBeInstanceOf(UnsafeObjectInputError);
    expect(({}).admin).toBeUndefined();
  } finally {
    keySpy.mockRestore();
    itemSpy.mockRestore();
    localStorage.clear();
  }
});
