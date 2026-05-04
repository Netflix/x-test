import { test, suite, assert, load } from '../x-test.js';

suite('load', () => {
  test('throws with no arguments', () => {
    assert.throws(() => load(), /^Error: expected href argument, but got none$/);
  });

  test('throws if href is not a string', () => {
    assert.throws(() => load(42), /^Error: unexpected href, expected string but got "42"$/);
  });

  test('throws on extra arguments', () => {
    assert.throws(() => load('./foo.html', 'extra'), /^Error: unexpected extra arguments$/);
  });
});
