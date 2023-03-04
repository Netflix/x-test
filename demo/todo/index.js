import { it, describe } from '../../x-test.js';

it.todo('do the impossible one day', () => {
  throw new Error('cannot do the impossible');
});

it.todo('move mountains', () => {
  throw new Error('mountain moving is not in your wheelhouse');
});

describe.todo('eventually, do all these things', () => {
  it('go to the moon', () => {
    throw new Error('nope…');
  });

  it('go to mars', () => {
    throw new Error('nada…');
  });

  it('go outside', () => {
    throw new Error('sigh…');
  });
});
