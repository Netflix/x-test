import { test, suite, assert } from '../x-test.js';

suite.only('this wrapper exercises suite only logic', () => {
  suite.skip('this wrapper exercises suite skip logic', () => {
    test('this tests shows inheritance of outer grouping skip directive', () => {
      assert(false); // this shouldn't get run.
    });
    test.only('this tests that inner flags override outer ones', () => {
      assert(true);
    });
  });
  suite.todo('this wrapper exercises suite todo logic', () => {
    test('this tests shows inheritance of outer grouping todo directive', () => {
      assert(false, 'this error is expected');
    });
  });
  test.skip('this simply exercises the skip logic for coverage', () => {
    assert(false); // shouldn't get run
  });
  suite('this wrapper allows inner tests to declare their own flags', () => {
    test.todo('this simply exercises the todo logic for coverage', () => {
      assert(false, 'this error is expected');
    });
    test.only('this simply exercises the only logic for coverage', () => {
      assert(true);
    });
  });
});

suite.only('assert.deepEqual', () => {
  test('exercises the public assert.deepEqual export', () => {
    assert.deepEqual({ a: [1, 2] }, { a: [1, 2] });
  });
});

suite.only('interval', () => {
  test.todo('times out after interval - this is supposed to fail', async () => {
    await new Promise(resolve => setTimeout(resolve, 1_000));
    assert(true);
  }, 0);
});
