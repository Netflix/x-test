import { it, describe, assert, __XTestTap__ } from '../x-test.js';

describe('version', () => {
  it('renders "TAP Version 14"', () => {
    assert(__XTestTap__.version() === 'TAP Version 14');
  });
});

describe('diagnostic', () => {
  it('basic', () => {
    assert(__XTestTap__.diagnostic('my message') === '# my message');
  });

  it('basic, indented', () => {
    assert(__XTestTap__.diagnostic('my message', 1) === '    # my message');
  });

  it('multiline', () => {
    assert(__XTestTap__.diagnostic('one\ntwo\nthree') === '# one\n# two\n# three');
  });

  it('multiline, indented', () => {
    assert(__XTestTap__.diagnostic('one\ntwo\nthree', 1) === '    # one\n    # two\n    # three');
  });
});

describe('testLine', () => {
  it('basic, passing', () => {
    assert(__XTestTap__.testLine(true, 1, 'first test') === 'ok 1 - first test');
  });

  it('basic, passing, indented', () => {
    assert(__XTestTap__.testLine(true, 1, 'first test', null, 1) === '    ok 1 - first test');
  });

  it('basic, failing', () => {
    assert(__XTestTap__.testLine(false, 1, 'first test') === 'not ok 1 - first test');
  });

  it('basic, failing, indented', () => {
    assert(__XTestTap__.testLine(false, 1, 'first test', null, 1) === '    not ok 1 - first test');
  });

  it('multiline', () => {
    assert(__XTestTap__.testLine(true, 1, 'first\ntest') === 'ok 1 - first test');
  });

  it('multiline, indented', () => {
    assert(__XTestTap__.testLine(true, 1, 'first\ntest', null, 1) === '    ok 1 - first test');
  });

  it('skip', () => {
    assert(__XTestTap__.testLine(true, 1, 'first test', 'SKIP') === 'ok 1 - first test # SKIP');
  });

  it('skip, indented', () => {
    assert(__XTestTap__.testLine(true, 1, 'first test', 'SKIP', 1) === '    ok 1 - first test # SKIP');
  });

  it('todo, passing', () => {
    assert(__XTestTap__.testLine(true, 1, 'first test', 'TODO') === 'ok 1 - first test # TODO');
  });

  it('todo, passing, indented', () => {
    assert(__XTestTap__.testLine(true, 1, 'first test', 'TODO', 1) === '    ok 1 - first test # TODO');
  });

  it('todo, failing', () => {
    assert(__XTestTap__.testLine(false, 1, 'first test', 'TODO') === 'not ok 1 - first test # TODO');
  });

  it('todo, failing, indented', () => {
    assert(__XTestTap__.testLine(false, 1, 'first test', 'TODO', 1) === '    not ok 1 - first test # TODO');
  });
});

describe('subtest', () => {
  it('basic', () => {
    assert(__XTestTap__.subtest('my subtest') === '# Subtest: my subtest');
  });

  it('basic, indented', () => {
    assert(__XTestTap__.subtest('my subtest', 1) === '    # Subtest: my subtest');
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
    assert(__XTestTap__.yaml('my message', 'error', { stack: 'one\ntwo\nthree' }) === expected);
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
    assert(__XTestTap__.yaml('my message', 'error', { stack: 'one\ntwo\nthree' }, 1) === expected);
  });
});

describe('bailOut', () => {
  it('basic', () => {
    assert(__XTestTap__.bailOut('oh no!') === 'Bail out! oh no!');
  });
});

describe('plan', () => {
  it('basic', () => {
    assert(__XTestTap__.plan(999) === '1..999');
  });
});
