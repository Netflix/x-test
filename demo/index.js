import { it, assert } from '../x-test.js';

it('start testing!', () => {
  assert(true);

  // You wouldn't normally do this, we remove our own frame here to make sure
  //  that the content rendered on the page actually causes a navigation. This
  //  "test" is really just a demo.
  setTimeout(() => { frameElement.remove(); });
});
