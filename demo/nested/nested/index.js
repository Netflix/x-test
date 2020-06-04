import { assert, it } from '../../../x-test.js';

it('nested tests should be found', async () => {
  await false;
  assert(true);
});
