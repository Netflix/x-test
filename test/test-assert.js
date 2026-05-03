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
});

suite('assert.throws', () => {
  test('exercises the public assert.throws export', () => {
    assert.throws(() => { throw new Error('boom'); }, /boom/);
    assert.throws(() => { throw new Error('boom'); }, /^Error: boom$/);
  });

  test('throws early if fn is not a function', () => {
    assert.throws(() => assert.throws('not a function', /boom/), /^Error: unexpected fn value "not a function"$/);
  });

  test('throws early if error is not a RegExp', () => {
    assert.throws(() => assert.throws(() => {}, 'not a regexp'), /^Error: unexpected error value "not a regexp"$/);
  });
});

suite('assert.rejects', () => {
  test('exercises the public assert.rejects export', async () => {
    await assert.rejects(async () => { throw new Error('boom'); }, /boom/);
    await assert.rejects(async () => { throw new Error('boom'); }, /^Error: boom$/);
  });

  test('throws early if fn is not a function', async () => {
    await assert.rejects(() => assert.rejects('not a function', /boom/), /^Error: unexpected fn value "not a function"$/);
  });

  test('throws early if error is not a RegExp', async () => {
    await assert.rejects(() => assert.rejects(() => {}, 'not a regexp'), /^Error: unexpected error value "not a regexp"$/);
  });
});
