import { it, describe, assert } from '../x-test.js';

describe('second <script type="module"> in <body>', () => {
  it('is not silently dropped after the first script evaluates', () => {
    assert(true);
  });
});
