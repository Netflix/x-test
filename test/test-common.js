import { it, describe, assert } from '../x-test.js';
import { XTestCommon } from '../x-test-common.js';

// A minimal fake target that records handlers so tests can fire events
//  deterministically. The “domContentLoadedPromise” helper accepts any
//  EventTarget-like object — this is the dependency-injection surface.
const makeFakeTarget = (extra = {}) => {
  const handlers = {};
  return {
    handlers,
    addEventListener(type, handler) { handlers[type] = handler; },
    ...extra,
  };
};

describe('timeout', () => {
  it('resolves with XTestCommon.TIMEOUT after the interval', async () => {
    const result = await XTestCommon.timeout(1);
    assert(result === XTestCommon.TIMEOUT);
  });
});

describe('domContentLoadedPromise', () => {
  it('resolves immediately when readyState is "complete"', async () => {
    const fake = makeFakeTarget({ readyState: 'complete' });
    const result = await XTestCommon.domContentLoadedPromise(/** @type {Document} */ (fake));
    assert(result === undefined);
  });

  it('resolves on DOMContentLoaded when readyState is not "complete"', async () => {
    const fake = makeFakeTarget({ readyState: 'loading' });
    const promise = XTestCommon.domContentLoadedPromise(/** @type {Document} */ (fake));
    fake.handlers.DOMContentLoaded();
    const result = await promise;
    assert(result === undefined);
  });
});
