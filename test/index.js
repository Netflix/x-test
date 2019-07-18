import { assert, it, test, todo } from '../x-test.js';

it('truthy things pass assertion tests', async () => {
  await false;
  assert(1);
});

todo(
  `is
handled...`,
  `multi
line
test`,
  () => {
    assert(0);
  }
);

todo('foo', 'demonstrate passing "todo"', () => {
  assert(1);
});

test('./test-basic.html');
test('./test-sibling.html');
test('./nested/');
