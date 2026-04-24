import { test, suite, assert } from '../../x-test.js';

test.only('this is run because it is flagged', () => {
  assert(true);
});

test('this will get skipped because it is not flagged', () => {});

suite('all these get skipped because they are not flagged', () => {
  test('foo', () => {});
  test('bar', () => {});
  test('baz', () => {});
});

suite.only('all these are run because they are in a flagged group', () => {
  test('yep, foo', () => { assert(true); });
  test('yep, bar', () => { assert(true); });
  test('yep, baz', () => { assert(true); });
});
