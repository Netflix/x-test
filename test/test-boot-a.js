import { it, describe, assert } from '../x-test.js';

describe('<script type="module"> in <head>', () => {
  it('registers into the same suite as body-placed scripts', () => {
    assert(true);
  });
});
