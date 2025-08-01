import { it, describe, assert } from '../x-test.js';
import { XTestTap } from '../x-test-tap.js';

describe('version', () => {
  it('renders "TAP Version 14"', () => {
    assert(XTestTap.version() === 'TAP Version 14');
  });
});

describe('diagnostic', () => {
  it('basic', () => {
    assert(XTestTap.diagnostic('my message') === '# my message');
  });

  it('basic, indented', () => {
    assert(XTestTap.diagnostic('my message', 1) === '    # my message');
  });

  it('multiline', () => {
    assert(XTestTap.diagnostic('one\ntwo\nthree') === '# one\n# two\n# three');
  });

  it('multiline, indented', () => {
    assert(XTestTap.diagnostic('one\ntwo\nthree', 1) === '    # one\n    # two\n    # three');
  });
});

describe('testLine', () => {
  it('basic, passing', () => {
    assert(XTestTap.testLine(true, 1, 'first test') === 'ok 1 - first test');
  });

  it('basic, passing, indented', () => {
    assert(XTestTap.testLine(true, 1, 'first test', null, 1) === '    ok 1 - first test');
  });

  it('basic, failing', () => {
    assert(XTestTap.testLine(false, 1, 'first test') === 'not ok 1 - first test');
  });

  it('basic, failing, indented', () => {
    assert(XTestTap.testLine(false, 1, 'first test', null, 1) === '    not ok 1 - first test');
  });

  it('multiline', () => {
    assert(XTestTap.testLine(true, 1, 'first\ntest') === 'ok 1 - first test');
  });

  it('multiline, indented', () => {
    assert(XTestTap.testLine(true, 1, 'first\ntest', null, 1) === '    ok 1 - first test');
  });

  it('skip', () => {
    assert(XTestTap.testLine(true, 1, 'first test', 'SKIP') === 'ok 1 - first test # SKIP');
  });

  it('skip, indented', () => {
    assert(XTestTap.testLine(true, 1, 'first test', 'SKIP', 1) === '    ok 1 - first test # SKIP');
  });

  it('todo, passing', () => {
    assert(XTestTap.testLine(true, 1, 'first test', 'TODO') === 'ok 1 - first test # TODO');
  });

  it('todo, passing, indented', () => {
    assert(XTestTap.testLine(true, 1, 'first test', 'TODO', 1) === '    ok 1 - first test # TODO');
  });

  it('todo, failing', () => {
    assert(XTestTap.testLine(false, 1, 'first test', 'TODO') === 'not ok 1 - first test # TODO');
  });

  it('todo, failing, indented', () => {
    assert(XTestTap.testLine(false, 1, 'first test', 'TODO', 1) === '    not ok 1 - first test # TODO');
  });
});

describe('subtest', () => {
  it('basic', () => {
    assert(XTestTap.subtest('my subtest') === '# Subtest: my subtest');
  });

  it('basic, indented', () => {
    assert(XTestTap.subtest('my subtest', 1) === '    # Subtest: my subtest');
  });
});

describe('yaml', () => {
  it('basic', () => {
    const expected = `\
  ---
  message: my message
  severity: error
  stack: |-
    one
    two
    three
  ...`;
    assert(XTestTap.yaml('my message', 'error', { stack: 'one\ntwo\nthree' }) === expected);
  });

  it('indented', () => {
    const expected = `\
      ---
      message: my message
      severity: error
      stack: |-
        one
        two
        three
      ...`;
    assert(XTestTap.yaml('my message', 'error', { stack: 'one\ntwo\nthree' }, 1) === expected);
  });
});

describe('bailOut', () => {
  it('basic', () => {
    assert(XTestTap.bailOut('oh no!') === 'Bail out! oh no!');
  });
});

describe('plan', () => {
  it('basic', () => {
    assert(XTestTap.plan(999) === '1..999');
  });
});
