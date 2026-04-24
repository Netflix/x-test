import { it, describe, assert } from '../x-test.js';
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

describe('initialize', () => {
  it('sets up default state and publishes when ready', async () => {
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

  it('marks state as bailed when any test bails', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    context.publish('x-test-frame-bail');
    assert(context.state.bailed === true);
  });

  it('runs a test when told, ok', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    let called = false;
    context.state.callbacks['testItId'] = () => { called = true; };
    assert(called === false);
    context.publish('x-test-root-run', { itId: 'testItId' });
    assert(called === true);
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize'); // From initialization (sync).
    assert(context.publish.calls[1][0] === 'x-test-frame-ready'); // From initialization (async).
    assert(context.publish.calls[2][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[3][0] === 'x-test-frame-result');
    assert(context.publish.calls[3][1].itId === 'testItId');
    assert(context.publish.calls[3][1].ok === true);
    assert(context.publish.calls[3][1].error === null);
  });

  it('runs a test when told, skip', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    let called = false;
    context.state.callbacks['testItId'] = () => { called = true; };
    assert(called === false);
    context.publish('x-test-root-run', { itId: 'testItId', directive: 'SKIP' });
    assert(called === false);
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize'); // From initialization (sync).
    assert(context.publish.calls[1][0] === 'x-test-frame-ready'); // From initialization (async).
    assert(context.publish.calls[2][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[3][0] === 'x-test-frame-result');
    assert(context.publish.calls[3][1].itId === 'testItId');
    assert(context.publish.calls[3][1].ok === true);
    assert(context.publish.calls[3][1].error === null);
  });

  it('runs a test when told, not ok', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    let called = false;
    context.state.callbacks['testItId'] = () => {
      called = true;
      throw new Error('test failure');
    };
    assert(called === false);
    context.publish('x-test-root-run', { itId: 'testItId' });
    assert(called === true);
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize'); // From initialization (sync).
    assert(context.publish.calls[1][0] === 'x-test-frame-ready'); // From initialization (async).
    assert(context.publish.calls[2][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[3][0] === 'x-test-frame-result');
    assert(context.publish.calls[3][1].itId === 'testItId');
    assert(context.publish.calls[3][1].ok === false);
    assert(context.publish.calls[3][1].error.message === 'test failure');
  });

  it('runs a test when told, todo, ok', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    let called = false;
    context.state.callbacks['testItId'] = () => { called = true; };
    assert(called === false);
    context.publish('x-test-root-run', { itId: 'testItId', directive: 'TODO' });
    assert(called === true);
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize'); // From initialization (sync).
    assert(context.publish.calls[1][0] === 'x-test-frame-ready'); // From initialization (async).
    assert(context.publish.calls[2][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[3][0] === 'x-test-frame-result');
    assert(context.publish.calls[3][1].itId === 'testItId');
    assert(context.publish.calls[3][1].ok === true);
    assert(context.publish.calls[3][1].error === null);
  });

  it('runs a test when told, todo, not ok', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    let called = false;
    context.state.callbacks['testItId'] = () => {
      called = true;
      throw new Error('test failure');
    };
    assert(called === false);
    context.publish('x-test-root-run', { itId: 'testItId', directive: 'TODO' });
    assert(called === true);
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize'); // From initialization (sync).
    assert(context.publish.calls[1][0] === 'x-test-frame-ready'); // From initialization (async).
    assert(context.publish.calls[2][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[3][0] === 'x-test-frame-result');
    assert(context.publish.calls[3][1].itId === 'testItId');
    assert(context.publish.calls[3][1].ok === false);
    assert(context.publish.calls[3][1].error.message === 'test failure');
  });

  it('closes registration after it is ready', async () => {
    const { context } = getContext();
    await XTestFrame.initialize(context, '123', 'http://localhost:8080');
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-frame-initialize');
    assert(context.publish.calls[1][0] === 'x-test-frame-ready');
    XTestFrame.load(context, './test.html');
    XTestFrame.describe(context, 'nope', () => {});
    XTestFrame.it(context, 'nope', () => {});
    assert(context.publish.calls.length === 2); // doesn't get registered.
  });
});

describe('load', () => {
  it('publishes new test', () => {
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

describe('describe', () => {
  it('publishes new describe-start and describe-end', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {};
    XTestFrame.describe(context, 'description', callback);
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'describe-start');
    assert(context.publish.calls[0][1].describeId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-frame-register');
    assert(context.publish.calls[1][1].type === 'describe-end');
    assert(context.publish.calls[1][1].describeId === '0');
  });

  it('respects current describe for multi-level nesting', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }, { type: 'describe', describeId: '999' }];
    const callback = () => {};
    XTestFrame.describe(context, 'description', callback);
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'describe-start');
    assert(context.publish.calls[0][1].describeId === '0');
    assert(context.publish.calls[0][1].parents.length === 2);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].parents[1].type === 'describe');
    assert(context.publish.calls[0][1].parents[1].describeId === '999');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-frame-register');
    assert(context.publish.calls[1][1].type === 'describe-end');
    assert(context.publish.calls[1][1].describeId === '0');
  });

  it('publishes nested describe registered in callback', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {
      const innerCallback = () => {};
      XTestFrame.describe(context, 'inner-description', innerCallback);
    };
    XTestFrame.describe(context, 'description', callback);
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'describe-start');
    assert(context.publish.calls[0][1].describeId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-frame-register');
    assert(context.publish.calls[1][1].type === 'describe-start');
    assert(context.publish.calls[1][1].describeId === '1');
    assert(context.publish.calls[1][1].parents.length === 2);
    assert(context.publish.calls[1][1].parents[0].type === 'frame');
    assert(context.publish.calls[1][1].parents[0].frameId === '123');
    assert(context.publish.calls[1][1].parents[1].type === 'describe');
    assert(context.publish.calls[1][1].parents[1].describeId === '0');
    assert(context.publish.calls[1][1].text === 'inner-description');

    assert(context.publish.calls[2][0] === 'x-test-frame-register');
    assert(context.publish.calls[2][1].type === 'describe-end');
    assert(context.publish.calls[2][1].describeId === '1');

    assert(context.publish.calls[3][0] === 'x-test-frame-register');
    assert(context.publish.calls[3][1].type === 'describe-end');
    assert(context.publish.calls[3][1].describeId === '0');
  });

  it('publishes nested it registered in callback', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {
      const innerCallback = () => {};
      XTestFrame.it(context, 'inner-description', innerCallback);
    };
    XTestFrame.describe(context, 'description', callback);
    assert(context.publish.calls.length === 3);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'describe-start');
    assert(context.publish.calls[0][1].describeId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-frame-register');
    assert(context.publish.calls[1][1].type === 'it');
    assert(context.publish.calls[1][1].itId === '1');
    assert(context.publish.calls[1][1].parents.length === 2);
    assert(context.publish.calls[1][1].parents[0].type === 'frame');
    assert(context.publish.calls[1][1].parents[0].frameId === '123');
    assert(context.publish.calls[1][1].parents[1].type === 'describe');
    assert(context.publish.calls[1][1].parents[1].describeId === '0');
    assert(context.publish.calls[1][1].text === 'inner-description');

    assert(context.publish.calls[2][0] === 'x-test-frame-register');
    assert(context.publish.calls[2][1].type === 'describe-end');
    assert(context.publish.calls[2][1].describeId === '0');
  });

  it('bails for failures during describe callback', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => { throw new Error('test failure'); };
    XTestFrame.describe(context, 'description', callback);
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'describe-start');
    assert(context.publish.calls[0][1].describeId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-frame-bail');
    assert(context.publish.calls[1][1].frameId === '123');
    assert(context.publish.calls[1][1].error.message === 'test failure');
  });

  it('throws if callback is not a function', () => {
    const { context } = getContext();
    const callback = null;
    const expected = 'Unexpected callback value "null".';
    let actual;
    try {
      XTestFrame.describe(context, 'description', callback);
    } catch (error) {
      actual = error.message;
    }
    assert(context.publish.calls.length === 0);
    assert(actual === expected, actual);
  });
});

describe('it', () => {
  it('publishes new it', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {};
    XTestFrame.it(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'it');
    assert(context.publish.calls[0][1].itId === '0');
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
    it('this will break', 'this is expected to fail');
  } catch (error) {
    message = error.message;
    passed = error.message === 'Unexpected callback value "this is expected to fail".';
  }
  it('throws if “it” is not given a function as a callback', () => {
    assert(passed, message);
  });
});

describe('itSkip', () => {
  it('publishes new skip', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {};
    XTestFrame.itSkip(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'it');
    assert(context.publish.calls[0][1].itId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');
    assert(context.publish.calls[0][1].directive === 'SKIP');
    assert(context.publish.calls[0][1].only === false);
    assert(context.publish.calls[0][1].interval === null);
  });
});

describe('itTodo', () => {
  it('publishes new todo', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {};
    XTestFrame.itTodo(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'it');
    assert(context.publish.calls[0][1].itId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');
    assert(context.publish.calls[0][1].directive === 'TODO');
    assert(context.publish.calls[0][1].only === false);
    assert(context.publish.calls[0][1].interval === null);
  });
});

describe('itOnly', () => {
  it('publishes new only', () => {
    const { context } = getContext();
    context.state.frameId = '123';
    context.state.parents = [{ type: 'frame', frameId: '123' }];
    const callback = () => {};
    XTestFrame.itOnly(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-frame-register');
    assert(context.publish.calls[0][1].type === 'it');
    assert(context.publish.calls[0][1].itId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'frame');
    assert(context.publish.calls[0][1].parents[0].frameId === '123');
    assert(context.publish.calls[0][1].text === 'description');
    assert(context.publish.calls[0][1].directive === null);
    assert(context.publish.calls[0][1].only === true);
    assert(context.publish.calls[0][1].interval === null);
  });
});

describe('assert', () => {
  const makeContext = () => ({ state: { bailed: false } });

  it('defaults message to "not ok"', () => {
    let message;
    try {
      XTestFrame.assert(makeContext(), false);
    } catch (error) {
      message = error.message;
    }
    assert(message === 'not ok');
  });
});

describe('deepEqual', () => {
  const makeContext = () => ({ state: { bailed: false } });
  const expectOk = (actual, expected) => {
    XTestFrame.deepEqual(makeContext(), actual, expected);
  };
  const expectNotEqual = (actual, expected) => {
    let message;
    try {
      XTestFrame.deepEqual(makeContext(), actual, expected, 'boom');
    } catch (error) {
      message = error.message;
    }
    assert(message === 'boom', `expected "boom", got ${JSON.stringify(message)}`);
  };
  const expectThrows = (actual, expected, matcher) => {
    let message;
    try {
      XTestFrame.deepEqual(makeContext(), actual, expected);
    } catch (error) {
      message = error.message;
    }
    assert(typeof message === 'string' && matcher.test(message), `got ${JSON.stringify(message)}`);
  };

  it('passes for equal primitives', () => {
    expectOk(1, 1);
    expectOk('a', 'a');
    expectOk(true, true);
    expectOk(null, null);
    expectOk(undefined, undefined);
    expectOk(NaN, NaN); // Object.is treats NaN as equal.
    expectOk(0n, 0n);
  });

  it('distinguishes +0 and -0', () => {
    expectNotEqual(0, -0);
  });

  it('fails for unequal primitives', () => {
    expectNotEqual(1, 2);
    expectNotEqual('a', 'b');
    expectNotEqual(true, false);
    expectNotEqual(null, undefined);
  });

  it('compares plain objects by own keys', () => {
    expectOk({ a: 1, b: 2 }, { b: 2, a: 1 });
    expectNotEqual({ a: 1 }, { a: 1, b: 2 });
    expectNotEqual({ a: 1 }, { a: 2 });
    expectNotEqual({ a: 1 }, { b: 1 });
  });

  it('compares arrays strictly by length and index', () => {
    expectOk([1, 2, 3], [1, 2, 3]);
    expectNotEqual([1, 2], [1, 2, 3]);
    expectNotEqual([1, 2, 3], [3, 2, 1]);
  });

  it('distinguishes sparse arrays from arrays with explicit undefined', () => {
    // eslint-disable-next-line no-sparse-arrays
    expectNotEqual([1,,3], [1, undefined, 3]);
  });

  it('compares named properties on arrays', () => {
    const a = Object.assign([1, 2], { foo: 'bar' });
    const b = [1, 2];
    expectNotEqual(a, b);
  });

  it('recurses into nested structures', () => {
    expectOk({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] });
    expectNotEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] });
  });

  it('supports null-prototype objects', () => {
    const a = Object.assign(Object.create(null), { x: 1 });
    const b = Object.assign(Object.create(null), { x: 1 });
    expectOk(a, b);
  });

  it('fails for mixed null-prototype vs Object.prototype', () => {
    expectNotEqual(Object.create(null), {});
    expectNotEqual({}, Object.create(null));
  });

  it('throws if either object has symbol-keyed properties', () => {
    const sym = Symbol('x');
    expectThrows({ [sym]: 1 }, {}, /deepEqual does not support symbol-keyed properties/);
    expectThrows({}, { [sym]: 1 }, /deepEqual does not support symbol-keyed properties/);
    expectThrows({ [sym]: 1 }, { [sym]: 1 }, /deepEqual does not support symbol-keyed properties/);
  });

  it('rejects mixed object vs array', () => {
    expectNotEqual({ 0: 'a', length: 1 }, ['a']);
  });

  it('throws for unsupported class instances', () => {
    expectThrows(new Map(), new Map(), /deepEqual only supports/);
    expectThrows(new Set(), new Set(), /deepEqual only supports/);
    expectThrows(new Date(0), new Date(0), /deepEqual only supports/);
    expectThrows(/a/, /a/, /deepEqual only supports/);
  });

  it('throws for functions', () => {
    expectThrows(() => {}, () => {}, /deepEqual only supports/);
  });

  it('uses custom message when provided', () => {
    let message;
    try {
      XTestFrame.deepEqual({ state: { bailed: false } }, { a: 1 }, { a: 2 }, 'custom');
    } catch (error) {
      message = error.message;
    }
    assert(message === 'custom');
  });

  it('defaults message to "not deep equal"', () => {
    let message;
    try {
      XTestFrame.deepEqual({ state: { bailed: false } }, 1, 2);
    } catch (error) {
      message = error.message;
    }
    assert(message === 'not deep equal');
  });

  it('is a no-op when context is bailed', () => {
    XTestFrame.deepEqual({ state: { bailed: true } }, 1, 2, 'should not throw');
  });
});

describe('bail', () => {
  it('marks state as ended', () => {
    const error = new Error('error test');
    const { context } = getContext();
    assert(context.state.bailed === false);
    XTestFrame.bail(context, error);
    assert(context.state.bailed === true);
  });

  it('publishes to parent frame', () => {
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

describe('error', () => {
  it('turns error into basic object', () => {
    const testError = new Error('error test');
    const error = XTestFrame.createError(testError);
    assert(error.message = testError.toString());
    assert(error.stack = testError.stack);
  });
  it('handles string errors', () => {
    const testError = 'error test';
    const error = XTestFrame.createError(testError);
    assert(error.message = testError.toString());
  });
});
