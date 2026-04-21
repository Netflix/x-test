import { it, describe, assert } from '../x-test.js';
import { XTestRoot } from '../x-test-root.js';

// Dependency injection.
const getContext = () => {
  const state = {
    ended: false,
    waiting: false,
    children: [],
    stepIds: [],
    steps: {},
    tests: {},
    describes: {},
    its: {},
    coverage: false,
    coverages: {},
    resolveCoverageValuePromise: null,
    coverageValuePromise: null,
    coverageValue: null,
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

describe('level', () => {
  it('returns level = 1 for "test-plan"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'test-plan', testId: 'testTestId' };
    const level = XTestRoot.level(context, 'testStepId');
    assert(level === 1);
  });

  it('returns level = 0 for "test-start"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'test-start', testId: 'testTestId' };
    const level = XTestRoot.level(context, 'testStepId');
    assert(level === 0);
  });

  it('returns level = 0 for "test-end"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'test-end', testId: 'testTestId' };
    const level = XTestRoot.level(context, 'testStepId');
    assert(level === 0);
  });

  it('returns level = 0 for "coverage"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'coverage', coverageId: 'testCoverageId' };
    const level = XTestRoot.level(context, 'testStepId');
    assert(level === 0);
  });

  it.skip('returns level for "describe-plan"', () => {});

  it.skip('returns level for "describe-start"', () => {});

  it.skip('returns level for "describe-end"', () => {});

  it.skip('returns level for "it"', () => {});
});

describe('count', () => {
  it('returns count for "test-plan"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'test-plan', testId: 'testTestId' };
    context.state.tests['testTestId'] = { children: [{}, {}, {}] };
    const count = XTestRoot.count(context, 'testStepId');
    assert(count === 3);
  });

  it('returns count for "describe-plan"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'describe-plan', describeId: 'testDescribeId' };
    context.state.describes['testDescribeId'] = { children: [{}, {}, {}] };
    const count = XTestRoot.count(context, 'testStepId');
    assert(count === 3);
  });

  it('returns count for "exit"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'exit' };
    context.state.children = [{}, {}, {}];
    const count = XTestRoot.count(context, 'testStepId');
    assert(count === 3);
  });
});

describe('yaml', () => {
  it('finds the given "it" step and returns a yaml object', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'it', itId: 'testItId' };
    context.state.its['testItId'] = { ok: false, error: { message: 'test failure', stack: 'test error stack' } };
    const yaml = XTestRoot.yaml(context, 'testStepId');
    assert(yaml.message === 'test failure');
    assert(yaml.severity === 'fail');
    assert(yaml.data.stack === 'test error stack');
  });
});

describe('end', () => {
  it('marks state as ended', () => {
    const { context } = getContext();
    assert(context.state.ended === false);
    XTestRoot.end(context);
    assert(context.state.ended === true);
  });

  it('marks waiting as false', () => {
    const { context } = getContext();
    context.state.waiting = true;
    assert(context.state.waiting === true);
    XTestRoot.end(context);
    assert(context.state.waiting === false);
  });

  it('publishes that the test has ended', () => {
    const { context } = getContext();
    XTestRoot.end(context);
    assert(context.publish.calls.length === 1);
    assert(context.publish.calls[0][0] === 'x-test-root-end');
  });
});

describe('analyzeHrefCoverage', () => {
  it('test coverage', () => {
    const url = new URL('/fake.js', import.meta.url).href;
    const text = `\
// Fake file to test coverage on.
class MyFakeClass {
  fakeFunction(fake) {
    if (fake) {
      /*
       *
       *
       *
       *
       *
       */
    } else {
      /*
       *
       *
       *
       *
       *
       */
    }
  }
}

export default MyFakeClass;
`;
const expectedOutput = `\
1       |  // Fake file to test coverage on.
…
12      |      } else {
13 !    |        /*
…
19 !    |         */
20 !    |      }
…
25      |  `;
    const js = [{
      url,
      text,
      ranges: [{ start: 0, end: 162 }, { start: 239, end: 275 }],
    }];
    const analysis = XTestRoot.analyzeHrefCoverage(js, url, 95);
    assert(analysis.ok === false);
    assert(analysis.output === expectedOutput);
    assert(analysis.percent === 72);
  });
});

describe('collectFailureStepIds', () => {
  it('returns failing it step ids in order, excluding TODO and passing', () => {
    const { context } = getContext();
    context.state.stepIds.push('s1', 's2', 's3', 's4');
    context.state.steps = {
      s1: { type: 'it', itId: 'passIt' },
      s2: { type: 'it', itId: 'failIt' },
      s3: { type: 'it', itId: 'todoIt' },
      s4: { type: 'version' },
    };
    context.state.its = {
      passIt: { ok: true },
      failIt: { ok: false },
      todoIt: { ok: false, directive: 'TODO' },
    };
    const ids = XTestRoot.collectFailureStepIds(context);
    assert(ids.length === 1);
    assert(ids[0] === 's2');
  });

  it('does not include failing coverage steps', () => {
    const { context } = getContext();
    context.state.stepIds.push('s1');
    context.state.steps = { s1: { type: 'coverage', coverageId: 'c1' } };
    context.state.coverages = { c1: { ok: false } };
    const ids = XTestRoot.collectFailureStepIds(context);
    assert(ids.length === 0);
  });
});

describe('formatFailure', () => {
  it('formats a failing "it" with arrow-joined breadcrumb and raw stack', () => {
    const { context } = getContext();
    context.state.stepIds.push('s1');
    context.state.steps['s1'] = { stepId: 's1', type: 'it', itId: 'i1' };
    context.state.tests['t1'] = { href: 'http://example.com/test.html', children: [{ type: 'describe', describeId: 'd1' }] };
    context.state.describes['d1'] = {
      text: 'outer',
      parents: [{ type: 'test', testId: 't1' }],
      children: [{ type: 'it', itId: 'i1' }],
    };
    context.state.its['i1'] = {
      itId: 'i1',
      text: 'does the thing',
      ok: false,
      directive: null,
      error: { message: 'nope', stack: 'Error: nope\n    at foo' },
      parents: [{ type: 'test', testId: 't1' }, { type: 'describe', describeId: 'd1' }],
    };
    const block = XTestRoot.formatFailure(context, 's1');
    const lines = block.split('\n');
    assert(lines[0] === 'http://example.com/test.html');
    assert(lines[1] === '> outer');
    assert(lines[2] === '> does the thing');
    assert(lines[3] === 'Error: nope');
    assert(lines[4] === '    at foo');
  });

  it('falls back to "Error: <message>" when stack is missing', () => {
    const { context } = getContext();
    context.state.stepIds.push('s1');
    context.state.steps['s1'] = { stepId: 's1', type: 'it', itId: 'i1' };
    context.state.tests['t1'] = { href: 'http://example.com/test.html', children: [] };
    context.state.its['i1'] = {
      itId: 'i1',
      text: 'the test',
      ok: false,
      directive: null,
      error: { message: 'nope' },
      parents: [{ type: 'test', testId: 't1' }],
    };
    const block = XTestRoot.formatFailure(context, 's1');
    const lines = block.split('\n');
    assert(lines[lines.length - 1] === 'Error: nope');
  });

});

describe('check', () => {
  it('does not kick off the exit step once the run has ended (e.g. after a bail)', () => {
    const { context } = getContext();
    context.state.stepIds.push('exitStep');
    context.state.steps = { exitStep: { type: 'exit', status: 'waiting' } };
    context.state.ended = true;
    XTestRoot.check(context);
    assert(context.state.steps.exitStep.status === 'waiting');
  });
});
