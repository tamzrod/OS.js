import Auth from '../src/auth.js';

const createHarness = ({cookie, standalone = false, adapter} = {}) => {
  const events = [];
  const ui = {
    destroy: jest.fn(),
    emit: jest.fn((...args) => events.push(args)),
    init: jest.fn(),
    on: jest.fn()
  };
  const authAdapter = adapter || {
    init: jest.fn(() => Promise.resolve(true)),
    login: jest.fn(values => Promise.resolve({id: 1, username: values.username})),
    logout: jest.fn(() => Promise.resolve(true))
  };
  const core = {
    config: jest.fn((key, fallback) => {
      if (key === 'auth.cookie') {
        return cookie === undefined ? {enabled: false, name: 'osjs.auth'} : cookie;
      }
      if (key === 'auth.ui' || key === 'auth.login') {
        return fallback;
      }
      if (key === 'standalone') {
        return standalone;
      }
      if (key === 'development') {
        return false;
      }
      return fallback;
    }),
    destroy: jest.fn(),
    emit: jest.fn()
  };
  const auth = new Auth(core, {
    login: () => ui,
    adapter: () => authAdapter
  });
  auth.callback = jest.fn();

  return {auth, authAdapter, core, events, ui};
};

const watchBrowserPersistence = () => {
  const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  const cookieReads = jest.fn(() => descriptor.get.call(document));
  const cookieWrites = jest.fn(value => descriptor.set.call(document, value));
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: cookieReads,
    set: cookieWrites
  });

  const localWrites = jest.spyOn(Storage.prototype, 'setItem');
  const indexedDbDescriptor = Object.getOwnPropertyDescriptor(window, 'indexedDB');
  const indexedDbOpen = jest.fn();
  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    value: {open: indexedDbOpen}
  });

  return {
    cookieReads,
    cookieWrites,
    indexedDbOpen,
    localWrites,
    restore: () => {
      localWrites.mockRestore();
      delete document.cookie;
      if (indexedDbDescriptor) {
        Object.defineProperty(window, 'indexedDB', indexedDbDescriptor);
      } else {
        delete window.indexedDB;
      }
    }
  };
};

describe('Auth credential-persistence security contract', () => {
  let persistence;

  beforeEach(() => {
    persistence = watchBrowserPersistence();
  });

  afterEach(() => {
    persistence.restore();
  });

  test('rejects an own enabled:true legacy cookie policy before UI or adapter initialization', async () => {
    const {auth, authAdapter, ui} = createHarness({
      cookie: {enabled: true, name: 'osjs.auth'}
    });

    await expect(auth.init()).rejects.toThrow(/cookie.*persistence|migration/i);
    expect(ui.init).not.toHaveBeenCalled();
    expect(authAdapter.init).not.toHaveBeenCalled();
    expect(persistence.cookieReads).not.toHaveBeenCalled();
    expect(persistence.cookieWrites).not.toHaveBeenCalled();
  });

  test('ignores inherited enabled:true and initializes normally', async () => {
    const cookie = Object.create({enabled: true});
    cookie.name = 'osjs.auth';
    const {auth, authAdapter} = createHarness({cookie});

    await expect(auth.init()).resolves.toBe(true);
    expect(authAdapter.init).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['__proto__', JSON.parse('{"enabled":false,"__proto__":{"enabled":true}}')],
    ['constructor', JSON.parse('{"enabled":false,"constructor":{"enabled":true}}')],
    ['prototype', JSON.parse('{"enabled":false,"prototype":{"enabled":true}}')]
  ])('does not let an own %s key alter the legacy-policy decision', async (key, cookie) => {
    const {auth, authAdapter} = createHarness({cookie});

    await expect(auth.init()).resolves.toBe(true);
    expect(authAdapter.init).toHaveBeenCalledTimes(1);
  });

  test('rejects an enabled accessor without invoking it', async () => {
    const getter = jest.fn(() => true);
    const cookie = {name: 'osjs.auth'};
    Object.defineProperty(cookie, 'enabled', {enumerable: true, get: getter});
    const {auth, authAdapter} = createHarness({cookie});

    await expect(auth.init()).rejects.toThrow(/cookie.*configuration|migration/i);
    expect(getter).not.toHaveBeenCalled();
    expect(authAdapter.init).not.toHaveBeenCalled();
  });

  test.each([
    ['a non-object policy', true],
    ['an array policy', []],
    ['a non-Boolean own enabled value', {enabled: 'true'}]
  ])('rejects %s before adapter initialization', async (label, cookie) => {
    const {auth, authAdapter} = createHarness({cookie});

    await expect(auth.init()).rejects.toThrow(/cookie.*configuration|Boolean/i);
    expect(authAdapter.init).not.toHaveBeenCalled();
  });

  test('startup does not read or replay a legacy cookie when persistence is disabled', async () => {
    document.cookie = 'osjs.auth=%7B%22username%22%3A%22legacy%22%2C%22password%22%3A%22secret%22%7D; path=/';
    persistence.cookieWrites.mockClear();
    const {auth, authAdapter, ui} = createHarness();

    await expect(auth.show(jest.fn())).resolves.toBe(true);
    expect(ui.init).toHaveBeenCalledTimes(1);
    expect(authAdapter.login).not.toHaveBeenCalled();
    expect(persistence.cookieReads).not.toHaveBeenCalled();
    expect(persistence.cookieWrites).not.toHaveBeenCalled();
    expect(persistence.localWrites).not.toHaveBeenCalled();
    expect(persistence.indexedDbOpen).not.toHaveBeenCalled();
  });

  test('successful login passes the original values only to the adapter and persists nothing', async () => {
    const nestedGetter = jest.fn(() => 'must-not-be-read');
    const values = {
      username: 'alice',
      password: 'secret',
      nested: {}
    };
    Object.defineProperty(values.nested, 'hostile', {enumerable: true, get: nestedGetter});
    values[Symbol('private')] = 'symbol-value';
    const {auth, authAdapter, core, ui} = createHarness();

    await expect(auth.login(values)).resolves.toBe(true);
    expect(authAdapter.login).toHaveBeenCalledWith(values);
    expect(nestedGetter).not.toHaveBeenCalled();
    expect(persistence.cookieReads).not.toHaveBeenCalled();
    expect(persistence.cookieWrites).not.toHaveBeenCalled();
    expect(persistence.localWrites).not.toHaveBeenCalled();
    expect(persistence.indexedDbOpen).not.toHaveBeenCalled();
    expect(ui.emit.mock.calls.map(([name]) => name)).toEqual(['login:start', 'login:stop']);
    expect(core.emit).toHaveBeenCalledWith('osjs/core:logged-in');
  });

  test('never serializes submitted credentials when legacy persistence is enabled', async () => {
    const values = {username: 'alice', password: 'not-for-browser-storage', custom: 'private'};
    const {auth, authAdapter} = createHarness({
      cookie: {enabled: true, name: 'osjs.auth', expires: 7}
    });

    await expect(auth.login(values)).resolves.toBe(true);
    expect(authAdapter.login).toHaveBeenCalledWith(values);
    expect(persistence.cookieWrites).not.toHaveBeenCalled();
    expect(persistence.localWrites).not.toHaveBeenCalled();
    expect(persistence.indexedDbOpen).not.toHaveBeenCalled();
  });

  test('failed login preserves event order and persists nothing', async () => {
    const adapter = {
      init: jest.fn(() => Promise.resolve(true)),
      login: jest.fn(() => Promise.reject(new Error('expected failure'))),
      logout: jest.fn(() => Promise.resolve(true))
    };
    const {auth, ui} = createHarness({adapter});

    await expect(auth.login({username: 'alice', password: 'secret'})).resolves.toBe(false);
    expect(persistence.cookieWrites).not.toHaveBeenCalled();
    expect(persistence.localWrites).not.toHaveBeenCalled();
    expect(persistence.indexedDbOpen).not.toHaveBeenCalled();
    expect(ui.emit.mock.calls.map(([name]) => name)).toEqual([
      'login:start',
      'login:error',
      'login:stop'
    ]);
  });

  test('successful logout preserves shutdown behavior without manipulating cookies', async () => {
    const {auth, authAdapter, core} = createHarness();

    await expect(auth.logout(false)).resolves.toBe(true);
    expect(authAdapter.logout).toHaveBeenCalledWith(false);
    expect(persistence.cookieReads).not.toHaveBeenCalled();
    expect(persistence.cookieWrites).not.toHaveBeenCalled();
    expect(persistence.localWrites).not.toHaveBeenCalled();
    expect(persistence.indexedDbOpen).not.toHaveBeenCalled();
    expect(core.destroy).toHaveBeenCalledTimes(1);
    expect(core.emit).toHaveBeenCalledWith('osjs/core:logged-out');
  });

  test('standalone login retains adapter behavior without client cookie access', async () => {
    const {auth} = createHarness({standalone: true});
    const values = {username: 'standalone', password: 'local'};

    await expect(auth.login(values)).resolves.toBe(true);
    expect(persistence.cookieReads).not.toHaveBeenCalled();
    expect(persistence.cookieWrites).not.toHaveBeenCalled();
    expect(persistence.localWrites).not.toHaveBeenCalled();
    expect(persistence.indexedDbOpen).not.toHaveBeenCalled();
  });
});
