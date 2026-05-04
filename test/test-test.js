import { test, suite, assert } from '../x-test.js';

for (const [label, fn] of [
  ['test', test],
  ['test.skip', test.skip],
  ['test.only', test.only],
  ['test.todo', test.todo],
]) {
  suite(label, () => {
    test('accepts valid arguments', () => {
      fn('valid test', () => {});
    });

    test('accepts valid arguments with timeout', () => {
      fn('valid test with timeout', () => {}, 1000);
    });

    test('throws with too few arguments', () => {
      assert.throws(() => fn(), /^Error: expected name and fn arguments, but got too few arguments$/);
      assert.throws(() => fn('name'), /^Error: expected name and fn arguments, but got too few arguments$/);
    });

    test('throws if name is not a string', () => {
      assert.throws(() => fn(42, () => {}), /^Error: unexpected name, expected string but got "42"$/);
    });

    test('throws if fn is not a Function', () => {
      assert.throws(() => fn('name', 'not-a-function'), /^Error: unexpected fn, expected Function but got "not-a-function"$/);
    });

    test('throws if name is not a string with timeout', () => {
      assert.throws(() => fn(42, () => {}, 1000), /^Error: unexpected name, expected string but got "42"$/);
    });

    test('throws if fn is not a Function with timeout', () => {
      assert.throws(() => fn('name', 'not-a-function', 1000), /^Error: unexpected fn, expected Function but got "not-a-function"$/);
    });

    test('throws if timeout is not a number', () => {
      assert.throws(() => fn('name', () => {}, 'not-a-number'), /^Error: unexpected timeout, expected number but got "not-a-number"$/);
    });

    test('throws on extra arguments', () => {
      assert.throws(() => fn('name', () => {}, 1000, 'extra'), /^Error: unexpected extra arguments$/);
    });
  });
}
