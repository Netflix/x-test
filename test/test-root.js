import { test, suite, assert } from '../x-test.js';
import { XTestRoot } from '../x-test-root.js';
import { assertThrows } from './shared.js';

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
  test('returns fail yaml with message and stack for a failing test', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'test', testId: 't' };
    context.state.tests['t'] = { ok: false, error: { message: 'test failure', stack: 'test error stack' } };
    const yaml = XTestRoot.yaml(context, 's');
    assert(yaml.message === 'test failure');
    assert(yaml.severity === 'fail');
    assert(yaml.data.stack === 'test error stack');
  });

  test('falls back to "fail" message when error has no message', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'test', testId: 't' };
    context.state.tests['t'] = { ok: false, error: {} };
    const yaml = XTestRoot.yaml(context, 's');
    assert(yaml.message === 'fail');
    assert(yaml.severity === 'fail');
  });

  test('returns todo yaml for a failing TODO test', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'test', testId: 't' };
    context.state.tests['t'] = { ok: false, directive: 'TODO', error: { message: 'expected' } };
    const yaml = XTestRoot.yaml(context, 's');
    assert(yaml.message === 'expected');
    assert(yaml.severity === 'todo');
  });

  test('falls back to "todo" message when TODO error has no message', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'test', testId: 't' };
    context.state.tests['t'] = { ok: false, directive: 'TODO', error: {} };
    const yaml = XTestRoot.yaml(context, 's');
    assert(yaml.message === 'todo');
    assert(yaml.severity === 'todo');
  });

  test('returns skip yaml for a passing SKIP test', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'test', testId: 't' };
    context.state.tests['t'] = { ok: true, directive: 'SKIP', error: null };
    const yaml = XTestRoot.yaml(context, 's');
    assert(yaml.message === 'skip');
  });

  test('returns todo yaml for a passing TODO test', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'test', testId: 't' };
    context.state.tests['t'] = { ok: true, directive: 'TODO', error: null };
    const yaml = XTestRoot.yaml(context, 's');
    assert(yaml.message === 'todo');
  });
});

suite('onDefer', () => {
  test('throws on unknown defer type', () => {
    const { context } = getContext();
    const event = { data: { data: { type: 'unknown' } } };
    assertThrows(() => XTestRoot.onDefer(context, event), /Unexpected defer type "unknown"\./);
  });
});

suite('output', () => {
  test('routes through handleFilteredOutput when filtering is active', () => {
    const { context } = getContext();
    context.state.filtering = true;
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'version', status: 'done' };
    XTestRoot.output(context, 's', 'TAP version 14');
    assert(context.state.steps['s'].tap !== undefined);
  });
});

suite('queueOrOutput', () => {
  test('pushes to queue when queueing and step type is not flushing', () => {
    const { context } = getContext();
    context.state.queueing = true;
    context.state.queue = [];
    XTestRoot.queueOrOutput(context, ['line'], 'suite-start');
    assert(context.state.queue.length === 1);
    assert(context.state.queueing === true);
  });
});

suite('handleEmptyPlan', () => {
  test('truncates queue to before the subtest line', () => {
    const { context } = getContext();
    context.state.queue = ['# Subtest: foo', 'extra'];
    XTestRoot.handleEmptyPlan(context);
    assert(context.state.queue.length === 0);
  });

  test('throws when no subtest line is in the queue', () => {
    const { context } = getContext();
    context.state.queue = [];
    assertThrows(() => XTestRoot.handleEmptyPlan(context), /Expected to find matching subtest/);
  });
});

suite('handleEmptySuite', () => {
  test('returns true and removes from parent when suite has no children', () => {
    const { context } = getContext();
    context.state.suites['s'] = { children: [], parents: [{ type: 'frame', frameId: 'f' }] };
    context.state.frames['f'] = { children: [{ type: 'suite', suiteId: 's' }] };
    const result = XTestRoot.handleEmptySuite(context, { suiteId: 's' });
    assert(result === true);
    assert(context.state.frames['f'].children.length === 0);
  });

  test('returns false when suite has children', () => {
    const { context } = getContext();
    context.state.suites['s'] = { children: [{}] };
    const result = XTestRoot.handleEmptySuite(context, { suiteId: 's' });
    assert(result === false);
  });
});

suite('handleEmptyFrame', () => {
  test('returns true and removes from children when frame has no children', () => {
    const { context } = getContext();
    context.state.frames['f'] = { frameId: 'f', children: [] };
    context.state.children = [{ type: 'frame', frameId: 'f' }];
    const result = XTestRoot.handleEmptyFrame(context, { frameId: 'f' });
    assert(result === true);
    assert(context.state.children.length === 0);
  });

  test('returns false when frame has children', () => {
    const { context } = getContext();
    context.state.frames['f'] = { frameId: 'f', children: [{}] };
    const result = XTestRoot.handleEmptyFrame(context, { frameId: 'f' });
    assert(result === false);
  });
});

suite('removeFromParent', () => {
  test('removes child from suite parent', () => {
    const { context } = getContext();
    context.state.suites['p'] = { children: [{ type: 'suite', suiteId: 'c' }] };
    XTestRoot.removeFromParent([{ type: 'suite', suiteId: 'p' }], 'suite', 'c', context);
    assert(context.state.suites['p'].children.length === 0);
  });

  test('removes child from frame parent', () => {
    const { context } = getContext();
    context.state.frames['f'] = { children: [{ type: 'suite', suiteId: 'c' }] };
    XTestRoot.removeFromParent([{ type: 'frame', frameId: 'f' }], 'suite', 'c', context);
    assert(context.state.frames['f'].children.length === 0);
  });
});

suite('handleFilteredOutput', () => {
  test('suite-start sets queueing', () => {
    const { context } = getContext();
    context.state.queueing = false;
    context.state.queue = [];
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'suite-start', suiteId: 'su' };
    XTestRoot.handleFilteredOutput(context, [], 's');
    assert(context.state.queueing === true);
  });

  test('frame-start sets queueing', () => {
    const { context } = getContext();
    context.state.queueing = false;
    context.state.queue = [];
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'frame-start', frameId: 'f' };
    XTestRoot.handleFilteredOutput(context, [], 's');
    assert(context.state.queueing === true);
  });

  test('suite-plan with no children calls handleEmptyPlan', () => {
    const { context } = getContext();
    context.state.queueing = false;
    context.state.queue = ['# Subtest: foo'];
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'suite-plan', suiteId: 'su' };
    context.state.suites['su'] = { children: [] };
    XTestRoot.handleFilteredOutput(context, [], 's');
    assert(context.state.queue.length === 0);
  });

  test('frame-plan with no children calls handleEmptyPlan', () => {
    const { context } = getContext();
    context.state.queueing = false;
    context.state.queue = ['# Subtest: foo'];
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'frame-plan', frameId: 'f' };
    context.state.frames['f'] = { children: [] };
    XTestRoot.handleFilteredOutput(context, [], 's');
    assert(context.state.queue.length === 0);
  });

  test('suite-end with no children calls handleEmptySuite', () => {
    const { context } = getContext();
    context.state.queueing = false;
    context.state.queue = [];
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'suite-end', suiteId: 'su' };
    context.state.suites['su'] = { children: [], parents: [{ type: 'frame', frameId: 'f' }] };
    context.state.frames['f'] = { children: [{ type: 'suite', suiteId: 'su' }] };
    XTestRoot.handleFilteredOutput(context, [], 's');
    assert(context.state.frames['f'].children.length === 0);
  });

  test('frame-end with no children calls handleEmptyFrame', () => {
    const { context } = getContext();
    context.state.queueing = false;
    context.state.queue = [];
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'frame-end', frameId: 'f' };
    context.state.frames['f'] = { frameId: 'f', children: [] };
    context.state.children = [{ type: 'frame', frameId: 'f' }];
    XTestRoot.handleFilteredOutput(context, [], 's');
    assert(context.state.children.length === 0);
  });

  test('throws on unknown step type', () => {
    const { context } = getContext();
    context.state.queueing = false;
    context.state.queue = [];
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'unknown' };
    assertThrows(() => XTestRoot.handleFilteredOutput(context, [], 's'), /Unexpected step type "unknown"/);
  });
});

suite('onResult', () => {
  test('throws if test step is not running', () => {
    const { context } = getContext();
    context.state.tests['t'] = { testId: 't' };
    context.state.stepIds.push('ts');
    context.state.steps['ts'] = { type: 'test', testId: 't', status: 'waiting' };
    const event = { data: { data: { testId: 't' } } };
    assertThrows(() => XTestRoot.onResult(context, event), /step to complete is not running/);
  });
});

suite('onReady', () => {
  test('marks non-only tests as SKIP when a suite has only', () => {
    const { context } = getContext();
    context.state.frames['f'] = { href: 'http://test.html', children: [] };
    context.state.stepIds.push('fs');
    context.state.steps['fs'] = { type: 'frame-start', frameId: 'f', status: 'running' };
    context.state.suites['s'] = { only: true, parents: [{ type: 'frame', frameId: 'f' }], children: [] };
    context.state.tests['t'] = { only: false, directive: null, parents: [{ type: 'frame', frameId: 'f' }] };
    XTestRoot.onReady(context, { data: { data: { frameId: 'f' } } });
    assert(context.state.tests['t'].directive === 'SKIP');
  });

  test('throws if frame-start step is not running', () => {
    const { context } = getContext();
    context.state.frames['f'] = { href: 'http://test.html', children: [] };
    context.state.stepIds.push('fs');
    context.state.steps['fs'] = { type: 'frame-start', frameId: 'f', status: 'waiting' };
    assertThrows(() => XTestRoot.onReady(context, { data: { data: { frameId: 'f' } } }), /frame to ready is not running/);
  });

  test('inherits suite directive onto tests without one', () => {
    const { context } = getContext();
    context.state.frames['f'] = { href: 'http://test.html', children: [] };
    context.state.stepIds.push('fs');
    context.state.steps['fs'] = { type: 'frame-start', frameId: 'f', status: 'running' };
    context.state.suites['s'] = { only: false, directive: 'TODO', parents: [{ type: 'frame', frameId: 'f' }], children: [] };
    context.state.tests['t'] = { only: false, directive: null, parents: [{ type: 'frame', frameId: 'f' }, { type: 'suite', suiteId: 's' }] };
    XTestRoot.onReady(context, { data: { data: { frameId: 'f' } } });
    assert(context.state.tests['t'].directive === 'TODO');
  });
});

suite('onRegister', () => {
  test('throws on unknown registration type', () => {
    const { context } = getContext();
    const event = { data: { data: { type: 'unknown' } } };
    assertThrows(() => XTestRoot.onRegister(context, event), /Unexpected registration type "unknown"\./);
  });
});

suite('initialize', () => {
  test('sets filtering and namePattern when x-test-name-pattern is present', () => {
    const { context } = getContext();
    XTestRoot.initialize(context, 'http://localhost/?x-test-name-pattern=foo');
    assert(context.state.filtering === true);
    assert(context.state.namePattern instanceof RegExp);
    assert(context.state.namePattern.source === 'foo');
    context.state.reporter.remove();
  });
});

suite('buildFullTestName', () => {
  test('joins suite names and test name', () => {
    const { context } = getContext();
    context.state.suites['suiteA'] = { text: 'suite A' };
    context.state.suites['suiteB'] = { text: 'suite B' };
    const data = {
      text: 'my test',
      parents: [
        { type: 'frame', frameId: 'f' },
        { type: 'suite', suiteId: 'suiteA' },
        { type: 'suite', suiteId: 'suiteB' },
      ],
    };
    const name = XTestRoot.buildFullTestName(context, data);
    assert(name === 'suite A suite B my test');
  });
});

suite('registerTest', () => {
  test('skips registration when namePattern does not match', () => {
    const { context } = getContext();
    context.state.namePattern = /foo/;
    context.state.stepIds.push('framePlanStep');
    context.state.steps['framePlanStep'] = { type: 'frame-plan', frameId: 'testFrameId' };
    context.state.frames['testFrameId'] = { children: [] };
    const data = {
      testId: 'testTestId',
      text: 'bar',
      parents: [{ type: 'frame', frameId: 'testFrameId' }],
    };
    XTestRoot.registerTest(context, data);
    assert(context.state.tests['testTestId'] === undefined);
  });

  test('registers when namePattern matches', () => {
    const { context } = getContext();
    context.state.namePattern = /foo/;
    context.state.stepIds.push('framePlanStep');
    context.state.steps['framePlanStep'] = { type: 'frame-plan', frameId: 'testFrameId' };
    context.state.frames['testFrameId'] = { children: [] };
    const data = {
      testId: 'testTestId',
      text: 'foo bar',
      parents: [{ type: 'frame', frameId: 'testFrameId' }],
    };
    XTestRoot.registerTest(context, data);
    assert(context.state.tests['testTestId'] !== undefined);
  });

  test('registers a test whose direct parent is a frame', () => {
    const { context } = getContext();
    context.state.stepIds.push('framePlanStep');
    context.state.steps['framePlanStep'] = { type: 'frame-plan', frameId: 'testFrameId' };
    context.state.frames['testFrameId'] = { children: [] };
    const data = {
      testId: 'testTestId',
      parents: [{ type: 'frame', frameId: 'testFrameId' }],
    };
    XTestRoot.registerTest(context, data);
    assert(context.state.frames['testFrameId'].children.length === 1);
    assert(context.state.frames['testFrameId'].children[0].type === 'test');
    assert(context.state.frames['testFrameId'].children[0].testId === 'testTestId');
  });
});

suite('childOk', () => {
  test('throws on unknown child type', () => {
    const { context } = getContext();
    assertThrows(() => XTestRoot.childOk(context, { type: 'unknown' }), /Unexpected type "unknown"/);
  });
});

suite('href', () => {
  test('throws on unknown step type', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'unknown' };
    assertThrows(() => XTestRoot.href(context, 's'), /Unexpected type "unknown"/);
  });
});

suite('directive', () => {
  test('throws on unknown step type', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'unknown' };
    assertThrows(() => XTestRoot.directive(context, 's'), /Unexpected type "unknown"/);
  });
});

suite('level', () => {
  test('throws on unknown step type', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'unknown' };
    assertThrows(() => XTestRoot.level(context, 's'), /Unexpected type "unknown"/);
  });
});

suite('count', () => {
  test('throws on unknown step type', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'unknown' };
    assertThrows(() => XTestRoot.count(context, 's'), /Unexpected type "unknown"/);
  });
});

suite('yaml', () => {
  test('throws on unknown step type', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'unknown' };
    assertThrows(() => XTestRoot.yaml(context, 's'), /Unexpected type "unknown"/);
  });
});

suite('text', () => {
  test('throws on unknown step type', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'unknown' };
    assertThrows(() => XTestRoot.text(context, 's'), /Unexpected type "unknown"/);
  });
});

suite('number', () => {
  test('throws on unknown step type', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'unknown' };
    assertThrows(() => XTestRoot.number(context, 's'), /Unexpected type "unknown"/);
  });

  test('returns position for a test whose direct parent is a frame', () => {
    const { context } = getContext();
    context.state.frames['f'] = { children: [{ type: 'test', testId: 't' }] };
    context.state.tests['t'] = { testId: 't', parents: [{ type: 'frame', frameId: 'f' }] };
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'test', testId: 't' };
    assert(XTestRoot.number(context, 's') === 1);
  });
});

suite('ok', () => {
  test('throws on unknown step type', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'unknown' };
    assertThrows(() => XTestRoot.ok(context, 's'), /Unexpected type "unknown"/);
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
  test('throws on unknown step type', () => {
    const { context } = getContext();
    context.state.stepIds.push('s');
    context.state.steps['s'] = { type: 'unknown', status: 'waiting' };
    assertThrows(() => XTestRoot.check(context), /Unexpected step type "unknown"/);
  });

  test('does not kick off the exit step once the run has ended (e.g. after a bail)', () => {
    const { context } = getContext();
    context.state.stepIds.push('exitStep');
    context.state.steps = { exitStep: { type: 'exit', status: 'waiting' } };
    context.state.ended = true;
    XTestRoot.check(context);
    assert(context.state.steps.exitStep.status === 'waiting');
  });
});
