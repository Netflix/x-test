import { test, suite, assert } from '../x-test.js';

for (const [name, fn] of [
  ['test', test],
  ['test.skip', test.skip],
  ['test.only', test.only],
  ['test.todo', test.todo],
]) {
  suite(name, () => {
    test('accepts (name, fn)', () => {
      fn('valid test', () => {});
    });

    test('accepts (name, options, fn)', () => {
      fn('valid test with options', { timeout: 1000 }, () => {});
      fn('valid test with empty options', {}, () => {});
    });

    test('throws with too few arguments', () => {
      assert.throws(() => fn(), /^Error: expected name and fn arguments, but got too few arguments$/);
      assert.throws(() => fn('name'), /^Error: expected name and fn arguments, but got too few arguments$/);
    });

    test('throws if name is not a string', () => {
      assert.throws(() => fn(42, () => {}), /^Error: unexpected name, expected string but got "42"$/);
      assert.throws(() => fn(42, {}, () => {}), /^Error: unexpected name, expected string but got "42"$/);
    });

    test('throws if fn is not a Function', () => {
      assert.throws(() => fn('name', 'not-a-function'), /^Error: unexpected fn, expected Function but got "not-a-function"$/);
      assert.throws(() => fn('name', {}, 'not-a-function'), /^Error: unexpected fn, expected Function but got "not-a-function"$/);
    });

    test('throws if options is not a plain object', () => {
      assert.throws(() => fn('name', null, () => {}), /^Error: unexpected options, expected object but got "null"$/);
      assert.throws(() => fn('name', 42, () => {}), /^Error: unexpected options, expected object but got "42"$/);
      assert.throws(() => fn('name', [], () => {}), /^Error: unexpected options, expected object but got ""$/);
    });

    test('throws if options has unexpected keys', () => {
      assert.throws(() => fn('name', { unknown: true }, () => {}), /^Error: unexpected options key "unknown"$/);
    });

    test('throws if options.timeout is not a number', () => {
      assert.throws(() => fn('name', { timeout: 'bad' }, () => {}), /^Error: unexpected options\.timeout, expected number but got "bad"$/);
    });

    test('throws on extra arguments', () => {
      assert.throws(() => fn('name', {}, () => {}, 'extra'), /^Error: unexpected extra arguments$/);
    });
  });
}
