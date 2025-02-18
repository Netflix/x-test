import { assert, it } from '../../x-test.js';

it('bad assertion', () => {
  assert(true === false); // eslint-disable-line no-constant-binary-expression
});

it('unexpected error', () => {
  throw new Error('Oops!');
});
