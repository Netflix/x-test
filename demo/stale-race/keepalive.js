import { assert, test } from '../../x-test.js';

test('runs past the 30s load-phase timer', async () => {
  await new Promise(resolve => { setTimeout(resolve, 35_000); });
  assert(true);
}, 60_000);
