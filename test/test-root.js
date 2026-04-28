import { test, suite, assert } from '../x-test.js';
import { XTestRoot } from '../x-test-root.js';

// Dependency injection.
const getContext = () => {
  const state = {
    ended: false,
    children: [],
    stepIds: [],
    steps: {},
    frames: {},
    suites: {},
    tests: {},
    reporter: null,
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
  function uuid() { String(uuid.callCount++); }
  async function timeout(interval) {
    timeout.calls.push([...arguments]);
    interval = interval ?? 30000;
    await new Promise((resolve, reject) => {
      setTimeout(() => { reject(new Error(`timeout after ${interval}ms`)); }, interval);
    });
  }
  uuid.callCount = 0;
  publish.calls = [];
  subscribe.calls = [];
  subscribe.callbacks = [];
  timeout.calls = [];
  const context = { state, uuid, publish, subscribe, timeout };
  return { context };
};

suite('level', () => {
  test('returns level = 1 for "load-plan"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'frame-plan', frameId: 'testTestId' };
    const level = XTestRoot.level(context, 'testStepId');
    assert(level === 1);
  });

  test('returns level = 0 for "load-start"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'frame-start', frameId: 'testTestId' };
    const level = XTestRoot.level(context, 'testStepId');
    assert(level === 0);
  });

  test('returns level = 0 for "load-end"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'frame-end', frameId: 'testTestId' };
    const level = XTestRoot.level(context, 'testStepId');
    assert(level === 0);
  });

  test.skip('returns level for "suite-plan"', () => {});

  test.skip('returns level for "suite-start"', () => {});

  test.skip('returns level for "suite-end"', () => {});

  test.skip('returns level for "test"', () => {});
});

suite('count', () => {
  test('returns count for "load-plan"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'frame-plan', frameId: 'testTestId' };
    context.state.frames['testTestId'] = { children: [{}, {}, {}] };
    const count = XTestRoot.count(context, 'testStepId');
    assert(count === 3);
  });

  test('returns count for "suite-plan"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'suite-plan', suiteId: 'testSuiteId' };
    context.state.suites['testSuiteId'] = { children: [{}, {}, {}] };
    const count = XTestRoot.count(context, 'testStepId');
    assert(count === 3);
  });

  test('returns count for "exit"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'exit' };
    context.state.children = [{}, {}, {}];
    const count = XTestRoot.count(context, 'testStepId');
    assert(count === 3);
  });
});

suite('yaml', () => {
  test('finds the given "test" step and returns a yaml object', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'test', testId: 'testTestId' };
    context.state.tests['testTestId'] = { ok: false, error: { message: 'test failure', stack: 'test error stack' } };
    const yaml = XTestRoot.yaml(context, 'testStepId');
    assert(yaml.message === 'test failure');
    assert(yaml.severity === 'fail');
    assert(yaml.data.stack === 'test error stack');
  });
});

suite('end', () => {
  test('marks state as ended', () => {
    const { context } = getContext();
    assert(context.state.ended === false);
    XTestRoot.end(context);
    assert(context.state.ended === true);
  });
});

suite('check', () => {
  test('does not kick off the exit step once the run has ended (e.g. after a bail)', () => {
    const { context } = getContext();
    context.state.stepIds.push('exitStep');
    context.state.steps = { exitStep: { type: 'exit', status: 'waiting' } };
    context.state.ended = true;
    XTestRoot.check(context);
    assert(context.state.steps.exitStep.status === 'waiting');
  });
});
