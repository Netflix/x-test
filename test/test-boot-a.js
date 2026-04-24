import { test, suite, assert } from '../x-test.js';

suite('<script type="module"> in <head>', () => {
  test('registers into the same suite as body-placed scripts', () => {
    assert(true);
  });
});
