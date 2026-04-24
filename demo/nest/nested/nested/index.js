import { assert, test, suite } from '../../../../x-test.js';

suite('nest', () => {
  suite('within', () => {
    suite('tests', () => {
      test('nested tests should be found', () => {
        assert(true);
      });
    });
  });
});
