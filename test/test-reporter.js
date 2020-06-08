import { it, assert, __XTestReporter__ } from '../x-test.js';

it('parses test', () => {
  const output = '# http://example.com/test.html';
  const result = __XTestReporter__.parseOutput(output);
  assert(result.tag === 'a');
  assert(Object.keys(result.properties).length === 2);
  assert(result.properties.href === 'http://example.com/test.html');
  assert(result.properties.innerText === output);
  assert(Object.keys(result.attributes).length === 2);
  assert(result.attributes.output === '');
  assert(result.attributes.test === '');
  assert(result.done === false);
  assert(result.failed === false);
});

it('parses bail test', () => {
  const output = 'Bail out! http://example.com/test.html';
  const result = __XTestReporter__.parseOutput(output);
  assert(result.tag === 'a');
  assert(Object.keys(result.properties).length === 2);
  assert(result.properties.href === 'http://example.com/test.html');
  assert(result.properties.innerText === output);
  assert(Object.keys(result.attributes).length === 3);
  assert(result.attributes.output === '');
  assert(result.attributes.test === '');
  assert(result.attributes.bail === '');
  assert(result.done === false);
  assert(result.failed === true);
});

it('parses diagnostic', () => {
  const output = '# something, anything';
  const result = __XTestReporter__.parseOutput(output);
  assert(result.tag === 'div');
  assert(Object.keys(result.properties).length === 1);
  assert(result.properties.innerText === output);
  assert(Object.keys(result.attributes).length === 2);
  assert(result.attributes.output === '');
  assert(result.attributes.diagnostic === '');
  assert(result.done === false);
  assert(result.failed === false);
});

it('parses test line', () => {
  const output = 'ok - 145 this cool thing i tested';
  const result = __XTestReporter__.parseOutput(output);
  assert(result.tag === 'div');
  assert(Object.keys(result.properties).length === 1);
  assert(result.properties.innerText === output);
  assert(Object.keys(result.attributes).length === 3);
  assert(result.attributes.output === '');
  assert(result.attributes.it === '');
  assert(result.attributes.ok === '');
  assert(result.done === false);
  assert(result.failed === false);
});

it('parses "SKIP" test line', () => {
  const output = 'ok - 145 this cool thing i tested # SKIP';
  const result = __XTestReporter__.parseOutput(output);
  assert(result.tag === 'div');
  assert(Object.keys(result.properties).length === 1);
  assert(result.properties.innerText === output);
  assert(Object.keys(result.attributes).length === 4);
  assert(result.attributes.output === '');
  assert(result.attributes.it === '');
  assert(result.attributes.ok === '');
  assert(result.attributes.directive === 'skip');
  assert(result.done === false);
  assert(result.failed === false);
});

it('parses "TODO" test line', () => {
  const output = 'ok - 145 this cool thing i tested # TODO';
  const result = __XTestReporter__.parseOutput(output);
  assert(result.tag === 'div');
  assert(Object.keys(result.properties).length === 1);
  assert(result.properties.innerText === output);
  assert(Object.keys(result.attributes).length === 4);
  assert(result.attributes.output === '');
  assert(result.attributes.it === '');
  assert(result.attributes.ok === '');
  assert(result.attributes.directive === 'todo');
  assert(result.done === false);
  assert(result.failed === false);
});

it('parses "not ok" test line', () => {
  const output = 'not ok - 145 this cool thing i tested';
  const result = __XTestReporter__.parseOutput(output);
  assert(result.tag === 'div');
  assert(Object.keys(result.properties).length === 1);
  assert(result.properties.innerText === output);
  assert(Object.keys(result.attributes).length === 2);
  assert(result.attributes.output === '');
  assert(result.attributes.it === '');
  assert(result.done === false);
  assert(result.failed === true);
});

it('parses "not ok", "TODO" test line', () => {
  const output = 'not ok - 145 this cool thing i tested # TODO tbd...';
  const result = __XTestReporter__.parseOutput(output);
  assert(result.tag === 'div');
  assert(Object.keys(result.properties).length === 1);
  assert(result.properties.innerText === output);
  assert(Object.keys(result.attributes).length === 3);
  assert(result.attributes.output === '');
  assert(result.attributes.it === '');
  assert(result.attributes.directive === 'todo');
  assert(result.done === false);
  assert(result.failed === false);
});

it('parses version', () => {
  const output = 'TAP version 13';
  const result = __XTestReporter__.parseOutput(output);
  assert(result.tag === 'div');
  assert(Object.keys(result.properties).length === 1);
  assert(result.properties.innerText === output);
  assert(Object.keys(result.attributes).length === 2);
  assert(result.attributes.output === '');
  assert(result.attributes.version === '');
  assert(result.done === false);
  assert(result.failed === false);
});
