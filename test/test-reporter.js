import { test, suite, assert } from '../x-test.js';
import { XTestReporter } from '../x-test-reporter.js';

suite('render', () => {
  test('prints out basic test', () => {
    const tap = [
      'TAP version 14',
      '# Subtest: http://127.0.0.1:8080/test/',
      '    # Subtest: level 1',
      '        ok 1 - first test',
      '        ok 2 - second test',
      '        not ok 3 - third test',
      '          ---',
      '          message: this error is expected',
      '          severity: todo',
      '          stack: |-',
      '            Error: this error is expected',
      '                at XTestFrame.assert (http://127.0.0.1:8080/x-test.js:1320:15)',
      '                at assert (http://127.0.0.1:8080/x-test.js:5:48)',
      '                at http://127.0.0.1:8080/test/test-scratch.js:22:7',
      '                at XTestFrame.onRun (http://127.0.0.1:8080/x-test.js:1287:31)',
      '                at http://127.0.0.1:8080/x-test.js:1251:22',
      '          ...',
      '        1..3',
      '    not ok 1 - level 1',
      '    1..1',
      'not ok 1 - http://127.0.0.1:8080/test/',
      '1..1',
    ];
    const element = document.createElement('x-test-reporter');
    document.body.append(element);
    element.tap(...tap);
    assert(element.shadowRoot.getElementById('container').textContent === tap.join(''));
    assert(element.getAttribute('ok') === null);
    element.remove();
  });

  test('bails', () => {
    const tap = [
      'TAP version 14',
      '# Subtest: http://127.0.0.1:8080/test/',
      '    # these',
      '    # are',
      '    # comments ',
      'Bail out! http://127.0.0.1:8080/test/',
    ];
    const element = document.createElement('x-test-reporter');
    document.body.append(element);
    element.tap(...tap);
    assert(element.shadowRoot.getElementById('container').textContent === tap.join(''));
    assert(element.getAttribute('ok') === null);
    element.remove();
  });
});

suite('parse', () => {
  test('parses test', () => {
    const output = '# Subtest: http://example.com/test.html';
    const result = XTestReporter.parse(output);
    assert(result.tag === 'a');
    assert(Object.keys(result.properties).length === 2);
    assert(result.properties.href === 'http://example.com/test.html');
    assert(result.properties.innerText === output);
    assert(Object.keys(result.attributes).length === 2);
    assert(result.attributes.output === '');
    assert(result.attributes.subtest === '');
    assert(result.done === false);
    assert(result.failed === false);
  });

  test('parses bail test', () => {
    const output = 'Bail out! http://example.com/test.html';
    const result = XTestReporter.parse(output);
    assert(result.tag === 'a');
    assert(Object.keys(result.properties).length === 2);
    assert(result.properties.href === 'http://example.com/test.html');
    assert(result.properties.innerText === output);
    assert(Object.keys(result.attributes).length === 3);
    assert(result.attributes.output === '');
    assert(result.attributes.subtest === '');
    assert(result.attributes.bail === '');
    assert(result.done === false);
    assert(result.failed === true);
  });

  test('parses diagnostic', () => {
    const output = '# something, anything';
    const result = XTestReporter.parse(output);
    assert(result.tag === 'div');
    assert(Object.keys(result.properties).length === 1);
    assert(result.properties.innerText === output);
    assert(Object.keys(result.attributes).length === 2);
    assert(result.attributes.output === '');
    assert(result.attributes.diagnostic === '');
    assert(result.done === false);
    assert(result.failed === false);
  });

  test('parses test line', () => {
    const output = 'ok 145 - this cool thing i tested';
    const result = XTestReporter.parse(output);
    assert(result.tag === 'div');
    assert(Object.keys(result.properties).length === 1);
    assert(result.properties.innerText === output);
    assert(Object.keys(result.attributes).length === 3);
    assert(result.attributes.output === '');
    assert(result.attributes.test === '');
    assert(result.attributes.ok === '');
    assert(result.done === false);
    assert(result.failed === false);
  });

  test('parses "SKIP" test line', () => {
    const output = 'ok 145 - this cool thing i tested # SKIP';
    const result = XTestReporter.parse(output);
    assert(result.tag === 'div');
    assert(Object.keys(result.properties).length === 1);
    assert(result.properties.innerText === output);
    assert(Object.keys(result.attributes).length === 4);
    assert(result.attributes.output === '');
    assert(result.attributes.test === '');
    assert(result.attributes.ok === '');
    assert(result.attributes.directive === 'skip');
    assert(result.done === false);
    assert(result.failed === false);
  });

  test('parses "TODO" test line', () => {
    const output = 'ok 145 - this cool thing i tested # TODO';
    const result = XTestReporter.parse(output);
    assert(result.tag === 'div');
    assert(Object.keys(result.properties).length === 1);
    assert(result.properties.innerText === output);
    assert(Object.keys(result.attributes).length === 4);
    assert(result.attributes.output === '');
    assert(result.attributes.test === '');
    assert(result.attributes.ok === '');
    assert(result.attributes.directive === 'todo');
    assert(result.done === false);
    assert(result.failed === false);
  });

  test('parses "not ok" test line', () => {
    const output = 'not ok 145 - this cool thing i tested';
    const result = XTestReporter.parse(output);
    assert(result.tag === 'div');
    assert(Object.keys(result.properties).length === 1);
    assert(result.properties.innerText === output);
    assert(Object.keys(result.attributes).length === 2);
    assert(result.attributes.output === '');
    assert(result.attributes.test === '');
    assert(result.done === false);
    assert(result.failed === true);
  });

  test('parses "not ok", "TODO" test line', () => {
    const output = 'not ok 145 - this cool thing i tested # TODO tbd...';
    const result = XTestReporter.parse(output);
    assert(result.tag === 'div');
    assert(Object.keys(result.properties).length === 1);
    assert(result.properties.innerText === output);
    assert(Object.keys(result.attributes).length === 3);
    assert(result.attributes.output === '');
    assert(result.attributes.test === '');
    assert(result.attributes.directive === 'todo');
    assert(result.done === false);
    assert(result.failed === false);
  });

  test('parses version', () => {
    const output = 'TAP version 14';
    const result = XTestReporter.parse(output);
    assert(result.tag === 'div');
    assert(Object.keys(result.properties).length === 1);
    assert(result.properties.innerText === output);
    assert(Object.keys(result.attributes).length === 2);
    assert(result.attributes.output === '');
    assert(result.attributes.version === '');
    assert(result.done === false);
    assert(result.failed === false);
  });

  test('parses diagnostic that looks like a URL', () => {
    const output = '# http://example.com/test.html';
    const result = XTestReporter.parse(output);
    assert(result.tag === 'div');
    assert(result.attributes.diagnostic === '');
    assert(result.attributes.failure === undefined);
  });

  test('parses non-URL "Bail out!" line', () => {
    const output = 'Bail out! something went wrong';
    const result = XTestReporter.parse(output);
    assert(result.tag === 'div');
    assert(result.attributes.output === '');
    assert(result.attributes.bail === '');
    assert(result.done === false);
    assert(result.failed === true);
  });
});

suite('interactions', () => {
  test('toggle opens and closes', () => {
    const element = document.createElement('x-test-reporter');
    document.body.append(element);
    const toggle = element.shadowRoot.getElementById('toggle');
    // connectedCallback opens it by default; close then reopen
    assert(element.hasAttribute('open'), 'starts open');
    toggle.click();
    assert(!element.hasAttribute('open'), 'closes on click');
    toggle.click();
    assert(element.hasAttribute('open'), 'reopens on click');
    element.remove();
  });

  test('tap marks done when plan is at root level', () => {
    const element = document.createElement('x-test-reporter');
    document.body.append(element);
    element.tap('TAP version 14', '1..1', 'ok 1 - test');
    assert(!element.hasAttribute('testing'), 'testing attribute removed after root plan');
    assert(element.hasAttribute('ok'), 'ok attribute present');
    element.remove();
  });

  test('tap marks not-ok on failed test', () => {
    const element = document.createElement('x-test-reporter');
    document.body.append(element);
    element.tap('TAP version 14', 'not ok 1 - bad test', '1..1');
    assert(!element.hasAttribute('ok'), 'ok attribute removed after failure');
    element.remove();
  });

  test('resize via pointermove changes height', () => {
    const element = document.createElement('x-test-reporter');
    document.body.append(element);
    element.setAttribute('open', '');
    const header = element.shadowRoot.getElementById('header');
    header.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, bubbles: true }));
    assert(element.hasAttribute('dragging'), 'dragging attribute set on pointerdown');
    dispatchEvent(new PointerEvent('pointermove', { clientY: 90, bubbles: true }));
    dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    assert(!element.hasAttribute('dragging'), 'dragging attribute removed on pointerup');
    element.remove();
  });
});
