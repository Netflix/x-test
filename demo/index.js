import { assert, it, test, todo, cover } from '../x-test.js';

// We import this here so we can see code coverage.
import '../x-test.js';

cover(new URL('../x-test.js', import.meta.url).href, 85);

it('truthy things pass assertion tests', async () => {
  await false;
  assert(1);
});

todo(`multi
line
test`,
  () => {
    assert(0);
  }
);

todo('demonstrate passing "todo"', () => {
  assert(1);
});

test('./test-basic.html');
test('./test-sibling.html');
test('./nested/');
