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

suite('collectFailureStepIds', () => {
  test('returns failing test step ids in order, excluding TODO and passing', () => {
    const { context } = getContext();
    context.state.stepIds.push('s1', 's2', 's3', 's4');
    context.state.steps = {
      s1: { type: 'test', testId: 'passTest' },
      s2: { type: 'test', testId: 'failTest' },
      s3: { type: 'test', testId: 'todoTest' },
      s4: { type: 'version' },
    };
    context.state.tests = {
      passTest: { ok: true },
      failTest: { ok: false },
      todoTest: { ok: false, directive: 'TODO' },
    };
    const ids = XTestRoot.collectFailureStepIds(context);
    assert(ids.length === 1);
    assert(ids[0] === 's2');
  });

});

suite('formatFailure', () => {
  test('formats a failing "test" with arrow-joined breadcrumb and raw stack', () => {
    const { context } = getContext();
    context.state.stepIds.push('s1');
    context.state.steps['s1'] = { stepId: 's1', type: 'test', testId: 'i1' };
    context.state.frames['t1'] = { href: 'http://example.com/test.html', children: [{ type: 'suite', suiteId: 'd1' }] };
    context.state.suites['d1'] = {
      text: 'outer',
      parents: [{ type: 'frame', frameId: 't1' }],
      children: [{ type: 'test', testId: 'i1' }],
    };
    context.state.tests['i1'] = {
      testId: 'i1',
      text: 'does the thing',
      ok: false,
      directive: null,
      error: { message: 'nope', stack: 'Error: nope\n    at foo' },
      parents: [{ type: 'frame', frameId: 't1' }, { type: 'suite', suiteId: 'd1' }],
    };
    const block = XTestRoot.formatFailure(context, 's1');
    const lines = block.split('\n');
    assert(lines[0] === 'http://example.com/test.html');
    assert(lines[1] === '> outer');
    assert(lines[2] === '> does the thing');
    assert(lines[3] === 'Error: nope');
    assert(lines[4] === '    at foo');
  });

  test('falls back to "Error: <message>" when stack is missing', () => {
    const { context } = getContext();
    context.state.stepIds.push('s1');
    context.state.steps['s1'] = { stepId: 's1', type: 'test', testId: 'i1' };
    context.state.frames['t1'] = { href: 'http://example.com/test.html', children: [] };
    context.state.tests['i1'] = {
      testId: 'i1',
      text: 'the test',
      ok: false,
      directive: null,
      error: { message: 'nope' },
      parents: [{ type: 'frame', frameId: 't1' }],
    };
    const block = XTestRoot.formatFailure(context, 's1');
    const lines = block.split('\n');
    assert(lines[lines.length - 1] === 'Error: nope');
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
