import { test, suite, assert } from '../x-test.js';
import { XTestFrame } from '../x-test-frame.js';

// Dependency injection.
const getContext = () => {
  const state = {
    frameId: null,
    href: null,
    callbacks: {},
    bailed: false,
    ready: false,
    parents: [],
  };
  function publish(type, data) {
    publish.calls.push([...arguments]);
    for (const callback of subscribe.callbacks) {
      const event = new MessageEvent('message', { data: { type, data } });
      callback(event);
    }
  }
  function subscribe(callback) {
    subscribe.calls.push([...arguments]);
    subscribe.callbacks.push(callback);
  }
  async function timeout(interval) {
    timeout.calls.push([...arguments]);
    interval = interval ?? 30000;
    await new Promise((resolve, reject) => {
      setTimeout(() => { reject(new Error(`timeout after ${interval}ms`)); }, interval);
    });
  }
  function addErrorListener(callback) {
    addErrorListener.calls.push([...arguments]);
    addErrorListener.callbacks.push(callback);
  }
  function addUnhandledrejectionListener(callback) {
    addUnhandledrejectionListener.calls.push([...arguments]);
    addUnhandledrejectionListener.callbacks.push(callback);
  }
  function injectError(error) {
    injectError.calls.push([...arguments]);
    for (const callback of addErrorListener.callbacks) {
      const event = new ErrorEvent('error', { error });
      callback(event);
    }
  }
  function injectUnhandledrejection(reason) {
    injectUnhandledrejection.calls.push([...arguments]);
    for (const callback of addUnhandledrejectionListener.callbacks) {
      const promise = new Promise.reject(reason);
      const event = new PromiseRejectionEvent('unhandledrejection', { promise, reason });
      callback(event);
    }
  }
  const uuid = () => String(uuid.callCount++);
  uuid.callCount = 0;
  publish.calls = [];
  subscribe.calls = [];
  subscribe.callbacks = [];
  timeout.calls = [];
  timeout.callbacks = [];
  addErrorListener.calls = [];
  addErrorListener.callbacks = [];
  addUnhandledrejectionListener.calls = [];
  addUnhandledrejectionListener.callbacks = [];
  injectError.calls = [];
  injectUnhandledrejection.calls = [];
  const domContentLoadedPromise = Promise.resolve();
  const context = { state, uuid, publish, subscribe, timeout, addErrorListener, addUnhandledrejectionListener, domContentLoadedPromise };
  return { context, injectError, injectUnhandledrejection };
};

suite('initialize', () => {
  test('sets up default state and publishes when ready', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    assert(context.state.frameId === '123');
    assert(context.state.href === 'http://localhost:8080');
    assert(context.state.parents.length === 1);
    assert(context.state.parents[0].type === 'frame');
    assert(context.state.parents[0].frameId === '123');
    assert(context.addErrorListener.calls.length === 1);
    assert(context.addUnhandledrejectionListener.calls.length === 1);
    assert(context.state.ready === true);
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize');
    assert(context.publish.calls[0][1].frameId === '123');
    assert(context.publish.calls[1][0] === 'x-test-frame-ready');
    assert(context.publish.calls[1][1].frameId === '123');
  });

  test('marks state as bailed when any test bails', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    context.publish('x-test-frame-bail');
    assert(context.state.bailed === true);
  });

  test('runs a test when told, ok', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    let called = false;
    context.state.callbacks['testTestId'] = () => { called = true; };
    assert(called === false);
    context.publish('x-test-root-run', { testId: 'testTestId' });
    assert(called === false);
    await new Promise(resolve => setTimeout(resolve));
    assert(called === true);
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize'); // From initialization (sync).
    assert(context.publish.calls[1][0] === 'x-test-frame-ready'); // From initialization (async).
    assert(context.publish.calls[2][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[3][0] === 'x-test-frame-result');
    assert(context.publish.calls[3][1].testId === 'testTestId');
    assert(context.publish.calls[3][1].ok === true);
    assert(context.publish.calls[3][1].error === null);
  });

  test('runs a test when told, skip', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    let called = false;
    context.state.callbacks['testTestId'] = () => { called = true; };
    assert(called === false);
    context.publish('x-test-root-run', { testId: 'testTestId', directive: 'SKIP' });
    assert(called === false);
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize'); // From initialization (sync).
    assert(context.publish.calls[1][0] === 'x-test-frame-ready'); // From initialization (async).
    assert(context.publish.calls[2][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[3][0] === 'x-test-frame-result');
    assert(context.publish.calls[3][1].testId === 'testTestId');
    assert(context.publish.calls[3][1].ok === true);
    assert(context.publish.calls[3][1].error === null);
  });

  test('runs a test when told, not ok', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    let called = false;
    context.state.callbacks['testTestId'] = () => {
      called = true;
      throw new Error('test failure');
    };
    assert(called === false);
    context.publish('x-test-root-run', { testId: 'testTestId' });
    assert(called === false);
    await new Promise(resolve => setTimeout(resolve));
    assert(called === true);
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize'); // From initialization (sync).
    assert(context.publish.calls[1][0] === 'x-test-frame-ready'); // From initialization (async).
    assert(context.publish.calls[2][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[3][0] === 'x-test-frame-result');
    assert(context.publish.calls[3][1].testId === 'testTestId');
    assert(context.publish.calls[3][1].ok === false);
    assert(context.publish.calls[3][1].error.message === 'test failure');
  });

  test('runs a test when told, todo, ok', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    let called = false;
    context.state.callbacks['testTestId'] = () => { called = true; };
    assert(called === false);
    context.publish('x-test-root-run', { testId: 'testTestId', directive: 'TODO' });
    assert(called === false);
    await new Promise(resolve => setTimeout(resolve));
    assert(called === true);
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize'); // From initialization (sync).
    assert(context.publish.calls[1][0] === 'x-test-frame-ready'); // From initialization (async).
    assert(context.publish.calls[2][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[3][0] === 'x-test-frame-result');
    assert(context.publish.calls[3][1].testId === 'testTestId');
    assert(context.publish.calls[3][1].ok === true);
    assert(context.publish.calls[3][1].error === null);
  });

  test('runs a test when told, todo, not ok', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    let called = false;
    context.state.callbacks['testTestId'] = () => {
      called = true;
      throw new Error('test failure');
    };
    assert(called === false);
    context.publish('x-test-root-run', { testId: 'testTestId', directive: 'TODO' });
    assert(called === false);
    await new Promise(resolve => setTimeout(resolve));
    assert(called === true);
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize'); // From initialization (sync).
    assert(context.publish.calls[1][0] === 'x-test-frame-ready'); // From initialization (async).
    assert(context.publish.calls[2][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[3][0] === 'x-test-frame-result');
    assert(context.publish.calls[3][1].testId === 'testTestId');
    assert(context.publish.calls[3][1].ok === false);
    assert(context.publish.calls[3][1].error.message === 'test failure');
  });

  test('closes registration after it is ready', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize');
    assert(context.publish.calls[1][0] === 'x-test-frame-ready');
    XTestFrame.load(context, './test.html');
    XTestFrame.suite(context, 'nope', () => {});
    XTestFrame.test(context, 'nope', () => {});
    assert(context.publish.calls.length === 2); // doesn't get registered.
  });
});

suite('load', () => {
  test('publishes new test', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.href = 'http://localhost:8080';
    XTestFrame.load(context, './test.html');
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'frame');
    assert(context.publish.calls[0][1].frameId === '0');
    assert(context.publish.calls[0][1].initiatorFrameId === '123');
    assert(context.publish.calls[0][1].href === 'http://localhost:8080/test.html');
  });
});

suite('suite', () => {
  test('publishes new suite-start and suite-end', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {};
    XTestFrame.suite(context, 'description', callback);
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'suite-start');
    assert(context.publish.calls[0][1].suiteId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-frame-register');
    assert(context.publish.calls[1][1].type === 'suite-end');
    assert(context.publish.calls[1][1].suiteId === '0');
  });

  test('respects current suite for multi-level nesting', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }, { type: 'suite', suiteId: '999' }];
    const callback = () => {};
    XTestFrame.suite(context, 'description', callback);
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'suite-start');
    assert(context.publish.calls[0][1].suiteId === '0');
    assert(context.publish.calls[0][1].parents.length === 2);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].parents[1].type === 'suite');
    assert(context.publish.calls[0][1].parents[1].suiteId === '999');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-frame-register');
    assert(context.publish.calls[1][1].type === 'suite-end');
    assert(context.publish.calls[1][1].suiteId === '0');
  });

  test('publishes nested suite registered in callback', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {
      const innerCallback = () => {};
      XTestFrame.suite(context, 'inner-description', innerCallback);
    };
    XTestFrame.suite(context, 'description', callback);
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'suite-start');
    assert(context.publish.calls[0][1].suiteId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-frame-register');
    assert(context.publish.calls[1][1].type === 'suite-start');
    assert(context.publish.calls[1][1].suiteId === '1');
    assert(context.publish.calls[1][1].parents.length === 2);
    assert(context.publish.calls[1][1].parents[0].type === 'frame');
    assert(context.publish.calls[1][1].parents[0].frameId === '123');
    assert(context.publish.calls[1][1].parents[1].type === 'suite');
    assert(context.publish.calls[1][1].parents[1].suiteId === '0');
    assert(context.publish.calls[1][1].text === 'inner-description');

    assert(context.publish.calls[2][0] === 'x-test-frame-register');
    assert(context.publish.calls[2][1].type === 'suite-end');
    assert(context.publish.calls[2][1].suiteId === '1');

    assert(context.publish.calls[3][0] === 'x-test-frame-register');
    assert(context.publish.calls[3][1].type === 'suite-end');
    assert(context.publish.calls[3][1].suiteId === '0');
  });

  test('publishes nested test registered in callback', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {
      const innerCallback = () => {};
      XTestFrame.test(context, 'inner-description', innerCallback);
    };
    XTestFrame.suite(context, 'description', callback);
    assert(context.publish.calls.length === 3);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'suite-start');
    assert(context.publish.calls[0][1].suiteId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-frame-register');
    assert(context.publish.calls[1][1].type === 'test');
    assert(context.publish.calls[1][1].testId === '1');
    assert(context.publish.calls[1][1].parents.length === 2);
    assert(context.publish.calls[1][1].parents[0].type === 'frame');
    assert(context.publish.calls[1][1].parents[0].frameId === '123');
    assert(context.publish.calls[1][1].parents[1].type === 'suite');
    assert(context.publish.calls[1][1].parents[1].suiteId === '0');
    assert(context.publish.calls[1][1].text === 'inner-description');

    assert(context.publish.calls[2][0] === 'x-test-frame-register');
    assert(context.publish.calls[2][1].type === 'suite-end');
    assert(context.publish.calls[2][1].suiteId === '0');
  });

  test('bails for failures during suite callback', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => { throw new Error('test failure'); };
    XTestFrame.suite(context, 'description', callback);
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'suite-start');
    assert(context.publish.calls[0][1].suiteId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-frame-bail');
    assert(context.publish.calls[1][1].frameId === '123');
    assert(context.publish.calls[1][1].error.message === 'test failure');
  });


});

suite('test', () => {
  test('publishes new test', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {};
    XTestFrame.test(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'test');
    assert(context.publish.calls[0][1].testId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');
    assert(context.publish.calls[0][1].directive === null);
    assert(context.publish.calls[0][1].only === false);
    assert(context.publish.calls[0][1].interval === null);
  });

  let message = 'no error thrown';
  let passed = false;
  try {
    test('this will break', 'this is expected to fail');
  } catch (error) {
    message = error.message;
    passed = error.message === 'unexpected fn, expected Function but got "this is expected to fail"';
  }
  test('throws if "test" is not given a function as a callback', () => {
    assert(passed, message);
  });
});

suite('testSkip', () => {
  test('publishes new skip', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {};
    XTestFrame.testSkip(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'test');
    assert(context.publish.calls[0][1].testId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');
    assert(context.publish.calls[0][1].directive === 'SKIP');
    assert(context.publish.calls[0][1].only === false);
    assert(context.publish.calls[0][1].interval === null);
  });
});

suite('testTodo', () => {
  test('publishes new todo', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {};
    XTestFrame.testTodo(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'test');
    assert(context.publish.calls[0][1].testId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');
    assert(context.publish.calls[0][1].directive === 'TODO');
    assert(context.publish.calls[0][1].only === false);
    assert(context.publish.calls[0][1].interval === null);
  });
});

suite('testOnly', () => {
  test('publishes new only', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {};
    XTestFrame.testOnly(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'test');
    assert(context.publish.calls[0][1].testId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');
    assert(context.publish.calls[0][1].directive === null);
    assert(context.publish.calls[0][1].only === true);
    assert(context.publish.calls[0][1].interval === null);
  });
});

suite('assert', () => {
  const makeContext = () => ({ state: { bailed: false } });

  test('defaults message to "not ok"', () => {
    let message;
    try {
      XTestFrame.assert(makeContext(), null, false);
    } catch (error) {
      message = error.message;
    }
    assert(message === 'not ok');
  });
});

suite('deepEqual', () => {
  const makeContext = () => ({ state: { bailed: false } });
  const expectOk = (actual, expected) => {
    XTestFrame.deepEqual(makeContext(), null, actual, expected);
  };
  const expectNotEqual = (actual, expected) => {
    let message;
    try {
      XTestFrame.deepEqual(makeContext(), null, actual, expected, 'boom');
    } catch (error) {
      message = error.message;
    }
    assert(message === 'boom', `expected "boom", got ${JSON.stringify(message)}`);
  };
  const expectThrows = (actual, expected, matcher) => {
    let message;
    try {
      XTestFrame.deepEqual(makeContext(), null, actual, expected);
    } catch (error) {
      message = error.message;
    }
    assert(typeof message === 'string' && matcher.test(message), `got ${JSON.stringify(message)}`);
  };

  test('passes for equal primitives', () => {
    expectOk(1, 1);
    expectOk('a', 'a');
    expectOk(true, true);
    expectOk(null, null);
    expectOk(undefined, undefined);
    expectOk(NaN, NaN); // Object.is treats NaN as equal.
    expectOk(0n, 0n);
  });

  test('distinguishes +0 and -0', () => {
    expectNotEqual(0, -0);
  });

  test('fails for unequal primitives', () => {
    expectNotEqual(1, 2);
    expectNotEqual('a', 'b');
    expectNotEqual(true, false);
    expectNotEqual(null, undefined);
  });

  test('compares plain objects by own keys', () => {
    expectOk({ a: 1, b: 2 }, { b: 2, a: 1 });
    expectNotEqual({ a: 1 }, { a: 1, b: 2 });
    expectNotEqual({ a: 1 }, { a: 2 });
    expectNotEqual({ a: 1 }, { b: 1 });
  });

  test('compares arrays strictly by length and index', () => {
    expectOk([1, 2, 3], [1, 2, 3]);
    expectNotEqual([1, 2], [1, 2, 3]);
    expectNotEqual([1, 2, 3], [3, 2, 1]);
  });

  test('distinguishes sparse arrays from arrays with explicit undefined', () => {
    // eslint-disable-next-line no-sparse-arrays
    expectNotEqual([1,,3], [1, undefined, 3]);
  });

  test('compares named properties on arrays', () => {
    const a = Object.assign([1, 2], { foo: 'bar' });
    const b = [1, 2];
    expectNotEqual(a, b);
  });

  test('recurses into nested structures', () => {
    expectOk({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] });
    expectNotEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] });
  });

  test('supports null-prototype objects', () => {
    const a = Object.assign(Object.create(null), { x: 1 });
    const b = Object.assign(Object.create(null), { x: 1 });
    expectOk(a, b);
  });

  test('fails for mixed null-prototype vs Object.prototype', () => {
    expectNotEqual(Object.create(null), {});
    expectNotEqual({}, Object.create(null));
  });

  test('throws if either object has symbol-keyed properties', () => {
    const sym = Symbol('x');
    expectThrows({ [sym]: 1 }, {}, /deepEqual does not support symbol-keyed properties/);
    expectThrows({}, { [sym]: 1 }, /deepEqual does not support symbol-keyed properties/);
    expectThrows({ [sym]: 1 }, { [sym]: 1 }, /deepEqual does not support symbol-keyed properties/);
  });

  test('rejects mixed object vs array', () => {
    expectNotEqual({ 0: 'a', length: 1 }, ['a']);
  });

  test('throws for unsupported class instances', () => {
    expectThrows(new Map(), new Map(), /deepEqual only supports/);
    expectThrows(new Set(), new Set(), /deepEqual only supports/);
    expectThrows(new Date(0), new Date(0), /deepEqual only supports/);
    expectThrows(/a/, /a/, /deepEqual only supports/);
  });

  test('throws for functions', () => {
    expectThrows(() => {}, () => {}, /deepEqual only supports/);
  });

  test('uses custom message when provided', () => {
    let message;
    try {
      XTestFrame.deepEqual({ state: { bailed: false } }, null, { a: 1 }, { a: 2 }, 'custom');
    } catch (error) {
      message = error.message;
    }
    assert(message === 'custom');
  });

  test('defaults message to "not deep equal"', () => {
    let message;
    try {
      XTestFrame.deepEqual({ state: { bailed: false } }, null, 1, 2);
    } catch (error) {
      message = error.message;
    }
    assert(message === 'not deep equal');
  });

  test('is a no-op when context is bailed', () => {
    XTestFrame.deepEqual({ state: { bailed: true } }, null, 1, 2, 'should not throw');
  });
});

suite('throws', () => {
  const makeContext = () => ({ state: { bailed: false } });
  const expectFail = (fn) => {
    let message;
    try { fn(); } catch (error) { message = error.message; }
    return message;
  };

  test('fails when function does not throw', () => {
    const message = expectFail(() => XTestFrame.throws(makeContext(), null, () => {}, /foo/));
    assert(message === 'expected function to throw');
  });

  test('passes when RegExp matches', () => {
    XTestFrame.throws(makeContext(), null, () => { throw new Error('boom'); }, /boom/);
  });

  test('fails when RegExp does not match', () => {
    const message = expectFail(() => XTestFrame.throws(makeContext(), null, () => { throw new Error('boom'); }, /nope/));
    assert(message === 'expected thrown value to match "/nope/"');
  });

  test('uses custom message on failure', () => {
    const message = expectFail(() => XTestFrame.throws(makeContext(), null, () => {}, /foo/, 'custom'));
    assert(message === 'custom');
  });

  test('matches non-Error throws via String()', () => {
    XTestFrame.throws(makeContext(), null, () => { throw 2; }, /2/);
    XTestFrame.throws(makeContext(), null, () => { throw undefined; }, /undefined/);
  });

  test('is a no-op when context is bailed', () => {
    XTestFrame.throws({ state: { bailed: true } }, null, () => {}, /anything/, 'should not throw');
  });
});

suite('rejects', () => {
  const makeContext = () => ({ state: { bailed: false } });
  const expectFail = async (fn) => {
    let message;
    try { await fn(); } catch (error) { message = error.message; }
    return message;
  };

  test('fails when function does not reject', async () => {
    const message = await expectFail(() => XTestFrame.rejects(makeContext(), null, async () => {}, /foo/));
    assert(message === 'expected function to reject');
  });

  test('passes when RegExp matches', async () => {
    await XTestFrame.rejects(makeContext(), null, async () => { throw new Error('boom'); }, /boom/);
  });

  test('fails when RegExp does not match', async () => {
    const message = await expectFail(() => XTestFrame.rejects(makeContext(), null, async () => { throw new Error('boom'); }, /nope/));
    assert(message === 'expected rejection value to match "/nope/"');
  });

  test('uses custom message on failure', async () => {
    const message = await expectFail(() => XTestFrame.rejects(makeContext(), null, async () => {}, /foo/, 'custom'));
    assert(message === 'custom');
  });

  test('works with a function returning a rejected Promise', async () => {
    await XTestFrame.rejects(makeContext(), null, () => Promise.reject(new Error('boom')), /boom/);
  });

  test('is a no-op when context is bailed', async () => {
    await XTestFrame.rejects({ state: { bailed: true } }, null, async () => {}, /anything/, 'should not throw');
  });
});

suite('bail', () => {
  test('marks state as ended', () => {
    const error = new Error('error test');
    const { context } = getContext();
    assert(context.state.bailed === false);
    XTestFrame.bail(context, error);
    assert(context.state.bailed === true);
  });

  test('publishes to parent frame', () => {
    const error = new Error('error test');
    const { context } = getContext();
    context.state.frameId = '123';
    XTestFrame.bail(context, error);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-frame-bail');
    assert(context.publish.calls[0][1].frameId === '123');
    assert(context.publish.calls[0][1].error.message === 'error test');
  });
});

suite('error', () => {
  test('turns error into basic object', () => {
    const testError = new Error('error test');
    const error = XTestFrame.createError(testError);
    assert(error.message = testError.toString());
    assert(error.stack = testError.stack);
  });
  test('handles string errors', () => {
    const testError = 'error test';
    const error = XTestFrame.createError(testError);
    assert(error.message = testError.toString());
  });
});
