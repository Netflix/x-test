import { XTestCommon } from './x-test-common.js';
import { XTestRoot } from './x-test-root.js';
import { XTestFrame } from './x-test-frame.js';

// TODO: #67: Consider requiring explicit boolean conversion.
/**
 * Simple assertion which throws exception when not "ok".
 * @example
 *   assert('foo' === 'bar', 'foo does not equal bar');
 * @param {unknown} ok - The condition to assert (truthy/falsy)
 * @param {string} [text] - The assertion message
 * @returns {asserts ok} Throws if condition is falsy.
 */
export const assert = (ok, text) => XTestFrame.assert(suiteContext, ok, text);

/**
 * Strict deep-equality assertion. Supports primitives, plain objects, and arrays.
 * Throws (not an assertion failure) for unsupported types like Map/Set/Date/classes.
 * @example
 *   assert.deepEqual({ a: 1 }, { a: 1 });
 * @template T
 * @param {unknown} actual - The actual value
 * @param {T} expected - The expected value
 * @param {string} [text] - The assertion message
 * @returns {asserts actual is T} Throws if values are not deeply equal.
 */
assert.deepEqual = (actual, expected, text) => XTestFrame.deepEqual(suiteContext, actual, expected, text);

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
