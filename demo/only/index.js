import { it, describe, assert } from '../../x-test.js';

it.only('this is run because it is flagged', () => {
  assert(true);
});

it('this will get skipped because it is not flagged', () => {});

describe('all these get skipped because they are not flagged', () => {
  it('foo', () => {});
  it('bar', () => {});
  it('baz', () => {});
});

describe.only('all these are run because they are in a flagged group', () => {
  it('yep, foo', () => { assert(true); });
  it('yep, bar', () => { assert(true); });
  it('yep, baz', () => { assert(true); });
});
