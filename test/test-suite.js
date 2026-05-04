import { test, suite, assert } from '../x-test.js';

for (const [name, fn] of [
  ['suite', suite],
  ['suite.skip', suite.skip],
  ['suite.only', suite.only],
  ['suite.todo', suite.todo],
]) {
  suite(name, () => {
    test('accepts valid arguments', () => {
      fn('valid suite', () => {});
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

    test('throws on extra arguments', () => {
      assert.throws(() => fn('name', () => {}, 'extra'), /^Error: unexpected extra arguments$/);
    });
  });
}
