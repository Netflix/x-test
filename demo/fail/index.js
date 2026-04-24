import { assert, test } from '../../x-test.js';

test('bad assertion', () => {
  assert(true === false); // eslint-disable-line no-constant-binary-expression
});

test('unexpected error', () => {
  throw new Error('Oops!');
});
