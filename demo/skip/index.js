import { it, describe } from '../../x-test.js';

it.skip('not to self: remember to write this test', () => {});

it.skip('not to self: remember to write this other test', () => {});

describe.skip('skip all this stuff for now', () => {
  it('foo', () => {});
  it('bar', () => {});
  it('baz', () => {});
});
