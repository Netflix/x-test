import { XTestRoot } from './x-test-root.js';
import { XTestSuite } from './x-test-suite.js';

/**
* Simple assertion which throws exception when not "ok".
*   assert('foo' === 'bar', 'foo does not equal bar');
*/
export const assert = (ok, text) => XTestSuite.assert(suiteContext, ok, text);

/**
* Register coverage percentage goal for a given file.
*   coverage('../foo.js', 87);
*/
export const coverage = (href, goal) => XTestSuite.coverage(suiteContext, href, goal);

/**
* Force test suite registration to remain open until promise resolves.
*   const barsPromise = fetch('https://foo/api/v2/bars').then(response => response.json());
*   waitFor(barsPromise);
*/
export const waitFor = promise => XTestSuite.waitFor(suiteContext, promise);

/**
* Register a test to be run as a subsequent test suite.
*   test('./test-sibling.html');
*/
export const test = href => XTestSuite.test(suiteContext, href);

/**
* Register a grouping. Alternatively, mark with flags.
*/
export const describe = (text, callback) => XTestSuite.describe(suiteContext, text, callback);
describe.skip = (text, callback) => XTestSuite.describeSkip(suiteContext, text, callback);
describe.only = (text, callback) => XTestSuite.describeOnly(suiteContext, text, callback);
describe.todo = (text, callback) => XTestSuite.describeTodo(suiteContext, text, callback);

/**
* Register an individual test point. Alternatively, mark with flags.
*/
export const it = (text, callback, interval) => XTestSuite.it(suiteContext, text, callback, interval);
it.skip = (text, callback, interval) => XTestSuite.itSkip(suiteContext, text, callback, interval);
it.only = (text, callback, interval) => XTestSuite.itOnly(suiteContext, text, callback, interval);
it.todo = (text, callback, interval) => XTestSuite.itTodo(suiteContext, text, callback, interval);

// https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuid() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

// We need two channels since a messages on a channel are not reflected.
const publishChannel = new BroadcastChannel('x-test');
const subscribeChannel = new BroadcastChannel('x-test');

function publish(type, data) {
  publishChannel.postMessage({ type, data });
}

function subscribe(callback) {
  subscribeChannel.addEventListener('message', event => {
    callback({ data: event.data });
  });
}

function addErrorListener(callback) {
  addEventListener('error', callback);
}

function addUnhandledrejectionListener(callback) {
  addEventListener('unhandledrejection', callback);
}

async function timeout(interval) {
  return await new Promise(resolve => {
    setTimeout(() => { resolve(XTestSuite.timeout); }, interval);
  });
}

// There is one-and-only-one root. Either boot as root or child test.
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
