import { test, suite } from '../../x-test.js';

test.skip('not to self: remember to write this test', () => {});

test.skip('not to self: remember to write this other test', () => {});

suite.skip('skip all this stuff for now', () => {
  test('foo', () => {});
  test('bar', () => {});
  test('baz', () => {});
});
