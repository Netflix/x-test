import { assert, it, skip } from '../x-test.js';

it('objects pass assertion checks', () => {
  assert({});
});

skip('false is still not true', 'do the impossible', () => {
  assert(false);
});
