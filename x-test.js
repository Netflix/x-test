/**
* Simple assertion which throws exception when not "ok".
*   assert('foo' === 'bar', 'foo does not equal bar');
*/
export const assert = (ok, text) => XTestSuite.assert(suiteContext, ok, text);

/**
* Register coverage percentage goal for a given file.
*   coverage('../foo.js', 87);
*/
export const coverage = (href, goal) => XTestSuite.coverage(suiteContext, href, goal);

/**
* Force test suite registration to remain open until promise resolves.
*   const barsPromise = fetch('https://foo/api/v2/bars').then(response => response.json());
*   waitFor(barsPromise);
*/
export const waitFor = promise => XTestSuite.waitFor(suiteContext, promise);

/**
* Register a test to be run as a subsequent test suite.
*   test('./test-sibling.html');
*/
export const test = href => XTestSuite.test(suiteContext, href);

/**
* Register a grouping. Alternatively, mark with flags.
*/
export const describe = (text, callback) => XTestSuite.describe(suiteContext, text, callback);
describe.skip = (text, callback) => XTestSuite.describeSkip(suiteContext, text, callback);
describe.only = (text, callback) => XTestSuite.describeOnly(suiteContext, text, callback);
describe.todo = (text, callback) => XTestSuite.describeTodo(suiteContext, text, callback);

/**
* Register an individual test lint. Alternatively, mark with flags.
*/
export const it = (text, callback, interval) => XTestSuite.it(suiteContext, text, callback, interval);
it.skip = (text, callback, interval) => XTestSuite.itSkip(suiteContext, text, callback, interval);
it.only = (text, callback, interval) => XTestSuite.itOnly(suiteContext, text, callback, interval);
it.todo = (text, callback, interval) => XTestSuite.itTodo(suiteContext, text, callback, interval);

// Internal Interface. This is exposed for testing purposes only.
export { XTestRoot as __XTestRoot__, XTestReporter as __XTestReporter__, XTestTap as __XTestTap__, XTestSuite as __XTestSuite__ };

// https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuid() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

function publish(type, data) {
  top.postMessage({ type, data }, '*');
}

function subscribe(callback) {
  top.addEventListener('message', callback);
}

function addErrorListener(callback) {
  addEventListener('error', callback);
}

function addUnhandledrejectionListener(callback) {
  addEventListener('unhandledrejection', callback);
}

async function timeout(interval) {
  interval = interval ?? 30000;
  await new Promise((resolve, reject) => {
    setTimeout(() => { reject(new Error(`timeout after ${interval}ms`)); }, interval);
  });
}

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    position: fixed;
    z-index: 1;
    left: 0;
    bottom: 0;
    width: 100vw;
    height: 400px;
    background-color: var(--black);
    max-height: 100vh;
    min-height: var(--header-height);
    font-family: monospace;
    --header-height: 40px;
    --black: #111111;
    --white: white;
    --subdued: #8C8C8C;
    --version: #39CCCC;
    --todo: #FF851B;
    --todone: #FFDC00;
    --skip: #FF851B;
    --ok: #2ECC40;
    --not-ok: #FF4136;
    --subtest: #4D4D4D;
    --plan: #39CCCC;
    --link: #0085ff;
  }
  :host(:not([open])) {
    max-height: var(--header-height);
  }

  #header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: var(--header-height);
    flex-shrink: 0;
    box-shadow: inset 0 -1px 0 0 #484848, 0 1px 2px 0 #484848;
    padding-right: 38px;
    background-color: var(--x-test-reporter-background-color);
  }
  :host([open]) #header {
    cursor: grab;
  }
  :host([open][dragging]) #header {
    cursor: grabbing;
  }

  #toggle {
    position: fixed;
    bottom: 7px;
    right: 12px;
    font: inherit;
    margin: 0;
    border: none;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 26px;
    width: 26px;
    cursor: pointer;
    --color: var(--subdued);
    color: var(--color);
    background-color: transparent;
    box-shadow: inset 0 0 0 1px var(--color);
  }
  #toggle:hover,
  #toggle:focus-visible {
    --color: var(--white);
  }
  #toggle:active {
    --color: var(--subdued);
  }
  #toggle::before {
    content: "↑";
  }
  :host([open]) #toggle::before {
    content: "↓";
  }

  #result {
    margin: auto 12px;
    padding: 6px 16px;
    border-radius: 4px;
    line-height: 14px;
    color: var(--white);
    background-color: var(--todo);
    user-select: none;
    pointer-events: none;
    white-space: nowrap;
  }
  #result::before {
    content: "TESTING...";
  }
  :host(:not([ok])) #result {
    background-color: var(--not-ok);
  }
  :host(:not([ok])) #result::before {
    content: "NOT OK!";
  }
  :host([ok]:not([testing])) #result {
    background-color: var(--ok);
  }
  :host([ok]:not([testing])) #result::before {
    content: "OK!";
  }

  #tag-line {
    margin: auto 12px;
    color: var(--subdued);
    cursor: default;
    user-select: none;
    pointer-events: none;
  }

  #body {
    flex: 1;
    overflow: auto;
    display: flex;
    /* Flip top/bottom for console-like scroll behavior. */
    flex-direction: column-reverse;
    box-sizing: border-box;
  }
  :host([dragging]) #body {
    pointer-events: none;
  }

  #spacer {
    flex: 1;
  }

  [output] {
    white-space: pre;
    color: var(--subdued);
    line-height: 20px;
    padding: 0 12px;
    cursor: default;
  }
  [output]:first-child {
    padding-top: 12px;
  }
  [output]:last-child {
    padding-bottom: 12px;
  }

  [yaml] {
    line-height: 16px;
  }

  a[output]:any-link {
    display: block;
    width: min-content;
    cursor: pointer;
  }

  [it][ok]:not([directive]) {
    color: var(--ok);
  }
  [it]:not([ok]):not([directive]),
  [bail] {
    color: var(--not-ok);
  }
  [it][ok][directive="skip"] {
    color: var(--skip);
  }
  [it]:not([ok])[directive="todo"] {
    color: var(--todo);
  }
  [it][ok][directive="todo"] {
    color: var(--todone);
  }

  [plan][indent],
  [plan] + [it][ok]:not([directive]),
  [plan] + [it]:not([ok]):not([directive]),
  [plan] + [it][ok][directive="skip"],
  [plan] + [it]:not([ok])[directive="todo"],
  [plan] + [it][ok][directive="todo"] {
    color: var(--subdued);
  }

  [version] {
    color: var(--version);
  }

  [plan] {
    color: var(--plan);
  }

  a[subtest]:not([bail]) {
    color: var(--link);
  }

  [subtest]:not([bail]) {
    color: var(--subdued);
  }

  [indent] {
    position: relative;
  }
  [indent]::before {
    position: absolute;
    content: attr(indent);
    color: var(--subdued);
    opacity: 0.25;
  }
`);

const template = document.createElement('template');
template.setHTMLUnsafe(`
  <div id="header"><div id="result"></div><div id="tag-line">x-test - a simple, tap-compliant test runner for the browser.</div></div>
  <div id="body"><div id="spacer"></div><div id="container"></div></div>
  <button id="toggle" type="button"></button>
`);

class XTestReporter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [styleSheet];
    this.shadowRoot.append(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.setAttribute('ok', '');
    this.setAttribute('testing', '');
    this.style.height = localStorage.getItem('x-test-reporter-height');
    if (localStorage.getItem('x-test-reporter-closed') !== 'true') {
      this.setAttribute('open', '');
    }
    this.shadowRoot.getElementById('toggle').addEventListener('click', () => {
      this.hasAttribute('open') ? this.removeAttribute('open') : this.setAttribute('open', '');
      localStorage.setItem('x-test-reporter-closed', String(!this.hasAttribute('open')));
    });
    const resize = event => {
      const nextHeaderY = event.clientY - Number(this.getAttribute('dragging'));
      const currentHeaderY = this.shadowRoot.getElementById('header').getBoundingClientRect().y;
      const currentHeight = this.getBoundingClientRect().height;
      this.style.height = `${Math.round(currentHeight + currentHeaderY - nextHeaderY)}px`;
      localStorage.setItem('x-test-reporter-height', this.style.height);
    };
    this.shadowRoot.getElementById('header').addEventListener('pointerdown', event => {
      if (this.hasAttribute('open')) {
        const headerY = this.shadowRoot.getElementById('header').getBoundingClientRect().y;
        const clientY = event.clientY;
        this.setAttribute('dragging', String(clientY - headerY));
        addEventListener('pointermove', resize);
        for (const iframe of document.querySelectorAll('iframe')) {
          iframe.style.pointerEvents = 'none';
        }
      }
    });
    addEventListener('pointerup', () => {
      removeEventListener('pointermove', resize);
      this.removeAttribute('dragging');
      for (const iframe of document.querySelectorAll('iframe')) {
        iframe.style.pointerEvents = null;
      }
    });
  }

  tap(...tap) {
    const items = [];
    const container = this.shadowRoot.getElementById('container');
    for (const text of tap) {
      const { tag, properties, attributes, failed, done } = XTestReporter.parse(text);
      const element = document.createElement(tag);
      Object.assign(element, properties);
      for (const [attribute, value] of Object.entries(attributes)) {
        element.setAttribute(attribute, value);
      }
      if (done) {
        this.removeAttribute('testing');
      }
      if (failed) {
        this.removeAttribute('ok');
      }
      items.push(element);
    }
    container.append(...items);
  }

  static parse(text) {
    const result = { tag: '', properties: {}, attributes: {}, failed: false, done: false };
    result.properties.innerText = text;
    const indentMatch = text.match(/^((?: {4})+)/);
    if (indentMatch) {
      const lines = text.split('\n').length - 1;
      const indent = indentMatch[1].replace(/ {4}/g, '\u00a6   ');
      result.attributes.indent = lines ? `${`${indent}\n`.repeat(lines)}${indent}` : indent;
    }
    if (text.match(/^(?: {4})*# Subtest: https?:.*/)) {
      result.tag = 'a';
      const href = text.replace(/^(?: {4})*# Subtest: /, '');
      result.properties.href = href;
      Object.assign(result.attributes, { output: '', subtest: '' });
    } else if (text.match(/^Bail out! https?:.*/)) {
      result.tag = 'a';
      result.failed = true;
      const href = text.replace(/Bail out! /, '');
      result.properties.href = href;
      Object.assign(result.attributes, { output: '', subtest: '', bail: '' });
    } else {
      result.tag = 'div';
      result.attributes.output = '';
      if (text.match(/^(?: {4})*# Subtest:/)) {
        result.attributes.subtest = '';
      } else if (text.match(/^(?: {4})*# /)) {
        result.attributes.diagnostic = '';
      } else if (text.match(/^(?: {4})*ok /)) {
        Object.assign(result.attributes, { it: '', ok: '' });
        if (text.match(/^(?: {4})*[^ #][^#]* # SKIP/)) {
          result.attributes.directive = 'skip';
        } else if (text.match(/^(?: {4})*[^ #][^#]* # TODO/)) {
          result.attributes.directive = 'todo';
        }
      } else if (text.match(/^(?: {4})*not ok /)) {
        result.attributes.it = '';
        if (text.match(/^(?: {4})*[^ #][^#]* # TODO/)) {
          result.attributes.directive = 'todo';
        } else {
          result.failed = true;
        }
      } else if (text.match(/^(?: {4})* {2}---/)) {
        result.attributes.yaml = '';
      } else if (text.match(/^TAP/)) {
        result.attributes.version = '';
      } else if (text.match(/^(?: {4})*1\.\.\d*/)) {
        result.attributes.plan = '';
        if (!indentMatch) {
          result.done = true;
        }
      } else if (text.match(/^(?: {4})*Bail out!.*/)) {
        result.attributes.bail = '';
        result.failed = true;
      }
    }
    return result;
  }
}
customElements.define('x-test-reporter', XTestReporter);

class XTestRoot {
  static initialize(context, href) {
    const url = new URL(href);
    if (!url.searchParams.get('x-test-no-reporter')) {
      context.state.reporter = new XTestReporter();
      document.body.append(context.state.reporter);
    }
    context.state.coverage = url.searchParams.get('x-test-run-coverage') === '';
    context.state.coverageValuePromise = new Promise(resolve => {
      context.state.resolveCoverageValuePromise = value => {
        context.state.coverageValue = value;
        resolve(context.state.coverageValue);
      };
    });
    const versionStepId = context.uuid();
    const exitStepId = context.uuid();
    context.state.stepIds.push(versionStepId, exitStepId);
    context.state.steps[versionStepId] = { stepId: versionStepId, type: 'version', status: 'waiting' };
    context.state.steps[exitStepId] = { stepId: exitStepId, type: 'exit', status: 'waiting' };
    context.subscribe(event => {
      switch (event.data.type) {
        case 'x-test-client-ping':
          XTestRoot.onPing(context, event);
          break;
        case 'x-test-client-coverage-result':
          XTestRoot.onCoverageResult(context, event);
          break;
        case 'x-test-suite-register':
          XTestRoot.onRegister(context, event);
          break;
        case 'x-test-suite-ready':
          XTestRoot.onReady(context, event);
          break;
        case 'x-test-suite-result':
          XTestRoot.onResult(context, event);
          break;
        case 'x-test-suite-bail':
          XTestRoot.onBail(context, event);
          break;
      }
      XTestRoot.check(context);
    });

    // Run own tests in iframe.
    url.searchParams.delete('x-test-no-reporter');
    url.searchParams.delete('x-test-run-coverage');
    context.publish('x-test-suite-register', { type: 'test', testId: context.uuid(), href: url.href });
  }

  static onPing(context/*, event*/) {
    context.publish('x-test-root-pong', { ended: context.state.ended, waiting: context.state.waiting });
  }

  static onBail(context, event) {
    if (!context.state.ended) {
      XTestRoot.bail(context, event.data.data.error, { testId: event.data.data.testId });
    }
  }

  static registerTest(context, data) {
    if (!context.state.ended) {
      const testId = data.testId;
      // New "test" (to be opened in its own iframe). Queue it up.
      const initiatorTestId = data.initiatorTestId;
      const siblingTestEndIndex = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-end' && context.state.tests[candidate.testId].initiatorTestId === initiatorTestId) {
          return true;
        }
      });
      const parentTestEndIndex = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-end' && context.state.tests[candidate.testId].testId === initiatorTestId) {
          return true;
        }
      });
      const coverageIndex = context.state.stepIds.findIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'coverage') {
          return true;
        }
      });
      const exitIndex = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'exit') {
          return true;
        }
      });
      const index = siblingTestEndIndex === -1
        ? parentTestEndIndex === -1
          ? coverageIndex === -1
            ? exitIndex
            : coverageIndex
          : parentTestEndIndex + 1
        : siblingTestEndIndex + 1;
      const lastSiblingChildrenIndex = context.state.children.findLastIndex(candidate => {
        return candidate.type === 'test' && context.state.tests[candidate.testId].initiatorTestId === initiatorTestId;
      });
      const parentTestChildrenIndex = context.state.children.findLastIndex(candidate => {
        return candidate.type === 'test' && context.state.tests[candidate.testId].testId === initiatorTestId;
      });
      const firstCoverageChildrenIndex = context.state.children.findIndex(candidate => {
        return candidate.type === 'coverage';
      });
      const childrenIndex = lastSiblingChildrenIndex === -1
        ? parentTestChildrenIndex === -1
          ? firstCoverageChildrenIndex === -1
            ? context.state.children.length
            : firstCoverageChildrenIndex
          : parentTestChildrenIndex + 1
        : lastSiblingChildrenIndex + 1;
      const testStartStepId = context.uuid();
      const testPlanStepId = context.uuid();
      const testEndStepId = context.uuid();
      context.state.stepIds.splice(index, 0, testStartStepId, testPlanStepId, testEndStepId);
      context.state.steps[testStartStepId] = { stepId: testStartStepId, type: 'test-start', testId, status: 'waiting' };
      context.state.steps[testPlanStepId] = { stepId: testPlanStepId, type: 'test-plan', testId, status: 'waiting' };
      context.state.steps[testEndStepId] = { stepId: testEndStepId, type: 'test-end', testId, status: 'waiting' };
      context.state.tests[testId] = { ...data, children: [] };
      context.state.children.splice(childrenIndex, 0, { type: 'test', testId });
    }
  }

  static registerDescribeStart(context, data) {
    if (!context.state.ended) {
      // New "describe-start" (to mark the start of a subtest). Queue it up.
      const stepId = context.uuid();
      const describeId = data.describeId;
      const index = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-plan' && candidate.testId === data.parents[0].testId) {
          return true;
        }
      });
      context.state.stepIds.splice(index, 0, stepId);
      context.state.steps[stepId] = { stepId, type: 'describe-start', describeId: data.describeId, status: 'waiting' };
      context.state.describes[describeId] = { ...data, children: [] };
      if (data.parents.at(-1)?.type === 'describe') {
        context.state.describes[data.parents.at(-1).describeId].children.push({ type: 'describe', describeId });
      } else {
        context.state.tests[data.parents.at(-1).testId].children.push({ type: 'describe', describeId });
      }
    }
  }

  static registerDescribeEnd(context, data) {
    if (!context.state.ended) {
      // Completed "describe-end" (to mark the end of a subtest). Queue it up.
      const planStepId = context.uuid();
      const endStepId = context.uuid();
      const describe = context.state.describes[data.describeId]; // eslint-disable-line no-shadow
      const index = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-plan' && candidate.testId === describe.parents[0].testId) {
          return true;
        }
      });
      context.state.stepIds.splice(index, 0, planStepId, endStepId);
      context.state.steps[planStepId] = { stepId: planStepId, type: 'describe-plan', describeId: data.describeId, status: 'waiting' };
      context.state.steps[endStepId] = { stepId: endStepId, type: 'describe-end', describeId: data.describeId, status: 'waiting' };
    }
  }

  static registerIt(context, data) {
    if (!context.state.ended) {
      // New "it" (to be run as part of a test suite). Queue it up.
      const stepId = context.uuid();
      const itId = data.itId;
      const index = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-plan' && candidate.testId === data.parents[0].testId) {
          return true;
        }
      });
      context.state.stepIds.splice(index, 0, stepId);
      context.state.steps[stepId] = { stepId, type: 'it', itId: data.itId, status: 'waiting' };
      context.state.its[itId] = data;
      if (data.parents.at(-1)?.type === 'describe') {
        context.state.describes[data.parents.at(-1).describeId].children.push({ type: 'it', itId });
      } else {
        context.state.tests[data.parents.at(-1).testId].children.push({ type: 'it', itId });
      }
    }
  }

  static registerCoverage(context, data) {
    if (!context.state.ended) {
      // New "coverage" goal. Queue it up.
      const stepId = context.uuid();
      const coverageId = data.coverageId;
      const index = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'exit') {
          return true;
        }
      });
      context.state.stepIds.splice(index, 0, stepId);
      context.state.steps[stepId] = { stepId, type: 'coverage', coverageId: coverageId, status: 'waiting' };
      context.state.coverages[coverageId] = data;
      const childrenIndex = context.state.children.length;
      context.state.children.splice(childrenIndex, 0, { type: 'coverage', coverageId });
    }
  }

  static onRegister(context, event) {
    if (!context.state.ended) {
      const data = event.data.data;
      switch(data.type) {
        case 'test':
          XTestRoot.registerTest(context, data);
          break;
        case 'describe-start':
          XTestRoot.registerDescribeStart(context, data);
          break;
        case 'describe-end':
          XTestRoot.registerDescribeEnd(context, data);
          break;
        case 'it':
          XTestRoot.registerIt(context, data);
          break;
        case 'coverage':
          XTestRoot.registerCoverage(context, data);
          break;
        default:
          throw new Error(`Unexpected registration type "${data.type}".`);
      }
    }
  }

  static onReady(context, event) {
    if (!context.state.ended) {
      const data = event.data.data;
      const only = (
        Object.values(context.state.its).some(candidate => {
          return candidate.only && candidate.parents[0].testId === data.testId;
        }) ||
        Object.values(context.state.describes).some(candidate => {
          return candidate.only && candidate.parents[0].testId === data.testId;
        })
      );
      if (only) {
        for (const it of Object.values(context.state.its)) { // eslint-disable-line no-shadow
          if (it.parents[0].testId === data.testId) {
            if (!it.only) {
              const describeParents = it.parents
                .filter(candidate => candidate.type === 'describe')
                .map(parent => context.state.describes[parent.describeId]);
              const hasOnlyDescribeParent = describeParents.some(candidate => candidate.only);
              if (!hasOnlyDescribeParent) {
                it.directive = 'SKIP';
              } else if (!it.directive) {
                const lastDescribeParentWithDirective = describeParents.findLast(candidate => !!candidate.directive);
                if (lastDescribeParentWithDirective) {
                  it.directive = lastDescribeParentWithDirective.directive;
                }
              }
            }
          }
        }
      } else {
        for (const it of Object.values(context.state.its)) { // eslint-disable-line no-shadow
          if (it.parents[0].testId === data.testId) {
            if (!it.directive) {
              const describeParents = it.parents
                .filter(candidate => candidate.type === 'describe')
                .map(parent => context.state.describes[parent.describeId]);
              const lastDescribeParentWithDirective = describeParents.findLast(candidate => !!candidate.directive);
              if (lastDescribeParentWithDirective) {
                it.directive = lastDescribeParentWithDirective.directive;
              }
            }
          }
        }
      }
      const stepId = context.state.stepIds.find(candidateId => {
        const candidate = context.state.steps[candidateId];
        return candidate.type === 'test-start' && candidate.testId === data.testId;
      });
      const step = context.state.steps[stepId];
      if (step.status !== 'running') {
        throw new Error('test to ready is not running');
      }
      const href = XTestRoot.href(context, stepId);
      const level = XTestRoot.level(context, stepId);
      const tap = XTestTap.subtest(href, level);
      XTestRoot.output(context, stepId, tap);
      step.status = 'done';
    }
  }

  static onResult(context, event) {
    if (!context.state.ended) {
      const data = event.data.data;
      const it = context.state.its[data.itId]; // eslint-disable-line no-shadow
      const stepId = context.state.stepIds.find(candidateId => {
        const candidate = context.state.steps[candidateId];
        return candidate.type === 'it' && candidate.itId === it.itId;
      });
      const step = context.state.steps[stepId];
      if (step.status !== 'running') {
        throw new Error('step to complete is not running');
      }
      Object.assign(it, { ok: data.ok, error: data.error });
      step.status = 'done';
      const ok = XTestRoot.ok(context, stepId);
      const number = XTestRoot.number(context, stepId);
      const text = XTestRoot.text(context, stepId);
      const directive = XTestRoot.directive(context, stepId);
      const level = XTestRoot.level(context, stepId);
      const tap = XTestTap.testLine(ok, number, text, directive, level);
      if (!data.error) {
        XTestRoot.output(context, stepId, tap);
      } else {
         const yaml = XTestRoot.yaml(context, stepId);
         const errorTap = XTestTap.yaml(yaml.message, yaml.severity, yaml.data, level);
         XTestRoot.output(context, stepId, tap, errorTap);
      }
    }
  }

  static onCoverageResult(context, event) {
    if (!context.state.ended) {
      context.state.resolveCoverageValuePromise(event.data.data);
    }
  }

  static kickoffVersion(context, stepId) {
    const tap = XTestTap.version();
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffDescribeStart(context, stepId) {
    const level = XTestRoot.level(context, stepId);
    const text = XTestRoot.text(context, stepId);
    const tap = XTestTap.subtest(text, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffDescribePlan(context, stepId) {
    const level = XTestRoot.level(context, stepId);
    const count = XTestRoot.count(context, stepId);
    const tap = XTestTap.plan(count, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffDescribeEnd(context, stepId) {
    const number = XTestRoot.number(context, stepId);
    const ok = XTestRoot.ok(context, stepId);
    const text = XTestRoot.text(context, stepId);
    const directive = XTestRoot.directive(context, stepId);
    const level = XTestRoot.level(context, stepId);
    const tap = XTestTap.testLine(ok, number, text, directive, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffTestStart(context, stepId) {
    // Destroy prior test. This keeps the final test around for debugging.
    const lastIframe = document.querySelector('iframe');
    lastIframe?.remove();
    // Create the new test.
    const step = context.state.steps[stepId];
    const href = XTestRoot.href(context, stepId);
    const iframe = document.createElement('iframe');
    iframe.addEventListener('error', () => {
      const error = new Error(`Failed to load ${href}`);
      XTestRoot.bail(context, error);
    });
    iframe.setAttribute('data-x-test-test-id', step.testId);
    Object.assign(iframe, { src: href });
    Object.assign(iframe.style, {
      border: 'none', backgroundColor: 'white', height: '100vh',
      width: '100vw', position: 'fixed', zIndex: '0', top: '0', left: '0',
    });
    document.body.append(iframe);
    step.status = 'running';
  }

  static kickoffTestPlan(context, stepId) {
    const count = XTestRoot.count(context, stepId);
    const level = XTestRoot.level(context, stepId);
    const tap = XTestTap.plan(count, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffTestEnd(context, stepId) {
    const number = XTestRoot.number(context, stepId);
    const ok = XTestRoot.ok(context, stepId);
    const text = XTestRoot.text(context, stepId);
    const directive = XTestRoot.directive(context, stepId);
    const level = XTestRoot.level(context, stepId);
    const tap = XTestTap.testLine(ok, number, text, directive, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffIt(context, stepId) {
    const step = context.state.steps[stepId];
    const { itId, directive, interval } = context.state.its[step.itId];
    context.publish('x-test-root-run', { itId, directive, interval });
    step.status = 'running';
  }

  static kickoffCoverage(context, stepId) {
    const step = context.state.steps[stepId];
    const coverage = context.state.coverages[step.coverageId]; // eslint-disable-line no-shadow
    if (context.state.coverageValue) {
      try {
        const analysis = XTestRoot.analyzeHrefCoverage(context.state.coverageValue.js, coverage.href, coverage.goal);
        Object.assign(coverage, { ok: analysis.ok, percent: analysis.percent, output: analysis.output });
      } catch (error) {
        Object.assign(coverage, { ok: false, percent: 0, output: '' });
        XTestRoot.bail(context, error);
      }
    } else {
      Object.assign(coverage, { ok: true, percent: 0, output: '', directive: 'SKIP' });
    }
    const ok = XTestRoot.ok(context, stepId);
    const number = XTestRoot.number(context, stepId);
    const text = XTestRoot.text(context, stepId);
    const directive = XTestRoot.directive(context, stepId);
    const level = XTestRoot.level(context, stepId);
    const tap = XTestTap.testLine(ok, number, text, directive, level);
    if (!ok) {
      const errorTap = XTestTap.diagnostic(coverage.output, level);
      XTestRoot.output(context, stepId, tap, errorTap);
    } else {
      XTestRoot.output(context, stepId, tap);
    }
    step.status = 'done';
  }

  static kickoffExit(context, stepId) {
    const count = XTestRoot.count(context, stepId);
    const tap = XTestTap.plan(count);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
    XTestRoot.end(context);
  }

  static requestCoverageValue(context) {
    context.state.waiting = true;
    Promise.race([context.state.coverageValuePromise, context.timeout(5000)])
      .then(() => { XTestRoot.check(context); })
      .catch(error => { XTestRoot.bail(context, error); });
    context.publish('x-test-root-coverage-request');
  }

  static check(context) {
    if (!context.state.ended) {
      // Look to see if any tests are running.
      const runningStepId = context.state.stepIds.find(candidateId => {
        return context.state.steps[candidateId].status === 'running';
      });
      if (!runningStepId) {
        // If nothing's running, find the first step that's waiting and run that.
        const stepId = context.state.stepIds.find(candidateId => {
          return context.state.steps[candidateId].status === 'waiting';
        });
        if (stepId) {
          const waitingStep = context.state.steps[stepId];
          switch (waitingStep.type) {
            case 'version':
              XTestRoot.kickoffVersion(context, stepId);
              XTestRoot.check(context);
              break;
            case 'describe-start':
              XTestRoot.kickoffDescribeStart(context, stepId);
              XTestRoot.check(context);
              break;
            case 'describe-plan':
              XTestRoot.kickoffDescribePlan(context, stepId);
              XTestRoot.check(context);
              break;
            case 'describe-end':
              XTestRoot.kickoffDescribeEnd(context, stepId);
              XTestRoot.check(context);
              break;
            case 'test-start':
              XTestRoot.kickoffTestStart(context, stepId);
              XTestRoot.check(context);
              break;
            case 'test-plan':
              XTestRoot.kickoffTestPlan(context, stepId);
              XTestRoot.check(context);
              break;
            case 'test-end':
              XTestRoot.kickoffTestEnd(context, stepId);
              XTestRoot.check(context);
              break;
            case 'it':
              XTestRoot.kickoffIt(context, stepId);
              XTestRoot.check(context);
              break;
            case 'coverage':
              if (!context.state.coverage || context.state.coverageValue) {
                XTestRoot.kickoffCoverage(context, stepId);
                XTestRoot.check(context);
              } else if (!context.state.waiting) {
                XTestRoot.requestCoverageValue(context);
              }
              break;
            case 'exit':
              XTestRoot.kickoffExit(context, stepId);
              break;
            default:
              throw new Error(`Unexpected step type "${waitingStep.type}".`);
          }
        }
      }
    }
  }

  static bail(context, error, options) {
    if (!context.state.ended) {
      if (error && error.stack) {
        XTestRoot.log(context, XTestTap.diagnostic(error.stack));
      }
      if (options?.testId) {
        const test = context.state.tests[options.testId]; // eslint-disable-line no-shadow
        test.error = error;
        const href = test.href;
        XTestRoot.log(context, XTestTap.bailOut(href));
      } else {
        XTestRoot.log(context, XTestTap.bailOut());
      }
      XTestRoot.end(context);
    }
  }

  static log(context, ...tap) {
    for (const line of tap) {
      console.log(line); // eslint-disable-line no-console
    }
    context.state.reporter?.tap(...tap);
  }

  static output(context, stepId, ...stepTap) {
    const lastIndex = context.state.stepIds.findIndex(candidateId => {
      const candidate = context.state.steps[candidateId];
      return !candidate.tap;
    });
    context.state.steps[stepId].tap = stepTap;
    const index = context.state.stepIds.findIndex(candidateId => {
      const candidate = context.state.steps[candidateId];
      return !candidate.tap;
    });
    if (lastIndex !== index) {
      let tap;
      if (index === -1) {
        // We're done!
        tap = context.state.stepIds.slice(lastIndex).map(targetId => context.state.steps[targetId].tap);
      } else {
        tap = context.state.stepIds.slice(lastIndex, index).map(targetId => context.state.steps[targetId].tap);
      }
      XTestRoot.log(context, ...tap.flat());
    }
  }

  static childOk(context, child, options) {
    switch (child.type) {
      case 'test':
        return context.state.tests[child.testId].children.every(candidate => XTestRoot.childOk(context, candidate, options));
      case 'describe':
        return context.state.describes[child.describeId].children.every(candidate => XTestRoot.childOk(context, candidate, options));
      case 'it':
        return context.state.its[child.itId].ok || options?.todoOk && context.state.its[child.itId].directive === 'TODO';
      case 'coverage':
        return context.state.coverages[child.coverageId].ok;
      default:
        throw new Error(`Unexpected type "${child.type}".`);
    }
  }

  static ok(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'test-end':
        return XTestRoot.childOk(context, { type: 'test', testId: step.testId }, { todoOk: true });
      case 'describe-end':
        return XTestRoot.childOk(context, { type: 'describe', describeId: step.describeId }, { todoOk: true });
      case 'it':
        return XTestRoot.childOk(context, { type: 'it', itId: step.itId });
      case 'coverage':
        return XTestRoot.childOk(context, { type: 'coverage', coverageId: step.coverageId });
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  static number(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'it': {
        const it = context.state.its[step.itId]; // eslint-disable-line no-shadow
        const parentChildren = it.parents.at(-1)?.type === 'describe'
          ? context.state.describes[it.parents.at(-1).describeId].children
          : context.state.tests[it.parents.at(-1).testId].children;
        const index = parentChildren.findIndex(candidate => candidate.itId === it.itId);
        return index + 1;
      }
      case 'describe-end': {
        const describe = context.state.describes[step.describeId]; // eslint-disable-line no-shadow
        const parentChildren = describe.parents.at(-1)?.type === 'describe'
          ? context.state.describes[describe.parents.at(-1).describeId].children
          : context.state.tests[describe.parents.at(-1).testId].children;
        const index = parentChildren.findIndex(candidate => candidate.describeId === describe.describeId);
        return index + 1;
      }
      case 'test-end': {
        const test = context.state.tests[step.testId]; // eslint-disable-line no-shadow
        const index = context.state.children.findIndex(candidate => candidate.testId === test.testId);
        return index + 1;
      }
      case 'coverage': {
        const coverage = context.state.coverages[step.coverageId]; // eslint-disable-line no-shadow
        const index = context.state.children.findIndex(candidate => candidate.coverageId === coverage.coverageId);
        return index + 1;
      }
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  static text(context, stepId) {
    // The regex-replace prevents usage of the special `#` character which is
    //  meaningful in TAP. It's overly-conservative now — it could be less
    //  restrictive in the future.
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'test-end':
        return context.state.tests[step.testId].href;
      case 'describe-start':
      case 'describe-end':
        return context.state.describes[step.describeId].text.replace(/#/g, '*');
      case 'it':
        return context.state.its[step.itId].text.replace(/#/g, '*');
      case 'coverage': {
        const coverage = context.state.coverages[step.coverageId]; // eslint-disable-line no-shadow
        return `${coverage.goal}% coverage goal for ${coverage.href} (got ${coverage.percent.toFixed(2)}%)`;
      }
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  static href(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'test-start':
      case 'test-end':
        return context.state.tests[step.testId].href;
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  static directive(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'describe-end':
      case 'test-end':
        return null;
      case 'it':
        return context.state.its[step.itId].directive;
      case 'coverage':
        return context.state.coverages[step.coverageId].directive;
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  static level(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'test-plan':
        return 1;
      case 'test-start':
      case 'test-end':
      case 'coverage':
        return 0;
      case 'describe-plan':
        return context.state.describes[step.describeId].parents.length + 1;
      case 'describe-start':
      case 'describe-end':
        return context.state.describes[step.describeId].parents.length;
      case 'it':
        return context.state.its[step.itId].parents.length;
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  static count(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'test-plan':
        return context.state.tests[step.testId].children.length;
      case 'describe-plan':
        return context.state.describes[step.describeId].children.length;
      case 'exit':
        return context.state.children.length;
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  static yaml(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'it': {
        const it = context.state.its[step.itId]; // eslint-disable-line no-shadow
        const { ok, directive, error } = it;
        const yaml = { message: 'ok', severity: 'comment', data: {} };
        if (ok) {
          if (directive === 'SKIP') {
            yaml.message = 'skip';
          } else if (directive === 'TODO') {
            yaml.message = 'todo';
          }
        } else {
          if (directive === 'TODO') {
            yaml.message = error && error.message ? error.message : 'todo';
            yaml.severity = 'todo';
          } else {
            yaml.message = error && error.message ? error.message : 'fail';
            yaml.severity = 'fail';
          }
          if (error && error.stack) {
            yaml.data.stack = error.stack;
          }
        }
        return yaml;
      }
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  static end(context) {
    context.state.ended = true;
    context.state.waiting = false;
    context.publish('x-test-root-end');
  }

  static analyzeHrefCoverage(coverageValue, href, goal) {
    const set = new Set();
    let text = '';
    for (const item of coverageValue ?? []) {
      if (item.url === href) {
        text = item.text;
        for (const range of item.ranges) {
          for (let i = range.start; i < range.end; i++) {
            set.add(i);
          }
        }
      }
    }
    const ranges = [];
    const state = { used: set.has(0), start: 0 };
    for (let index = 0; index < text.length; index++) {
      const used = set.has(index);
      if (used !== state.used) {
        ranges.push({ used: state.used, start: state.start, end: index });
        Object.assign(state, { used, start: index });
      }
    }
    ranges.push({ used: state.used, start: state.start, end: text.length });
    let output = '';
    let lineNumber = 1;
    for (const range of ranges) {
      let lines = text
        .slice(range.start, range.end)
        .split('\n')
        .map((line, iii) => lineNumber === 1 || iii > 0 ? `${String(lineNumber++ + (range.used ? '' : ' !')).padEnd(8, ' ')}|  ${line}` : line);
      if (range.used) {
        if (lines.length > 3) {
          lines = [...lines.slice(0, 1), '\u2026', ...lines.slice(-1)];
        }
      } else {
        if (lines.length > 5) {
          lines = [...lines.slice(0, 2), '\u2026', ...lines.slice(-2)];
        }
      }
      output += range.used ? `${lines.join('\n')}` : `${lines.join('\n')}`;
    }
    const percent = set.size / text.length * 100;
    const ok = percent >= goal;
    return { ok, percent, output };
  }
}

class XTestTap {
  static level(level) {
    level = level ?? 0;
    return '    '.repeat(level);
  }

  static version() {
    return 'TAP Version 14';
  }

  static diagnostic(message, level) {
    return `${XTestTap.level(level)}# ${message.replace(/\n/g, `\n${XTestTap.level(level)}# `)}`;
  }

  static testLine(ok, number, description, directive, level) {
    description = description.replace(/\n/g, ' ');
    const okText = ok ? 'ok' : 'not ok';
    const directiveText = directive ? ` # ${directive}` : '';
    return `${XTestTap.level(level)}${okText} ${number} - ${description}${directiveText}`;
  }

  static subtest(name, level) {
    const text = `${XTestTap.level(level)}# Subtest: ${name}`;
    return text;
  }

  static yaml(message, severity, data, level) {
    let text = `${XTestTap.level(level)}  ---`;
    text += `\n${XTestTap.level(level)}  message: ${message.replace(/\n/g, ' ')}`;
    text += `\n${XTestTap.level(level)}  severity: ${severity}`;
    if (data && data.stack) {
      text += `\n${XTestTap.level(level)}  stack: |-`;
      text += `\n${XTestTap.level(level)}    ${data.stack.replace(/\n/g, `\n${XTestTap.level(level)}    `)}`;
    }
    text += `\n${XTestTap.level(level)}  ...`;
    return text;
  }

  static bailOut(message) {
    return message ? `Bail out! ${message.replace(/\n/g, ` `)}` : 'Bail out!';
  }

  static plan(number, level) {
    return `${XTestTap.level(level)}1..${number}`;
  }
}

class XTestSuite {
  static initialize(context, testId, href) {
    Object.assign(context.state, { testId, href });
    context.state.parents.push({ type: 'test', testId });
    context.subscribe(async event => {
      switch (event.data.type) {
        case 'x-test-suite-bail':
          XTestSuite.onBail(context, event);
          break;
        case 'x-test-root-run':
          XTestSuite.onRun(context, event);
          break;
        default:
          // Ignore — this message isn't for us.
      }
    });

    // Setup global error / rejection handlers.
    context.addErrorListener(event => {
      event.preventDefault();
      XTestSuite.bail(context, event.error);
    });
    context.addUnhandledrejectionListener(event => {
      event.preventDefault();
      XTestSuite.bail(context, event.reason);
    });

    // Await a single microtask before we signal that we're ready.
    XTestSuite.waitFor(context, Promise.resolve());
  }

  static onBail(context/*, event*/) {
    if (!context.state.bailed) {
      context.state.bailed = true;
    }
  }

  static async onRun(context, event) {
    if (
      !context.state.bailed &&
      context.state.callbacks[event.data.data.itId]
    ) {
      const { itId, directive, interval } = event.data.data;
      try {
        if (directive !== 'SKIP') {
          const callback = context.state.callbacks[itId];
          await Promise.race([callback(), context.timeout(interval)]);
        }
        context.publish('x-test-suite-result', { itId, ok: true, error: null });
      } catch (error) {
        error = XTestSuite.createError(error); // eslint-disable-line no-ex-assign
        context.publish('x-test-suite-result', { itId, ok: false, error });
      }
    }
  }

  static bail(context, error) {
    if (!context.state.bailed) {
      context.state.bailed = true;
      context.publish(
        'x-test-suite-bail',
        { testId: context.state.testId, error: XTestSuite.createError(error) }
      );
    }
  }

  static createError(originalError) {
    const error = {};
    if (originalError instanceof Error) {
      Object.assign(error, { message: originalError.message, stack: originalError.stack });
    } else {
      error.message = String(originalError);
    }
    return error;
  }

  static assert(context, ok, text) {
    if (context && !context.state.bailed) {
      if (!ok) {
        throw new Error(text ?? 'not ok');
      }
    }
  }

  static coverage(context, href, goal) {
    if (context && !context.state.bailed) {
      if (!(goal >= 0 && goal <= 100)) {
        throw new Error(`Unexpected goal percentage "${goal}".`);
      }
      const coverageId = context.uuid();
      const url = new URL(href, context.state.href);
      context.publish('x-test-suite-register', { type: 'coverage', coverageId, href: url.href, goal });
    }
  }

  static test(context, href) {
    if (context && !context.state.bailed && !context.state.ready) {
      const testId = context.uuid();
      const testHref = new URL(href, context.state.href).href;
      const initiatorTestId = context.state.testId;
      context.publish('x-test-suite-register', { type: 'test', testId, initiatorTestId, href: testHref });
    }
  }

  static #describerInner(context, text, callback, directive, only) {
    if (context && !context.state.bailed && !context.state.ready) {
      if (!(callback instanceof Function)) {
        throw new Error(`Unexpected callback value "${callback}".`);
      }
      const describeId = context.uuid();
      const parents = [...context.state.parents];
      directive = directive ?? null;
      only = only ?? false;
      context.publish(
        'x-test-suite-register',
        { type: 'describe-start', describeId, parents, text, directive, only }
      );
      try {
        context.state.parents.push({ type: 'describe', describeId });
        callback();
        context.state.parents.pop();
        context.publish('x-test-suite-register', { type: 'describe-end', describeId });
      } catch (error) {
        XTestSuite.bail(context, error);
      }
    }
  }

  static describe(context, text, callback) {
    XTestSuite.#describerInner(context, text, callback);
  }

  static describeSkip(context, text, callback) {
    XTestSuite.#describerInner(context, text, callback, 'SKIP');
  }

  static describeOnly(context, text, callback) {
    XTestSuite.#describerInner(context, text, callback, null, true);
  }

  static describeTodo(context, text, callback) {
    XTestSuite.#describerInner(context, text, callback, 'TODO');
  }

  static #itInner(context, text, callback, interval, directive, only) {
    if (context && !context.state.bailed && !context.state.ready) {
      if (!(callback instanceof Function)) {
        throw new Error(`Unexpected callback value "${callback}".`);
      }
      const itId = context.uuid();
      const parents = [...context.state.parents];
      interval = interval ?? null;
      directive = directive ?? null;
      only = only ?? false;
      context.state.callbacks[itId] = callback;
      context.publish(
        'x-test-suite-register',
        { type: 'it', itId, parents, text, interval, directive, only }
      );
    }
  }

  static it(context, text, callback, interval) {
    XTestSuite.#itInner(context, text, callback, interval);
  }

  static itSkip(context, text, callback, interval) {
    XTestSuite.#itInner(context, text, callback, interval, 'SKIP');
  }

  static itOnly(context, text, callback, interval) {
    XTestSuite.#itInner(context, text, callback, interval, null, true);
  }

  static itTodo(context, text, callback, interval) {
    XTestSuite.#itInner(context, text, callback, interval, 'TODO');
  }

  static async waitFor(context, promise) {
    if (context && !context.state.bailed) {
      if (!context.state.bailed) {
        const waitForId = context.uuid();
        context.state.waitForId = waitForId;
        context.state.promises.push(promise);
        try {
          await Promise.all(context.state.promises);
          if (context.state.waitForId === waitForId) {
            context.state.ready = true;
            context.publish('x-test-suite-ready', { testId: context.state.testId });
          }
        } catch (error) {
          XTestSuite.bail(context, error);
        }
      }
    }
  }
}

// There is one-and-only-one root. Either boot as root or child test.
let suiteContext = null;
if (!frameElement?.getAttribute('data-x-test-test-id')) {
  const state = {
    ended: false, waiting: false, children: [], stepIds: [], steps: {},
    tests: {}, describes: {}, its: {}, coverage: false, coverages: {},
    resolveCoverageValuePromise: null, coverageValuePromise: null,
    coverageValue: null, reporter: null,
  };
  const rootContext = { state, uuid, publish, subscribe, timeout };
  XTestRoot.initialize(rootContext, location.href);
} else {
  const state = {
    testId: null, href: null, callbacks: {}, bailed: false, waitForId: null,
    ready: false, promises: [], parents: [],
  };
  suiteContext = {
    state, uuid, publish, subscribe, timeout, addErrorListener,
    addUnhandledrejectionListener,
  };
  XTestSuite.initialize(suiteContext, frameElement.getAttribute('data-x-test-test-id'), location.href);
}
