import { test, suite } from '../../x-test.js';

test.todo('do the impossible one day', () => {
  throw new Error('cannot do the impossible');
});

test.todo('move mountains', () => {
  throw new Error('mountain moving is not in your wheelhouse');
});

suite.todo('eventually, do all these things', () => {
  test('go to the moon', () => {
    throw new Error('nope…');
  });

  test('go to mars', () => {
    throw new Error('nada…');
  });

  test('go outside', () => {
    throw new Error('sigh…');
  });
});
