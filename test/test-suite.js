import { it, describe, assert, __XTestSuite__ } from '../x-test.js';

// Dependency injection.
const getContext = () => {
  const state = {
    testId: null,
    href: null,
    callbacks: {},
    bailed: false,
    waitForId: null,
    ready: false,
    promises: [],
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
  const context = { state, uuid, publish, subscribe, timeout, addErrorListener, addUnhandledrejectionListener };
  return { context, injectError, injectUnhandledrejection };
};

describe('initialize', () => {
  it('sets up default state and publishes when ready', async () => {
    const { context } = getContext();
    __XTestSuite__.initialize(context, '123', 'http://localhost:8080');
    assert(context.state.testId === '123');
    assert(context.state.href === 'http://localhost:8080');
    assert(context.state.parents.length === 1);
    assert(context.state.parents[0].type === 'test');
    assert(context.state.parents[0].testId === '123');
    assert(context.addErrorListener.calls.length === 1);
    assert(context.addUnhandledrejectionListener.calls.length === 1);
    assert(context.publish.calls.length === 0);
    assert(context.state.waitForId === '0');
    assert(context.state.promises.length === 1);
    assert(context.state.ready === false);
    await Promise.all(context.state.promises);
    assert(context.state.ready === true);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-suite-ready');
    assert(context.publish.calls[0][1].testId === '123');
  });

  it('marks state as bailed when any test bails', async () => {
    const { context } = getContext();
    __XTestSuite__.initialize(context, '123', 'http://localhost:8080');
    await Promise.all(context.state.promises);
    context.publish('x-test-suite-bail');
    assert(context.state.bailed === true);
  });

  it('runs a test when told, ok', async () => {
    const { context } = getContext();
    __XTestSuite__.initialize(context, '123', 'http://localhost:8080');
    await Promise.all(context.state.promises);
    let called = false;
    context.state.callbacks['testItId'] = () => { called = true; };
    assert(called === false);
    context.publish('x-test-root-run', { itId: 'testItId' });
    assert(called === true);
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 3);
    assert(context.publish.calls[0][0] === 'x-test-suite-ready'); // This is from initialization.
    assert(context.publish.calls[1][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[2][0] === 'x-test-suite-result');
    assert(context.publish.calls[2][1].itId === 'testItId');
    assert(context.publish.calls[2][1].ok === true);
    assert(context.publish.calls[2][1].error === null);
  });

  it('runs a test when told, skip', async () => {
    const { context } = getContext();
    __XTestSuite__.initialize(context, '123', 'http://localhost:8080');
    await Promise.all(context.state.promises);
    let called = false;
    context.state.callbacks['testItId'] = () => { called = true; };
    assert(called === false);
    context.publish('x-test-root-run', { itId: 'testItId', directive: 'SKIP' });
    assert(called === false);
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 3);
    assert(context.publish.calls[0][0] === 'x-test-suite-ready'); // This is from initialization.
    assert(context.publish.calls[1][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[2][0] === 'x-test-suite-result');
    assert(context.publish.calls[2][1].itId === 'testItId');
    assert(context.publish.calls[2][1].ok === true);
    assert(context.publish.calls[2][1].error === null);
  });

  it('runs a test when told, not ok', async () => {
    const { context } = getContext();
    __XTestSuite__.initialize(context, '123', 'http://localhost:8080');
    await Promise.all(context.state.promises);
    let called = false;
    context.state.callbacks['testItId'] = () => {
      called = true;
      throw new Error('test failure');
    };
    assert(called === false);
    context.publish('x-test-root-run', { itId: 'testItId' });
    assert(called === true);
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 3);
    assert(context.publish.calls[0][0] === 'x-test-suite-ready'); // This is from initialization.
    assert(context.publish.calls[1][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[2][0] === 'x-test-suite-result');
    assert(context.publish.calls[2][1].itId === 'testItId');
    assert(context.publish.calls[2][1].ok === false);
    assert(context.publish.calls[2][1].error.message === 'test failure');
  });

  it('runs a test when told, todo, ok', async () => {
    const { context } = getContext();
    __XTestSuite__.initialize(context, '123', 'http://localhost:8080');
    await Promise.all(context.state.promises);
    let called = false;
    context.state.callbacks['testItId'] = () => { called = true; };
    assert(called === false);
    context.publish('x-test-root-run', { itId: 'testItId', directive: 'TODO' });
    assert(called === true);
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 3);
    assert(context.publish.calls[0][0] === 'x-test-suite-ready'); // This is from initialization.
    assert(context.publish.calls[1][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[2][0] === 'x-test-suite-result');
    assert(context.publish.calls[2][1].itId === 'testItId');
    assert(context.publish.calls[2][1].ok === true);
    assert(context.publish.calls[2][1].error === null);
  });

  it('runs a test when told, todo, not ok', async () => {
    const { context } = getContext();
    __XTestSuite__.initialize(context, '123', 'http://localhost:8080');
    await Promise.all(context.state.promises);
    let called = false;
    context.state.callbacks['testItId'] = () => {
      called = true;
      throw new Error('test failure');
    };
    assert(called === false);
    context.publish('x-test-root-run', { itId: 'testItId', directive: 'TODO' });
    assert(called === true);
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 3);
    assert(context.publish.calls[0][0] === 'x-test-suite-ready'); // This is from initialization.
    assert(context.publish.calls[1][0] === 'x-test-root-run'); // This is from our test.
    assert(context.publish.calls[2][0] === 'x-test-suite-result');
    assert(context.publish.calls[2][1].itId === 'testItId');
    assert(context.publish.calls[2][1].ok === false);
    assert(context.publish.calls[2][1].error.message === 'test failure');
  });

  it('closes registration after it is ready', async () => {
    const { context } = getContext();
    __XTestSuite__.initialize(context, '123', 'http://localhost:8080');
    await Promise.all(context.state.promises);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-suite-ready');
    __XTestSuite__.test(context, './test.html');
    __XTestSuite__.describe(context, 'nope', () => {});
    __XTestSuite__.it(context, 'nope', () => {});
    assert(context.publish.calls.length === 1); // doesn't get registered.
  });
});

describe('test', () => {
  it('publishes new test', () => {
    const { context } = getContext();
    context.state.testId = '123';
    context.state.href = 'http://localhost:8080';
    __XTestSuite__.test(context, './test.html');
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-suite-register');
    assert(context.publish.calls[0][1].type === 'test');
    assert(context.publish.calls[0][1].testId === '0');
    assert(context.publish.calls[0][1].initiatorTestId === '123');
    assert(context.publish.calls[0][1].href === 'http://localhost:8080/test.html');
  });
});

describe('describe', () => {
  it('publishes new describe-start and describe-end', () => {
    const { context } = getContext();
    context.state.testId = '123';
    context.state.parents = [{ type: 'test', testId: '123' }];
    const callback = () => {};
    __XTestSuite__.describe(context, 'description', callback);
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-suite-register');
    assert(context.publish.calls[0][1].type === 'describe-start');
    assert(context.publish.calls[0][1].describeId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'test');
    assert(context.publish.calls[0][1].parents[0].testId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-suite-register');
    assert(context.publish.calls[1][1].type === 'describe-end');
    assert(context.publish.calls[1][1].describeId === '0');
  });

  it('respects current describe for multi-level nesting', () => {
    const { context } = getContext();
    context.state.testId = '123';
    context.state.parents = [{ type: 'test', testId: '123' }, { type: 'describe', describeId: '999' }];
    const callback = () => {};
    __XTestSuite__.describe(context, 'description', callback);
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-suite-register');
    assert(context.publish.calls[0][1].type === 'describe-start');
    assert(context.publish.calls[0][1].describeId === '0');
    assert(context.publish.calls[0][1].parents.length === 2);
    assert(context.publish.calls[0][1].parents[0].type === 'test');
    assert(context.publish.calls[0][1].parents[0].testId === '123');
    assert(context.publish.calls[0][1].parents[1].type === 'describe');
    assert(context.publish.calls[0][1].parents[1].describeId === '999');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-suite-register');
    assert(context.publish.calls[1][1].type === 'describe-end');
    assert(context.publish.calls[1][1].describeId === '0');
  });

  it('publishes nested describe registered in callback', () => {
    const { context } = getContext();
    context.state.testId = '123';
    context.state.parents = [{ type: 'test', testId: '123' }];
    const callback = () => {
      const innerCallback = () => {};
      __XTestSuite__.describe(context, 'inner-description', innerCallback);
    };
    __XTestSuite__.describe(context, 'description', callback);
    assert(context.publish.calls.length === 4);
    assert(context.publish.calls[0][0] === 'x-test-suite-register');
    assert(context.publish.calls[0][1].type === 'describe-start');
    assert(context.publish.calls[0][1].describeId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'test');
    assert(context.publish.calls[0][1].parents[0].testId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-suite-register');
    assert(context.publish.calls[1][1].type === 'describe-start');
    assert(context.publish.calls[1][1].describeId === '1');
    assert(context.publish.calls[1][1].parents.length === 2);
    assert(context.publish.calls[1][1].parents[0].type === 'test');
    assert(context.publish.calls[1][1].parents[0].testId === '123');
    assert(context.publish.calls[1][1].parents[1].type === 'describe');
    assert(context.publish.calls[1][1].parents[1].describeId === '0');
    assert(context.publish.calls[1][1].text === 'inner-description');

    assert(context.publish.calls[2][0] === 'x-test-suite-register');
    assert(context.publish.calls[2][1].type === 'describe-end');
    assert(context.publish.calls[2][1].describeId === '1');

    assert(context.publish.calls[3][0] === 'x-test-suite-register');
    assert(context.publish.calls[3][1].type === 'describe-end');
    assert(context.publish.calls[3][1].describeId === '0');
  });

  it('publishes nested it registered in callback', () => {
    const { context } = getContext();
    context.state.testId = '123';
    context.state.parents = [{ type: 'test', testId: '123' }];
    const callback = () => {
      const innerCallback = () => {};
      __XTestSuite__.it(context, 'inner-description', innerCallback);
    };
    __XTestSuite__.describe(context, 'description', callback);
    assert(context.publish.calls.length === 3);
    assert(context.publish.calls[0][0] === 'x-test-suite-register');
    assert(context.publish.calls[0][1].type === 'describe-start');
    assert(context.publish.calls[0][1].describeId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'test');
    assert(context.publish.calls[0][1].parents[0].testId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-suite-register');
    assert(context.publish.calls[1][1].type === 'it');
    assert(context.publish.calls[1][1].itId === '1');
    assert(context.publish.calls[1][1].parents.length === 2);
    assert(context.publish.calls[1][1].parents[0].type === 'test');
    assert(context.publish.calls[1][1].parents[0].testId === '123');
    assert(context.publish.calls[1][1].parents[1].type === 'describe');
    assert(context.publish.calls[1][1].parents[1].describeId === '0');
    assert(context.publish.calls[1][1].text === 'inner-description');

    assert(context.publish.calls[2][0] === 'x-test-suite-register');
    assert(context.publish.calls[2][1].type === 'describe-end');
    assert(context.publish.calls[2][1].describeId === '0');
  });

  it('bails for failures during describe callback', () => {
    const { context } = getContext();
    context.state.testId = '123';
    context.state.parents = [{ type: 'test', testId: '123' }];
    const callback = () => { throw new Error('test failure'); };
    __XTestSuite__.describe(context, 'description', callback);
    assert(context.publish.calls.length === 2);
    assert(context.publish.calls[0][0] === 'x-test-suite-register');
    assert(context.publish.calls[0][1].type === 'describe-start');
    assert(context.publish.calls[0][1].describeId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'test');
    assert(context.publish.calls[0][1].parents[0].testId === '123');
    assert(context.publish.calls[0][1].text === 'description');

    assert(context.publish.calls[1][0] === 'x-test-suite-bail');
    assert(context.publish.calls[1][1].testId === '123');
    assert(context.publish.calls[1][1].error.message === 'test failure');
  });

  it('throws if callback is not a function', () => {
    const { context } = getContext();
    const callback = null;
    const expected = 'Unexpected callback value "null".';
    let actual;
    try {
      __XTestSuite__.describe(context, 'description', callback);
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
    context.state.testId = '123';
    context.state.parents = [{ type: 'test', testId: '123' }];
    const callback = () => {};
    __XTestSuite__.it(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-suite-register');
    assert(context.publish.calls[0][1].type === 'it');
    assert(context.publish.calls[0][1].itId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'test');
    assert(context.publish.calls[0][1].parents[0].testId === '123');
    assert(context.publish.calls[0][1].text === 'description');
    assert(context.publish.calls[0][1].directive === null);
    assert(context.publish.calls[0][1].only === false);
    assert(context.publish.calls[0][1].interval === null);
  });
});

describe('itSkip', () => {
  it('publishes new skip', () => {
    const { context } = getContext();
    context.state.testId = '123';
    context.state.parents = [{ type: 'test', testId: '123' }];
    const callback = () => {};
    __XTestSuite__.itSkip(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-suite-register');
    assert(context.publish.calls[0][1].type === 'it');
    assert(context.publish.calls[0][1].itId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'test');
    assert(context.publish.calls[0][1].parents[0].testId === '123');
    assert(context.publish.calls[0][1].text === 'description');
    assert(context.publish.calls[0][1].directive === 'SKIP');
    assert(context.publish.calls[0][1].only === false);
    assert(context.publish.calls[0][1].interval === null);
  });
});

describe('itTodo', () => {
  it('publishes new todo', () => {
    const { context } = getContext();
    context.state.testId = '123';
    context.state.parents = [{ type: 'test', testId: '123' }];
    const callback = () => {};
    __XTestSuite__.itTodo(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-suite-register');
    assert(context.publish.calls[0][1].type === 'it');
    assert(context.publish.calls[0][1].itId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'test');
    assert(context.publish.calls[0][1].parents[0].testId === '123');
    assert(context.publish.calls[0][1].text === 'description');
    assert(context.publish.calls[0][1].directive === 'TODO');
    assert(context.publish.calls[0][1].only === false);
    assert(context.publish.calls[0][1].interval === null);
  });
});

describe('itOnly', () => {
  it('publishes new only', () => {
    const { context } = getContext();
    context.state.testId = '123';
    context.state.parents = [{ type: 'test', testId: '123' }];
    const callback = () => {};
    __XTestSuite__.itOnly(context, 'description', callback);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-suite-register');
    assert(context.publish.calls[0][1].type === 'it');
    assert(context.publish.calls[0][1].itId === '0');
    assert(context.publish.calls[0][1].parents.length === 1);
    assert(context.publish.calls[0][1].parents[0].type === 'test');
    assert(context.publish.calls[0][1].parents[0].testId === '123');
    assert(context.publish.calls[0][1].text === 'description');
    assert(context.publish.calls[0][1].directive === null);
    assert(context.publish.calls[0][1].only === true);
    assert(context.publish.calls[0][1].interval === null);
  });
});

describe('register', () => {
  describe('coverage', () => {
    it('publishes new coverage', () => {
      const { context } = getContext();
      context.state.testId = '123';
      context.state.href = 'http://localhost:8080';
      __XTestSuite__.coverage(context, './test.js', 99);
      assert(context.publish.calls.length === 1);
      assert(context.publish.calls[0][0] === 'x-test-suite-register');
      assert(context.publish.calls[0][1].type === 'coverage');
      assert(context.publish.calls[0][1].coverageId === '0');
      assert(context.publish.calls[0][1].href === 'http://localhost:8080/test.js');
      assert(context.publish.calls[0][1].goal === 99);
    });

    it('throws for bad goal value', () => {
      const { context } = getContext();
      context.state.href = 'http://localhost:8080';
      const expected = `Unexpected goal percentage "101".`;
      let actual;
      try {
        __XTestSuite__.coverage(context, './test.js', 101);
      } catch (error) {
        actual = error.message;
      }
      assert(context.publish.calls.length === 0);
      assert(actual === expected, actual);
    });
  });
});

describe('waitFor', () => {
  it('adds a promise when called', () => {
    const { context } = getContext();
    assert(context.state.promises.length === 0);
    const promise = Promise.resolve();
    __XTestSuite__.waitFor(context, promise);
    assert(context.state.promises.length === 1);
  });

  it('publishes "x-test-ready" when resolved', async () => {
    const { context } = getContext();
    context.state.testId = '123';
    const promise = Promise.resolve();
    await __XTestSuite__.waitFor(context, promise);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-suite-ready');
    assert(context.publish.calls[0][1].testId === '123');
  });

  it('awaits resolution of all promises to publish "x-test-ready"', async () => {
    const { context } = getContext();
    let resolvePromise1, resolvePromise2, resolvePromise3;
    const promise1 = new Promise(resolve => { resolvePromise1 = resolve; });
    const promise2 = new Promise(resolve => { resolvePromise2 = resolve; });
    const promise3 = new Promise(resolve => { resolvePromise3 = resolve; });
    __XTestSuite__.waitFor(context, promise1);
    __XTestSuite__.waitFor(context, promise2);
    __XTestSuite__.waitFor(context, promise3);
    resolvePromise1();
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 0);
    resolvePromise2();
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 0);
    resolvePromise3();
    await new Promise(resolve => setTimeout(resolve));
    assert(context.publish.calls.length === 1);
  });
});

describe('bail', () => {
  it('marks state as ended', () => {
    const error = new Error('error test');
    const { context } = getContext();
    assert(context.state.bailed === false);
    __XTestSuite__.bail(context, error);
    assert(context.state.bailed === true);
  });

  it('publishes to parent frame', () => {
    const error = new Error('error test');
    const { context } = getContext();
    context.state.testId = '123';
    __XTestSuite__.bail(context, error);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-suite-bail');
    assert(context.publish.calls[0][1].testId === '123');
    assert(context.publish.calls[0][1].error.message === 'error test');
  });
});

describe('error', () => {
  it('turns error into basic object', () => {
    const testError = new Error('error test');
    const error = __XTestSuite__.createError(testError);
    assert(error.message = testError.toString());
    assert(error.stack = testError.stack);
  });
});
