import { it, describe, assert } from '../x-test.js';

describe.only('this wrapper exercises describe only logic', () => {
  describe.skip('this wrapper exercises describe skip logic', () => {
    it('this tests shows inheritance of outer grouping skip directive', () => {
      assert(false); // this shouldn't get run.
    });
    it.only('this tests that inner flags override outer ones', () => {
      assert(true);
    });
  });
  describe.todo('this wrapper exercises describe todo logic', () => {
    it('this tests shows inheritance of outer grouping todo directive', () => {
      assert(false, 'this error is expected');
    });
  });
  it.skip('this simply exercises the skip logic for coverage', () => {
    assert(false); // shouldn't get run
  });
  describe('this wrapper allows inner tests to declare their own flags', () => {
    it.todo('this simply exercises the todo logic for coverage', () => {
      assert(false, 'this error is expected');
    });
    it.only('this simply exercises the only logic for coverage', () => {
      assert(true);
    });
  });
});
