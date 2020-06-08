import { it, assert, __Tap__ } from '../x-test.js';

it('version line is correct', () => {
  assert(__Tap__.version() === 'TAP Version 13');
});

it('diagnostic works', () => {
  assert(__Tap__.diagnostic('my message') === '# my message');
});

it('testLine works', () => {
  assert(__Tap__.testLine(true, 1, 'first test') === 'ok - 1 first test');
  assert(__Tap__.testLine(false, 1, 'first test') === 'not ok - 1 first test');
  assert(__Tap__.testLine(false, 1, 'first test', 'TODO') === 'not ok - 1 first test # TODO');
});

it('yaml works', () => {
  const expected = `  ---
  message: my message
  severity: error
  stack: |-
    one
    two
    three
  ...`;
  assert(__Tap__.yaml('my message', 'error', { stack: 'one\ntwo\nthree'}) === expected);
});

it('bailOut works', () => {
  assert(__Tap__.bailOut('oh no!') === 'Bail out! oh no!');
});

it('plan works', () => {
  assert(__Tap__.plan(999) === '1..999');
});
