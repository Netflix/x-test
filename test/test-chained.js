import { assert, it, skip } from '../x-test.js';

it('objects pass assertion checks', () => {
  assert({});
});

skip('do the impossible', () => {
  assert(false);
});
