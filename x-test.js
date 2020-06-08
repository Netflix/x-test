const TAG_LINE = 'x-test - a simple, tap-compliant test runner for the browser.';

export const assert = (assertion, message) => {
  Test.assert(assertion, message);
};

export const test = href => {
  Test.test(_test, href);
};

export const it = (description, callback, interval) => {
  Test.it(_test, null, description, callback, interval);
};

export const skip = (description, callback, interval) => {
  Test.it(_test, 'SKIP', description, callback, interval);
};

export const todo = (description, callback, interval) => {
  Test.it(_test, 'TODO', description, callback, interval);
};

export const waitFor = promise => {
  Test.waitFor(_test, promise);
};

export const cover = (relativePath, goal) => {
  Test.cover(_test, relativePath, goal);
};

export { XTestReporter as __XTestReporter__, Tap as __Tap__, Test as __Test__, RootTest as __RootTest__ };

class XTestReporter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set outputs(value) {
    this.__outputs = value;
    this.constructor.update(this);
  }

  get outputs() {
    return this.__outputs;
  }

  connectedCallback() {
    this.constructor.initializeOnce(this);
  }

  static initializeOnce(target) {
    if (!target.__initialized) {
      target.__initialized = true;
      target.shadowRoot.innerHTML = `
        <style>
          :host {
            display: flex;
            flex-direction: column;
            position: fixed;
            z-index: 1;
            right: 0;
            bottom: 0;
            left: 0;
            height: 45vh;
            min-height: 260px;
            background-color: #111111;
            font-family: monospace;
          }
          #header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 40px;
            box-shadow: inset 0 -1px 0 0 #484848, 0 1px 2px 0 #484848;
          }
          #result {
            margin: auto 12px;
            padding: 6px 16px;
            border-radius: 4px;
            line-height: 14px;
            color: white;
            background-color: #FF851B;
          }
          #result::before {
            content: "TESTING...";
          }
          :host(:not([ok])) #result {
            background-color: #FF4136;
          }
          :host(:not([ok])) #result::before {
            content: "NOT OK!";
          }
          :host([ok]:not([testing])) #result {
            background-color: #2ECC40;
          }
          :host([ok]:not([testing])) #result::before {
            content: "OK!";
          }
          #tag-line {
            margin: auto 12px;
            color: #8C8C8C;
            cursor: default;
          }
          #body {
            flex: 1;
            overflow: auto;
            display: flex;
            /* Flip top/bottom for console-like scroll behavior. */
            flex-direction: column-reverse;
            box-sizing: border-box;
          }
          #spacer {
            flex: 1;
          }
          [output] {
            white-space: pre;
            color: #AAAAAA;
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
          [test],
          [bail] {
            display: block;
            width: min-content;
            cursor: pointer;
          }
          [it][ok]:not([directive]) {
            color: #2ECC40;
          }
          [it]:not([ok]):not([directive]),
          [bail] {
            color: #FF4136;
          }
          [it][ok][directive="skip"],
          [it]:not([ok])[directive="todo"] {
            color: #FF851B;
          }
          [it][ok][directive="todo"] {
            color: #FFDC00;
          }
          [version],
          [plan],
          [diagnostic] {
            color: #39CCCC;
          }
          [test]:not([bail]) {
            color: #0085ff;
          }
        </style>
        <div id="header"><div id="result"></div><div id="tag-line">${TAG_LINE}</div></div>
        <div id="body"><div id="spacer"></div><div id="container"></div></div>
      `;
      target.setAttribute('ok', '');
      target.setAttribute('testing', '');
    }
  }

  static parseOutput(output) {
    const result = { tag: '', properties: {}, attributes: {}, failed: false, done: false };
    result.properties.innerText = output;
    if (output.match(/^# https?:.*/)) {
      result.tag = 'a';
      result.properties.href = output.replace('# ', '');
      Object.assign(result.attributes, { output: '', test: '' });
    } else if (output.match(/^Bail out! https?:.*/)) {
      result.tag = 'a';
      result.failed = true;
      result.properties.href = output.replace('Bail out! ', '');
      Object.assign(result.attributes, { output: '', test: '', bail: '' });
    } else {
      result.tag = 'div';
      result.attributes.output = '';
      if (output.match(/^# /)) {
        result.attributes.diagnostic = '';
      } else if (output.match(/^ok /)) {
        Object.assign(result.attributes, { it: '', ok: '' });
        if (output.match(/^[^#]* # SKIP/)) {
          result.attributes.directive = 'skip';
        } else if (output.match(/^[^#]* # TODO/)) {
          result.attributes.directive = 'todo';
        }
      } else if (output.match(/^not ok /)) {
        result.attributes.it = '';
        if (output.match(/^[^#]* # TODO/)) {
          result.attributes.directive = 'todo';
        } else {
          result.failed = true;
        }
      } else if (output.match(/^ {2}---/)) {
        result.attributes.yaml = '';
      } else if (output.match(/^TAP/)) {
        result.attributes.version = '';
      } else if (output.match(/^1\.\.\d*/)) {
        result.attributes.plan = '';
        result.done = true;
      } else if (output.match(/Bail out!.*/)) {
        result.attributes.bail = '';
        result.failed = true;
      }
    }
    return result;
  }

  static update(target) {
    if (target.outputs) {
      const items = [];
      const container = target.shadowRoot.getElementById('container');
      for (const output of target.outputs.slice(container.children.length)) {
        const { tag, properties, attributes, failed, done } = this.parseOutput(output);
        const element = document.createElement(tag);
        Object.assign(element, properties);
        for (const [attribute, value] of Object.entries(attributes)) {
          element.setAttribute(attribute, value);
        }
        if (done) {
          target.removeAttribute('testing');
        }
        if (failed) {
          target.removeAttribute('ok');
        }
        items.push(element);
      }
      container.append(...items);
    }
  }
}

class Tap {
  static version() {
    return 'TAP Version 13';
  }

  static diagnostic(message) {
    return `# ${message.replace(/\n/g, `\n# `)}`;
  }

  static testLine(ok, number, description, directive) {
    description = description.replace(/\n/g, ' ');
    const okText = ok ? 'ok' : 'not ok';
    const directiveText = directive ? ` # ${directive}` : '';
    return `${okText} - ${number} ${description}${directiveText}`;
  }

  static yaml(message, severity, data) {
    let text = '  ---';
    text += `\n  message: ${message.replace(/\n/g, ' ')}`;
    text += `\n  severity: ${severity}`;
    if (data && data.stack) {
      text += `\n  stack: |-`;
      text += `\n    ${data.stack.replace(/\n/g, `\n    `)}`;
    }
    text += `\n  ...`;
    return text;
  }

  static bailOut(message) {
    return `Bail out! ${message.replace(/\n/g, ' ')}`;
  }

  static plan(number) {
    return `1..${number}`;
  }
}

class Test {
  constructor(testId) {
    this.constructor.setup(this, testId);
    this.constructor.initialize(this);
  }

  static setup(target, testId) {
    target.testId = testId;
    target.href = location.href;
    target.bailed = false;
    target.promises = [];
    target.currentItId = null;
    target.doneItIds = [];
  }

  static initialize(target) {
    this.listen(this.onMessage.bind(this, target));
    // Wait at least a microtask before ending.
    this.waitFor(target, Promise.resolve());
  }

  static onMessage(target, evt) {
    if (evt.data.type === 'x-test-bail') {
      target.bailed = true;
    }
  }

  static promiseIt(target, itId) {
    return new Promise(resolve => {
      const onMessage = evt => {
        const { type, data } = evt.data;
        if (type === 'x-test-it-ended' && data.itId === itId) {
          this.unlisten(onMessage);
          resolve();
        }
      };
      this.listen(onMessage);
    });
  }

  static assert(assertion, message = 'assertion failed') {
    if (!assertion) {
      throw new Error(message);
    }
  }

  static async waitFor(target, promise) {
    if (!target.bailed) {
      const waitForId = this.uuidv4();
      target.waitForId = waitForId;
      target.promises.push(promise);
      try {
        await Promise.all(target.promises);
        if (target.waitForId === waitForId) {
          this.post('x-test-next', { testId: target.testId });
        }
      } catch (err) {
        this.bail(target, err);
      }
    }
  }

  static test(target, href) {
    if (!target.bailed) {
      const testId = this.uuidv4();
      href = new URL(href, target.href).href;
      const data = { testId, parentTestId: target.testId, href };
      this.post('x-test-queue', data);
    }
  }

  static timeout(interval = 30000) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`timeout after ${interval}ms`));
      }, interval);
    });
  }

  static cover(target, url, goal) {
    this.post('x-test-cover', { url, goal });
  }

  static async it(target, directive, description, callback, interval) {
    // TODO: crude way to protect against accidental directives in description.
    description.replace(/#/g, '*');
    if (!(callback instanceof Function)) {
      throw new Error(`Callback must be a function (got ${callback}).`);
    }
    if (!target.bailed) {
      const itId = this.uuidv4();
      const lastItId = target.currentItId;
      target.currentItId = itId;
      this.waitFor(target, this.promiseIt(target, itId));
      if (lastItId && !target.doneItIds.includes(lastItId)) {
        await this.promiseIt(target, lastItId);
      }
      this.post('x-test-it-started', { itId, parentTestId: target.testId });
      const data = { itId, description, directive, ok: true };
      try {
        if (directive !== 'SKIP') {
          await Promise.race([callback(), this.timeout(interval)]);
        }
      } catch (error) {
        Object.assign(data, { ok: false, error: this.createError(error) });
      } finally {
        this.post('x-test-it-ended', data);
        target.doneItIds.push(itId);
      }
    }
  }

  static async bail(target, err) {
    if (!target.bailed) {
      const error = this.createError(err);
      this.post('x-test-bail', { href: target.href, error });
    }
  }

  static listen(callback) {
    top.addEventListener('message', callback);
  }

  static unlisten(callback) {
    top.removeEventListener('message', callback);
  }

  static post(type, data) {
    // TODO: do we need to filter out untrusted origins here?
    top.postMessage({ type, data }, '*');
  }

  static yamlIt(ok, directive, error) {
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

  static createError(err) {
    const error = {};
    if (err instanceof Error) {
      error.message = err.message;
      error.stack = err.stack;
    } else {
      error.message = String(err);
    }
    return error;
  }

  // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  static uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
  }
}

class RootTest extends Test {
  static setup(target, testId) {
    super.setup(target, testId);
    target.testIds = [testId];
    target.tests = { [testId]: { testId, href: target.href } };
    target.index = 0;
    target.itIds = [];
    target.its = {};
    target.coverageGoals = [];
    target.coveragePromise = new Promise(resolve => target.resolveCoveragePromise = resolve);
    target.status = 'started';
    target.outputs = [];
    const url = new URL(location);
    target.reporter =
      url.searchParams.get('x-test-no-reporter') !== ''
        ? document.createElement('x-test-reporter')
        : null;
    target.cover = url.searchParams.get('x-test-cover') === '';
  }

  static output(target, string) {
    target.outputs = [...target.outputs, string];
    console.log(string);  // eslint-disable-line no-console
    if (target.reporter) {
      target.reporter.outputs = target.outputs;
    }
  }

  static initialize(target) {
    super.initialize(target);
    if (target.reporter) {
      customElements.define('x-test-reporter', XTestReporter);
      document.body.appendChild(target.reporter);
    }
    this.output(target, Tap.version());
  }

  static onMessage(target, evt) {
    super.onMessage(target, evt);
    const { type, data } = evt.data;
    switch (type) {
      case 'x-test-ping':
        this.post('x-test-pong', { status: target.status });
        break;
      case 'x-test-bail': {
        // TODO: TAP Version 13 spec does not provide a yaml block for "bail".
        if (data.error && data.error.stack) {
          this.output(target, Tap.diagnostic(data.error.stack));
        }
        this.output(target, Tap.bailOut(data.href));
        this.end(target);
        break;
      }
      case 'x-test-queue':
        this.onQueue(target, data);
        break;
      case 'x-test-next':
        this.next(target);
        break;
      case 'x-test-it-started':
        this.onItStarted(target, data);
        break;
      case 'x-test-it-ended':
        this.onItEnded(target, data);
        break;
      case 'x-test-cover':
        target.coverageGoals.push(data);
        break;
      case 'x-test-cover-start':
        target.resolveCoveragePromise(data);
        break;
    }
  }

  static onItStarted(target, data) {
    if (!target.bailed && target.status !== 'ended') {
      target.itIds.push(data.itId);
      target.its[data.itId] = data;
    }
  }

  static onItEnded(target, data) {
    if (!target.bailed && target.status !== 'ended') {
      Object.assign(target.its[data.itId], data);
      const { itId, ok, description, directive, error } = data;
      const number = target.itIds.indexOf(itId) + 1;
      this.output(target, Tap.testLine(ok, number, description, directive));
      const yaml = this.yamlIt(ok, directive, error);
      // We may choose to output these later...
      if (yaml.severity !== 'comment') {
        this.output(target, Tap.yaml(yaml.message, yaml.severity, yaml.data));
      }
    }
  }

  static onQueue(target, data) {
    if (!target.bailed && target.status !== 'ended') {
      const parentTestId = data.parentTestId;
      const siblingTestIds = target.testIds.filter(
        testId => target.tests[testId].parentTestId === parentTestId
      );
      const lastSiblingTestId = siblingTestIds[siblingTestIds.length - 1];
      const insertIndex = lastSiblingTestId
        ? target.testIds.indexOf(lastSiblingTestId) + 1
        : target.testIds.indexOf(parentTestId) + 1;
      target.testIds.splice(insertIndex, 0, data.testId);
      target.tests[data.testId] = data;
    }
  }

  static analyzeUrlCoverage(coverage, url, goal) {
    const set = new Set();
    let text = '';
    for (const item of coverage) {
      if (item.url === url) {
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

  static next(target) {
    if (!target.bailed && target.status !== 'ended') {
      // Destroy current test.
      const currentTestId = target.testIds[target.index];
      if (currentTestId && document.getElementById(currentTestId)) {
        document.body.removeChild(document.getElementById(currentTestId));
      }

      const testId = target.testIds[++target.index];
      if (testId) {
        // Create the new test.
        const { href } = target.tests[testId];
        this.output(target, Tap.diagnostic(`${href}`));
        const el = document.createElement('iframe');
        Object.assign(el, { id: testId, src: href });
        Object.assign(el.style, {
          border: 'none', backgroundColor: 'white', height: '100vh',
          width: '100vw', position: 'fixed', zIndex: '0', top: '0', left: '0',
        });
        el.addEventListener('error', () => {
          const error = new Error(`${target.href} failed to load ${href}`);
          this.bail(target, error);
        });
        document.body.appendChild(el);
        Object.assign(target.tests[testId], { status: 'started' });
      } else {
        this.end(target);
      }
    }
  }

  static end(target) {
    target.status = 'ended';
    if (!target.cover) {
      for (const { url, goal } of target.coverageGoals) {
        this.output(target, Tap.diagnostic(`Not checking "${url}" for ${goal}% coverage (no "x-test-cover" query param).`));
      }
      this.output(target, Tap.plan(target.itIds.length));
    } else {
      this.startCoverageReport(target);
    }
    this.post('x-test-ended');
  }

  static async startCoverageReport(target) {
    const coverageTimeout = new Promise((resolve, reject) =>
      setTimeout(() => reject(new Error(`Timed out awaiting coverage from puppeteer.`)), 5000)
    );
    try {
      const { js } = await Promise.race([target.coveragePromise, coverageTimeout]);
      for (const { url, goal } of target.coverageGoals) {
        const analysis = this.analyzeUrlCoverage(js, url, goal);
        if (analysis.ok) {
          this.output(target, Tap.diagnostic(`Coverage goal of ${goal}% for ${url} met (got ${analysis.percent.toFixed(2)}%).`));
        } else {
          this.output(target, Tap.diagnostic(analysis.output));
          this.output(target, Tap.bailOut(`Coverage goal of ${goal}% for ${url} not met (got ${analysis.percent.toFixed(2)}%).`));
        }
      }
      this.output(target, Tap.plan(target.itIds.length));
      this.post('x-test-cover-ended');
    } catch (error) {
      this.bail(target, error);
    }
  }
}

// When we boot a new test, we check if we were instantiated or if we're root.
const _isRoot = frameElement === null || !frameElement.id;
const _testId = _isRoot ? Test.uuidv4() : frameElement.id;
const _test = _isRoot ? new RootTest(_testId) : new Test(_testId);

addEventListener('error', evt => {
  evt.preventDefault();
  Test.bail(_test, evt.error);
});

addEventListener('unhandledrejection', evt => {
  evt.preventDefault();
  Test.bail(_test, evt.reason);
});
