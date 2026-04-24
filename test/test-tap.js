import { test, suite, assert } from '../x-test.js';
import { XTestTap } from '../x-test-tap.js';

suite('version', () => {
  test('renders "TAP version 14"', () => {
    assert(XTestTap.version() === 'TAP version 14');
  });
});

suite('diagnostic', () => {
  test('basic', () => {
    assert(XTestTap.diagnostic('my message') === '# my message');
  });

  test('basic, indented', () => {
    assert(XTestTap.diagnostic('my message', 1) === '    # my message');
  });

  test('multiline', () => {
    assert(XTestTap.diagnostic('one\ntwo\nthree') === '# one\n# two\n# three');
  });

  test('multiline, indented', () => {
    assert(XTestTap.diagnostic('one\ntwo\nthree', 1) === '    # one\n    # two\n    # three');
  });
});

suite('testLine', () => {
  test('basic, passing', () => {
    assert(XTestTap.testLine(true, 1, 'first test') === 'ok 1 - first test');
  });

  test('basic, passing, indented', () => {
    assert(XTestTap.testLine(true, 1, 'first test', null, 1) === '    ok 1 - first test');
  });

  test('basic, failing', () => {
    assert(XTestTap.testLine(false, 1, 'first test') === 'not ok 1 - first test');
  });

  test('basic, failing, indented', () => {
    assert(XTestTap.testLine(false, 1, 'first test', null, 1) === '    not ok 1 - first test');
  });

  test('multiline', () => {
    assert(XTestTap.testLine(true, 1, 'first\ntest') === 'ok 1 - first test');
  });

  test('multiline, indented', () => {
    assert(XTestTap.testLine(true, 1, 'first\ntest', null, 1) === '    ok 1 - first test');
  });

  test('skip', () => {
    assert(XTestTap.testLine(true, 1, 'first test', 'SKIP') === 'ok 1 - first test # SKIP');
  });

  test('skip, indented', () => {
    assert(XTestTap.testLine(true, 1, 'first test', 'SKIP', 1) === '    ok 1 - first test # SKIP');
  });

  test('todo, passing', () => {
    assert(XTestTap.testLine(true, 1, 'first test', 'TODO') === 'ok 1 - first test # TODO');
  });

  test('todo, passing, indented', () => {
    assert(XTestTap.testLine(true, 1, 'first test', 'TODO', 1) === '    ok 1 - first test # TODO');
  });

  test('todo, failing', () => {
    assert(XTestTap.testLine(false, 1, 'first test', 'TODO') === 'not ok 1 - first test # TODO');
  });

  test('todo, failing, indented', () => {
    assert(XTestTap.testLine(false, 1, 'first test', 'TODO', 1) === '    not ok 1 - first test # TODO');
  });
});

suite('subtest', () => {
  test('basic', () => {
    assert(XTestTap.subtest('my subtest') === '# Subtest: my subtest');
  });

  test('basic, indented', () => {
    assert(XTestTap.subtest('my subtest', 1) === '    # Subtest: my subtest');
  });
});

suite('yaml', () => {
  test('basic', () => {
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

  test('indented', () => {
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

suite('bailOut', () => {
  test('basic', () => {
    assert(XTestTap.bailOut('oh no!') === 'Bail out! oh no!');
  });

  test('without message', () => {
    assert(XTestTap.bailOut() === 'Bail out!');
    assert(XTestTap.bailOut(null) === 'Bail out!');
    assert(XTestTap.bailOut('') === 'Bail out!');
  });
});

suite('plan', () => {
  test('basic', () => {
    assert(XTestTap.plan(999) === '1..999');
  });
});
