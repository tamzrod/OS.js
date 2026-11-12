/* Fork security utility for descriptor-safe object handling. */

const RESERVED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const ARRAY_INDEX = /^(0|[1-9][0-9]*)$/;

export class UnsafeObjectInputError extends TypeError {
  constructor(path, reason) {
    super(`Unsafe object input at ${path}: ${reason}`);
    this.name = 'UnsafeObjectInputError';
    this.path = path;
  }
}

const fail = (path, reason) => {
  throw new UnsafeObjectInputError(path, reason);
};

const normalizedPolicy = policy => {
  if (!policy || !['replace', 'concat'].includes(policy.array)) {
    fail('$policy.array', 'explicit replace or concat policy required');
  }
  return {
    array: policy.array,
    allowFunctions: policy.allowFunctions === true,
    maxDepth: Number.isInteger(policy.maxDepth) && policy.maxDepth >= 0 ? policy.maxDepth : 64
  };
};

const isPlainObject = value => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const dataEntries = (value, objectPath) => {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.getOwnPropertySymbols(value).length) {
    fail(objectPath, 'symbol properties are not supported');
  }
  return Object.keys(descriptors).filter(key => descriptors[key].enumerable).map(key => {
    if (RESERVED_KEYS.has(key)) {
      fail(`${objectPath}.${key}`, 'reserved key');
    }
    const descriptor = descriptors[key];
    if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      fail(`${objectPath}.${key}`, 'accessor property');
    }
    return [key, descriptor.value];
  });
};

const define = (target, key, value) => Object.defineProperty(target, key, {
  configurable: true, enumerable: true, value, writable: true
});

const clone = (value, policy, objectPath, depth, active) => {
  if (depth > policy.maxDepth) {
    fail(objectPath, `maximum depth ${policy.maxDepth} exceeded`);
  }
  if (value === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof value)) {
    return value;
  }
  if (typeof value === 'function' && policy.allowFunctions) {
    return value;
  }
  if (typeof value !== 'object') {
    fail(objectPath, `unsupported ${typeof value} value`);
  }
  if (active.has(value)) {
    fail(objectPath, 'cyclic reference');
  }
  if (!Array.isArray(value) && !isPlainObject(value)) {
    fail(objectPath, 'unsupported object prototype');
  }

  active.add(value);
  try {
    if (Array.isArray(value)) {
      const entries = dataEntries(value, objectPath);
      if (entries.some(([key]) => !ARRAY_INDEX.test(key))) {
        fail(objectPath, 'array contains a non-index enumerable property');
      }
      const output = [];
      entries.forEach(([key, item]) => define(output, key,
        clone(item, policy, `${objectPath}[${key}]`, depth + 1, active)));
      return output;
    }
    const output = {};
    dataEntries(value, objectPath).forEach(([key, item]) => define(output, key,
      clone(item, policy, `${objectPath}.${key}`, depth + 1, active)));
    return output;
  } finally {
    active.delete(value);
  }
};

const mergeValues = (base, override, policy, objectPath, depth) => {
  if (Array.isArray(base) && Array.isArray(override)) {
    const value = policy.array === 'concat' ? [...base, ...override] : override;
    return clone(value, policy, objectPath, depth, new WeakSet());
  }
  if (isPlainObject(base) && isPlainObject(override)) {
    const result = clone(base, policy, objectPath, depth, new WeakSet());
    for (const [key, value] of dataEntries(override, objectPath)) {
      const nextPath = `${objectPath}.${key}`;
      const next = Object.prototype.hasOwnProperty.call(result, key)
        ? mergeValues(result[key], value, policy, nextPath, depth + 1)
        : clone(value, policy, nextPath, depth + 1, new WeakSet());
      define(result, key, next);
    }
    return result;
  }
  return clone(override, policy, objectPath, depth, new WeakSet());
};

export const assertSafeObject = (value, suppliedPolicy) => {
  const policy = normalizedPolicy(suppliedPolicy);
  clone(value, policy, '$', 0, new WeakSet());
  return true;
};

export const safeMerge = (base, override, suppliedPolicy) => {
  const policy = normalizedPolicy(suppliedPolicy);
  clone(base, policy, '$base', 0, new WeakSet());
  clone(override, policy, '$override', 0, new WeakSet());
  return mergeValues(base, override, policy, '$', 0);
};

export const safeSetPath = (base, suppliedPath, value, suppliedPolicy) => {
  const policy = normalizedPolicy(suppliedPolicy);
  const segments = Array.isArray(suppliedPath) ? suppliedPath.slice() : String(suppliedPath).split('.');
  if (!segments.length || segments.some(segment => typeof segment !== 'string' || !segment)) {
    fail('$path', 'non-empty string segments required');
  }
  segments.forEach(segment => {
    if (RESERVED_KEYS.has(segment)) {
      fail(`$path.${segment}`, 'reserved key');
    }
  });
  let patch = clone(value, policy, '$value', 0, new WeakSet());
  for (let index = segments.length - 1; index >= 0; index--) {
    const parent = {};
    define(parent, segments[index], patch);
    patch = parent;
  }
  return safeMerge(base, patch, policy);
};
