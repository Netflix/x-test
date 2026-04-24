import { test, suite, assert } from '../x-test.js';

suite('first <script type="module"> in <body>', () => {
  test('registers tests', () => {
    assert(true);
  });
});
