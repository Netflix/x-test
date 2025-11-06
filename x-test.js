import { XTestRoot } from './x-test-root.js';
import { XTestSuite } from './x-test-suite.js';

// TODO: #67: Consider requiring explicit boolean conversion.
/**
 * Simple assertion which throws exception when not "ok".
 * @example
 *   assert('foo' === 'bar', 'foo does not equal bar');
 * @param {unknown} ok - The condition to assert (truthy/falsy)
 * @param {string} [text] - The assertion message
 * @returns {void}
 */
export const assert = (ok, text) => XTestSuite.assert(suiteContext, ok, text);

/**
 * Register coverage percentage goal for a given file.
 * @example
 *   coverage('../foo.js', 87);
 * @param {string} href - The URL/path to the file to check coverage for
 * @param {number} goal - The coverage percentage goal (0-100)
 * @returns {void}
 */
export const coverage = (href, goal) => XTestSuite.coverage(suiteContext, href, goal);

/**
 * Force test suite registration to remain open until promise resolves.
 * @example
 *   const barsPromise = fetch('https://foo/api/v2/bars').then(response => response.json());
 *   waitFor(barsPromise);
 * @param {Promise<unknown>} promise - The promise to wait for before completing the test suite
 * @returns {Promise<void>}
 */
export const waitFor = promise => XTestSuite.waitFor(suiteContext, promise);

/**
 * Register a test to be run as a subsequent test suite.
 * @example
 *   test('./test-sibling.html');
 * @param {string} href - The URL/path to the test file to run
 * @returns {void}
 */
export const test = href => XTestSuite.test(suiteContext, href);

/**
 * Register a grouping of tests. Alternatively, mark with flags (.skip, .only, .todo).
 * @param {string} text - The description of the test group
 * @param {() => void} callback - The callback function containing nested tests
 * @returns {void}
 */
export const describe = (text, callback) => XTestSuite.describe(suiteContext, text, callback);

/**
 * Register a test group that will be skipped during execution.
 * @param {string} text - The description of the test group
 * @param {() => void} callback - The callback function containing nested tests
 * @returns {void}
 */
describe.skip = (text, callback) => XTestSuite.describeSkip(suiteContext, text, callback);

/**
 * Register a test group that will run exclusively (skips other non-only tests).
 * @param {string} text - The description of the test group
 * @param {() => void} callback - The callback function containing nested tests
 * @returns {void}
 */
describe.only = (text, callback) => XTestSuite.describeOnly(suiteContext, text, callback);

/**
 * Register a placeholder test group for future implementation.
 * @param {string} text - The description of the test group
 * @param {() => void} callback - The callback function containing nested tests
 * @returns {void}
 */
describe.todo = (text, callback) => XTestSuite.describeTodo(suiteContext, text, callback);

/**
 * Register an individual test case. Alternatively, mark with flags (.skip, .only, .todo).
 * @param {string} text - The description of the test case
 * @param {() => void | Promise<void>} callback - The test callback function
 * @param {number} [interval] - Optional timeout in milliseconds
 * @returns {void}
 */
export const it = (text, callback, interval) => XTestSuite.it(suiteContext, text, callback, interval);

/**
 * Register a test case that will be skipped during execution.
 * @param {string} text - The description of the test case
 * @param {() => void | Promise<void>} callback - The test callback function
 * @param {number} [interval] - Optional timeout in milliseconds
 * @returns {void}
 */
it.skip = (text, callback, interval) => XTestSuite.itSkip(suiteContext, text, callback, interval);

/**
 * Register a test case that will run exclusively (skips other non-only tests).
 * @param {string} text - The description of the test case
 * @param {() => void | Promise<void>} callback - The test callback function
 * @param {number} [interval] - Optional timeout in milliseconds
 * @returns {void}
 */
it.only = (text, callback, interval) => XTestSuite.itOnly(suiteContext, text, callback, interval);

/**
 * Register a placeholder test case for future implementation.
 * @param {string} text - The description of the test case
 * @param {() => void | Promise<void>} callback - The test callback function
 * @param {number} [interval] - Optional timeout in milliseconds
 * @returns {void}
 */
it.todo = (text, callback, interval) => XTestSuite.itTodo(suiteContext, text, callback, interval);

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

/**
 * @param {number} interval - The timeout duration in milliseconds
 * @returns {Promise<symbol>} Promise resolving to timeout symbol
 */
async function timeout(interval) {
  return await new Promise(resolve => {
    setTimeout(() => { resolve(XTestSuite.timeout); }, interval);
  });
}

// There is one-and-only-one root. Either boot as root or child test.
/** @type {unknown} */
let suiteContext = null;
if (!frameElement?.getAttribute('data-x-test-test-id')) {
  const state = {
    ended: false, waiting: false, children: [], stepIds: [], steps: {},
    tests: {}, describes: {}, its: {}, coverage: false, coverages: {},
    resolveCoverageValuePromise: null, coverageValuePromise: null,
    coverageValue: null, reporter: null, filtering: false, queue: [],
    queueing: false,
  };
  const rootContext = { state, uuid, publish, subscribe, timeout };
  XTestRoot.initialize(rootContext, location.href);
} else {
  const state = {
    testId: null, href: null, callbacks: {}, bailed: false, waitForId: null,
    ready: false, promises: [], parents: [],
  };
  suiteContext = {
    state, uuid, publish, subscribe, timeout, addErrorListener,
    addUnhandledrejectionListener,
  };
  XTestSuite.initialize(suiteContext, frameElement.getAttribute('data-x-test-test-id'), location.href);
}
