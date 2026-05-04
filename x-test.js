import { XTestCommon } from './x-test-common.js';
import { XTestRoot } from './x-test-root.js';
import { XTestFrame } from './x-test-frame.js';

/**
 * Simple assertion which throws exception when value is not truthy.
 * @example
 *   assert('foo' === 'bar', 'foo does not equal bar');
 * @param {unknown} value - The condition to assert (truthy/falsy)
 * @param {string} [message] - The assertion message
 * @returns {asserts value} Throws if condition is falsy or arguments are invalid.
 */
export function assert(value, message) {
  switch (arguments.length) {
    case 0:
      throw new Error('expected value to assert, but got none');
    case 1:
      XTestFrame.assert(suiteContext, assert, value);
      break;
    case 2:
      if (typeof message !== 'string') {
        throw new Error(`unexpected message, expected string but got "${message}"`);
      }
      XTestFrame.assert(suiteContext, assert, value, message);
      break;
    default:
      throw new Error('unexpected extra arguments');
  }
}

/**
 * Strict deep-equality assertion. Supports primitives, plain objects, and
 * arrays. Throws (not an assertion failure) for unsupported types like Map,
 * Set, Date, and other classes.
 * @example
 *   assert.deepEqual({ a: 1 }, { a: 1 });
 * @template T
 * @param {unknown} actual - The actual value
 * @param {T} expected - The expected value
 * @param {string} [message] - The assertion message
 * @returns {asserts actual is T} Throws if values are not deeply equal or arguments are invalid.
 */
assert.deepEqual = function deepEqual(actual, expected, message) {
  switch (arguments.length) {
    case 0:
    case 1:
      throw new Error('expected actual and expected values, but got too few arguments');
    case 2:
      XTestFrame.deepEqual(suiteContext, assert.deepEqual, actual, expected);
      break;
    case 3:
      if (typeof message !== 'string') {
        throw new Error(`unexpected message, expected string but got "${message}"`);
      }
      XTestFrame.deepEqual(suiteContext, assert.deepEqual, actual, expected, message);
      break;
    default:
      throw new Error('unexpected extra arguments');
  }
};

/**
 * Asserts that a function throws, testing the thrown value against a RegExp via `String(thrown)`.
 * @example
 *   assert.throws(() => { throw new Error('boom'); }, /^Error: boom$/);
 *   assert.throws(() => { throw new Error('boom'); }, new RegExp('.*')); // match anything — just assert it throws
 * @param {() => void} fn - The function expected to throw
 * @param {RegExp} error - Tested against `String(thrown)`
 * @param {string} [message] - The assertion message
 * @returns {void} Throws if the function does not throw, the thrown value does not match, or arguments are invalid.
 */
assert.throws = function throws(fn, error, message) {
  switch (arguments.length) {
    case 0:
    case 1:
      throw new Error('expected fn and error arguments, but got too few arguments');
    case 2:
      if (!(fn instanceof Function)) {
        throw new Error(`unexpected fn, expected Function but got "${fn}"`);
      }
      if (!(error instanceof RegExp)) {
        throw new Error(`unexpected error, expected RegExp but got "${error}"`);
      }
      XTestFrame.throws(suiteContext, assert.throws, fn, error);
      break;
    case 3:
      if (!(fn instanceof Function)) {
        throw new Error(`unexpected fn, expected Function but got "${fn}"`);
      }
      if (!(error instanceof RegExp)) {
        throw new Error(`unexpected error, expected RegExp but got "${error}"`);
      }
      if (typeof message !== 'string') {
        throw new Error(`unexpected message, expected string but got "${message}"`);
      }
      XTestFrame.throws(suiteContext, assert.throws, fn, error, message);
      break;
    default:
      throw new Error('unexpected extra arguments');
  }
};

/**
 * Asserts that an async function rejects, testing the rejection against a RegExp via `String(thrown)`.
 * @example
 *   await assert.rejects(async () => { throw new Error('boom'); }, /^Error: boom$/);
 *   await assert.rejects(() => Promise.reject(new Error('boom')), new RegExp('.*')); // match anything — just assert it rejects
 * @param {() => Promise<unknown>} fn - The function expected to reject
 * @param {RegExp} error - Tested against `String(thrown)`
 * @param {string} [message] - The assertion message
 * @returns {Promise<void>} Rejects if the function does not reject, the rejection value does not match, or arguments are invalid.
 */
assert.rejects = function rejects(fn, error, message) {
  switch (arguments.length) {
    case 0:
    case 1:
      throw new Error('expected fn and error arguments, but got too few arguments');
    case 2:
      if (!(fn instanceof Function)) {
        throw new Error(`unexpected fn, expected Function but got "${fn}"`);
      }
      if (!(error instanceof RegExp)) {
        throw new Error(`unexpected error, expected RegExp but got "${error}"`);
      }
      return XTestFrame.rejects(suiteContext, assert.rejects, fn, error);
    case 3:
      if (!(fn instanceof Function)) {
        throw new Error(`unexpected fn, expected Function but got "${fn}"`);
      }
      if (!(error instanceof RegExp)) {
        throw new Error(`unexpected error, expected RegExp but got "${error}"`);
      }
      if (typeof message !== 'string') {
        throw new Error(`unexpected message, expected string but got "${message}"`);
      }
      return XTestFrame.rejects(suiteContext, assert.rejects, fn, error, message);
    default:
      throw new Error('unexpected extra arguments');
  }
};

/**
 * Load a new frame.
 * @example
 *   load('./test-sibling.html');
 * @param {string} href - The URL/path to the test file to run
 * @returns {void}
 */
export const load = href => XTestFrame.load(suiteContext, href);

/**
 * Register a grouping of tests. Alternatively, mark with flags (.skip, .only, .todo).
 * @param {string} text - The description of the test group
 * @param {() => void} callback - The callback function containing nested tests
 * @returns {void}
 */
export const suite = (text, callback) => XTestFrame.suite(suiteContext, text, callback);

/**
 * Register a test group that will be skipped during execution.
 * @param {string} text - The description of the test group
 * @param {() => void} callback - The callback function containing nested tests
 * @returns {void}
 */
suite.skip = (text, callback) => XTestFrame.suiteSkip(suiteContext, text, callback);

/**
 * Register a test group that will run exclusively (skips other non-only tests).
 * @param {string} text - The description of the test group
 * @param {() => void} callback - The callback function containing nested tests
 * @returns {void}
 */
suite.only = (text, callback) => XTestFrame.suiteOnly(suiteContext, text, callback);

/**
 * Register a placeholder test group for future implementation.
 * @param {string} text - The description of the test group
 * @param {() => void} callback - The callback function containing nested tests
 * @returns {void}
 */
suite.todo = (text, callback) => XTestFrame.suiteTodo(suiteContext, text, callback);

/**
 * Register an individual test case. Alternatively, mark with flags (.skip, .only, .todo).
 * @param {string} text - The description of the test case
 * @param {() => void | Promise<void>} callback - The test callback function
 * @param {number} [interval] - Optional timeout in milliseconds
 * @returns {void}
 */
export const test = (text, callback, interval) => XTestFrame.test(suiteContext, text, callback, interval);

/**
 * Register a test case that will be skipped during execution.
 * @param {string} text - The description of the test case
 * @param {() => void | Promise<void>} callback - The test callback function
 * @param {number} [interval] - Optional timeout in milliseconds
 * @returns {void}
 */
test.skip = (text, callback, interval) => XTestFrame.testSkip(suiteContext, text, callback, interval);

/**
 * Register a test case that will run exclusively (skips other non-only tests).
 * @param {string} text - The description of the test case
 * @param {() => void | Promise<void>} callback - The test callback function
 * @param {number} [interval] - Optional timeout in milliseconds
 * @returns {void}
 */
test.only = (text, callback, interval) => XTestFrame.testOnly(suiteContext, text, callback, interval);

/**
 * Register a placeholder test case for future implementation.
 * @param {string} text - The description of the test case
 * @param {() => void | Promise<void>} callback - The test callback function
 * @param {number} [interval] - Optional timeout in milliseconds
 * @returns {void}
 */
test.todo = (text, callback, interval) => XTestFrame.testTodo(suiteContext, text, callback, interval);

// https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
/**
 * @returns {string} A UUID string
 */
function uuid() {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    // eslint-disable-next-line no-bitwise
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

// We need two channels since a messages on a channel are not reflected.
const publishChannel = new BroadcastChannel('x-test');
const subscribeChannel = new BroadcastChannel('x-test');

/**
 * @param {unknown} type - The message type to publish
 * @param {unknown} data - The message data to publish
 * @returns {void}
 */
function publish(type, data) {
  publishChannel.postMessage({ type, data });
}

/**
 * @param {(event: {data: unknown}) => void} callback - The callback function to invoke on message events
 * @returns {void}
 */
function subscribe(callback) {
  subscribeChannel.addEventListener('message', event => {
    callback({ data: event.data });
  });
}

/**
 * @param {(event: ErrorEvent) => void} callback - The callback function to invoke on error events
 * @returns {void}
 */
function addErrorListener(callback) {
  addEventListener('error', callback);
}

/**
 * @param {(event: PromiseRejectionEvent) => void} callback - The callback function to invoke on unhandled rejection events
 * @returns {void}
 */
function addUnhandledrejectionListener(callback) {
  addEventListener('unhandledrejection', callback);
}

// There is one-and-only-one root. Either boot as root or child test.
/** @type {unknown} */
let suiteContext = null;
if (!frameElement?.getAttribute('data-x-test-frame-id')) {
  const state = {
    ended: false, children: [], stepIds: [], steps: {},
    frames: {}, suites: {}, tests: {}, reporter: null,
    filtering: false, queue: [], queueing: false,
  };
  const rootContext = {
    state, uuid, publish, subscribe, timeout: XTestCommon.timeout,
    iframeError: XTestCommon.iframeError, iframeLoad: XTestCommon.iframeLoad,
  };
  XTestRoot.initialize(rootContext, location.href);
} else {
  const state = {
    frameId: null, href: null, callbacks: {}, bailed: false,
    ready: false, parents: [],
  };
  const domContentLoadedPromise = XTestCommon.domContentLoadedPromise(document);
  suiteContext = {
    state, uuid, publish, subscribe, timeout: XTestCommon.timeout, addErrorListener,
    addUnhandledrejectionListener, domContentLoadedPromise,
  };
  XTestFrame.initialize(suiteContext, frameElement.getAttribute('data-x-test-frame-id'), location.href);
}
