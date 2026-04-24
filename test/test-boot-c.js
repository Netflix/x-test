import { test, suite, assert } from '../x-test.js';

suite('second <script type="module"> in <body>', () => {
  test('is not silently dropped after the first script evaluates', () => {
    assert(true);
  });
});
