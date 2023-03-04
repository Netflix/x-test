import { it, describe, assert, __XTestRoot__ } from '../x-test.js';

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
    const level = __XTestRoot__.level(context, 'testStepId');
    assert(level === 1);
  });

  it('returns level = 0 for "test-start"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'test-start', testId: 'testTestId' };
    const level = __XTestRoot__.level(context, 'testStepId');
    assert(level === 0);
  });

  it('returns level = 0 for "test-end"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'test-end', testId: 'testTestId' };
    const level = __XTestRoot__.level(context, 'testStepId');
    assert(level === 0);
  });

  it('returns level = 0 for "coverage"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'coverage', coverageId: 'testCoverageId' };
    const level = __XTestRoot__.level(context, 'testStepId');
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
    const count = __XTestRoot__.count(context, 'testStepId');
    assert(count === 3);
  });

  it('returns count for "describe-plan"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'describe-plan', describeId: 'testDescribeId' };
    context.state.describes['testDescribeId'] = { children: [{}, {}, {}] };
    const count = __XTestRoot__.count(context, 'testStepId');
    assert(count === 3);
  });

  it('returns count for "exit"', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'exit' };
    context.state.children = [{}, {}, {}];
    const count = __XTestRoot__.count(context, 'testStepId');
    assert(count === 3);
  });
});

describe('yaml', () => {
  it('finds the given "it" step and returns a yaml object', () => {
    const { context } = getContext();
    context.state.stepIds.push('testStepId');
    context.state.steps['testStepId'] = { type: 'it', itId: 'testItId' };
    context.state.its['testItId'] = { ok: false, error: { message: 'test failure', stack: 'test error stack' } };
    const yaml = __XTestRoot__.yaml(context, 'testStepId');
    assert(yaml.message === 'test failure');
    assert(yaml.severity === 'fail');
    assert(yaml.data.stack === 'test error stack');
  });
});

describe('end', () => {
  it('marks state as ended', () => {
    const { context } = getContext();
    assert(context.state.ended === false);
    __XTestRoot__.end(context);
    assert(context.state.ended === true);
  });

  it('marks waiting as false', () => {
    const { context } = getContext();
    context.state.waiting = true;
    assert(context.state.waiting === true);
    __XTestRoot__.end(context);
    assert(context.state.waiting === false);
  });

  it('publishes that the test has ended', () => {
    const { context } = getContext();
    __XTestRoot__.end(context);
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
    const analysis = __XTestRoot__.analyzeHrefCoverage(js, url, 95);
    assert(analysis.ok === false);
    assert(analysis.output === expectedOutput);
    assert(analysis.percent === 72);
  });
});
