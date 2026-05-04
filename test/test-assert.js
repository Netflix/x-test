import { test, suite, assert } from '../x-test.js';

suite('assert', () => {
  test('passes for truthy values', () => {
    assert(true);
    assert(1);
    assert('non-empty');
  });

  test('fails for falsy values', () => {
    assert.throws(() => assert(false), /^Error: not ok$/);
    assert.throws(() => assert(0), /^Error: not ok$/);
    assert.throws(() => assert(''), /^Error: not ok$/);
  });

  test('uses custom message on failure', () => {
    assert.throws(() => assert(false, 'custom'), /^Error: custom$/);
  });

  test('throws if message is not a string', () => {
    assert.throws(() => assert(false, 42), /^Error: unexpected message, expected string but got "42"$/);
  });

  test('throws with no arguments', () => {
    assert.throws(() => assert(), /^Error: expected value to assert, but got none$/);
  });

  test('throws on extra arguments', () => {
    assert.throws(() => assert(false, 'msg', 'extra'), /^Error: unexpected extra arguments$/);
  });
});

suite('assert.deepEqual', () => {
  test('passes for deeply equal structures', () => {
    assert.deepEqual({ a: [1, 2] }, { a: [1, 2] });
    assert.deepEqual([1, { b: 'c' }], [1, { b: 'c' }]);
  });

  test('fails for unequal values', () => {
    assert.throws(() => assert.deepEqual({ a: 1 }, { a: 2 }), /^Error: not deep equal$/);
  });

  test('uses custom message on failure', () => {
    assert.throws(() => assert.deepEqual(1, 2, 'custom'), /^Error: custom$/);
  });

  test('throws for unsupported types', () => {
    assert.throws(() => assert.deepEqual(new Map(), new Map()), /^Error: deepEqual only supports primitives, plain objects, and arrays \(got Map\)$/);
    assert.throws(() => assert.deepEqual(new Date(0), new Date(0)), /^Error: deepEqual only supports primitives, plain objects, and arrays \(got Date\)$/);
  });

  test('throws for symbol-keyed properties', () => {
    const sym = Symbol('x');
    assert.throws(() => assert.deepEqual({ [sym]: 1 }, {}), /^Error: deepEqual does not support symbol-keyed properties\.$/);
  });

  test('throws with too few arguments', () => {
    assert.throws(() => assert.deepEqual(), /^Error: expected actual and expected values, but got too few arguments$/);
    assert.throws(() => assert.deepEqual(1), /^Error: expected actual and expected values, but got too few arguments$/);
  });

  test('throws if message is not a string', () => {
    assert.throws(() => assert.deepEqual(1, 2, 42), /^Error: unexpected message, expected string but got "42"$/);
  });

  test('throws on extra arguments', () => {
    assert.throws(() => assert.deepEqual(1, 1, 'msg', 'extra'), /^Error: unexpected extra arguments$/);
  });
});

suite('assert.throws', () => {
  test('exercises the public assert.throws export', () => {
    assert.throws(() => { throw new Error('boom'); }, /boom/);
    assert.throws(() => { throw new Error('boom'); }, /^Error: boom$/);
    assert.throws(() => { throw new Error('boom'); }, /boom/, 'with message');
  });

  test('throws with too few arguments', () => {
    assert.throws(() => assert.throws(), /^Error: expected fn and error arguments, but got too few arguments$/);
    assert.throws(() => assert.throws(() => {}), /^Error: expected fn and error arguments, but got too few arguments$/);
  });

  test('throws early if fn is not a function', () => {
    assert.throws(() => assert.throws('not a function', /boom/), /^Error: unexpected fn, expected Function but got "not a function"$/);
  });

  test('throws early if error is not a RegExp', () => {
    assert.throws(() => assert.throws(() => {}, 'not a regexp'), /^Error: unexpected error, expected RegExp but got "not a regexp"$/);
  });

  test('throws early if fn is not a function with message', () => {
    assert.throws(() => assert.throws('not a function', /boom/, 'msg'), /^Error: unexpected fn, expected Function but got "not a function"$/);
  });

  test('throws early if error is not a RegExp with message', () => {
    assert.throws(() => assert.throws(() => {}, 'not a regexp', 'msg'), /^Error: unexpected error, expected RegExp but got "not a regexp"$/);
  });

  test('throws if message is not a string', () => {
    assert.throws(() => assert.throws(() => { throw new Error('boom'); }, /boom/, 42), /^Error: unexpected message, expected string but got "42"$/);
  });

  test('throws on extra arguments', () => {
    assert.throws(() => assert.throws(() => {}, /boom/, 'msg', 'extra'), /^Error: unexpected extra arguments$/);
  });
});

suite('assert.rejects', () => {
  test('exercises the public assert.rejects export', async () => {
    await assert.rejects(async () => { throw new Error('boom'); }, /boom/);
    await assert.rejects(async () => { throw new Error('boom'); }, /^Error: boom$/);
    await assert.rejects(async () => { throw new Error('boom'); }, /boom/, 'with message');
  });

  test('throws with too few arguments', async () => {
    await assert.rejects(() => assert.rejects(), /^Error: expected fn and error arguments, but got too few arguments$/);
    await assert.rejects(() => assert.rejects(() => {}), /^Error: expected fn and error arguments, but got too few arguments$/);
  });

  test('throws early if fn is not a function', async () => {
    await assert.rejects(() => assert.rejects('not a function', /boom/), /^Error: unexpected fn, expected Function but got "not a function"$/);
  });

  test('throws early if error is not a RegExp', async () => {
    await assert.rejects(() => assert.rejects(() => {}, 'not a regexp'), /^Error: unexpected error, expected RegExp but got "not a regexp"$/);
  });

  test('throws early if fn is not a function with message', async () => {
    await assert.rejects(() => assert.rejects('not a function', /boom/, 'msg'), /^Error: unexpected fn, expected Function but got "not a function"$/);
  });

  test('throws early if error is not a RegExp with message', async () => {
    await assert.rejects(() => assert.rejects(() => {}, 'not a regexp', 'msg'), /^Error: unexpected error, expected RegExp but got "not a regexp"$/);
  });

  test('throws if message is not a string', async () => {
    await assert.rejects(() => assert.rejects(async () => { throw new Error('boom'); }, /boom/, 42), /^Error: unexpected message, expected string but got "42"$/);
  });

  test('throws on extra arguments', async () => {
    await assert.rejects(() => assert.rejects(async () => {}, /boom/, 'msg', 'extra'), /^Error: unexpected extra arguments$/);
  });
});
