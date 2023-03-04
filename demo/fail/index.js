import { assert, it } from '../../x-test.js';

it('bad assertion', () => {
  assert(true === false);
});

it('unexpected error', () => {
  throw new Error('Oops!');
});
