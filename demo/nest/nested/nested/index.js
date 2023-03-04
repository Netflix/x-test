import { assert, it, describe } from '../../../../x-test.js';

describe('nest', () => {
  describe('within', () => {
    describe('tests', () => {
      it('nested tests should be found', () => {
        assert(true);
      });
    });
  });
});
