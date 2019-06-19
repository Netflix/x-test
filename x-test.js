/**
 * x-test - a simple, tap-compliant test runner for the browser.
 */

// Export interface.
export { test, it, skip, todo, waitFor, assert };

class XTestReporter extends HTMLElement {
  set outputs(value) {
    this[Symbol.for('_outputs')] = value;
    this.update();
  }
  get outputs() {
    return this[Symbol.for('_outputs')];
  }
  syncForm() {
    const formData = new FormData(this.shadowRoot.getElementById('form'));
    for (const type of ['ok', 'todo', 'tada', 'skip']) {
      if (formData.get(type)) {
        this.setAttribute(`show-${type}`, '');
      } else {
        this.removeAttribute(`show-${type}`);
      }
    }
  }
  static onChange(evt) {
    evt.target.getRootNode().host.syncForm();
  }
  disconnectedCallback() {
    this.shadowRoot.removeEventListener('change', this.constructor.onChange);
  }
  connectedCallback() {
    const symbol = Symbol.for('__initialized__');
    if (!this[symbol]) {
      this[symbol] = true;
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: flex;
            flex-direction: column;
            position: fixed;
            z-index: 1;
            bottom: 0;
            left: 0;
            width: 100vw;
            height: 45vh;
            min-height: 260px;
            box-sizing: border-box;
            background-color: #111111;
            color: white;
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
          #form {
            padding: 8px 12px;
            opacity: .5;
          }
          #form:hover {
            opacity: 1;
          }
          #wrapper {
            flex: 1;
            overflow: auto;
            display: flex;
            /* Flip top/bottom for console-like scroll behavior. */
            flex-direction: column-reverse;
          }
          #spacer {
            flex: 1;
          }
          [output] {
            white-space: pre;
            color: #AAAAAA;
            line-height: 20px;
            padding: 0 12px;
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
          [test] {
            color: #0085ff;
          }
          [test],
          [bail],
          [test]:visited,
          [bail]:visited {
            text-decoration: none;
            display: block;
            width: min-content;
          }
          [test]:hover,
          [bail]:hover {
            text-decoration: underline;
          }
          #footer {
            opacity: 0.5;
            position: absolute;
            bottom: 0;
            right: 0;
            color: #AAAAAA;
            padding: 12px;
          }
          :host(:not([show-ok])) [it][ok]:not([directive]),
          :host(:not([show-ok])) [it][ok]:not([directive]) + [yaml],
          :host(:not([show-todo])) [it]:not([ok])[directive="todo"],
          :host(:not([show-todo])) [it]:not([ok])[directive="todo"] + [yaml],
          :host(:not([show-tada])) [it][ok][directive="todo"],
          :host(:not([show-tada])) [it][ok][directive="todo"] + [yaml],
          :host(:not([show-skip])) [it][ok][directive="skip"],
          :host(:not([show-skip])) [it][ok][directive="skip"] + [yaml],
          [filtered],
          [filtered] + [yaml] {
            display: none;
          }
        </style>
        <div id="header">
          <div id="result"></div>
          <form id="form">
            <label><input type="checkbox" name="ok" checked> ok</label>
            <label><input type="checkbox" name="todo" checked> todo</label>
            <label><input type="checkbox" name="tada" checked> tada</label>
            <label><input type="checkbox" name="skip" checked> skip</label>
          </form>
        </div>
        <div id="wrapper"><div id="spacer"></div><div id="container"></div></div>
        <div id="footer">x-test - a simple, tap-compliant test runner for the browser.</div>
      `;
      this.setAttribute('ok', '');
      this.setAttribute('testing', '');
      this.syncForm();
      this.shadowRoot.addEventListener('change', this.constructor.onChange);
    }
  }
  update() {
    if (this.outputs) {
      const items = [];
      const container = this.shadowRoot.getElementById('container');
      for (const output of this.outputs.slice(container.children.length)) {
        if (output.match(/^# https?:.*/)) {
          const element = document.createElement('a');
          element.href = output.replace('# ', '');
          element.innerText = output;
          element.setAttribute('output', '');
          element.setAttribute('test', '');
          items.push(element);
        } else if (output.match(/^Bail out! https?:.*/)) {
          const element = document.createElement('a');
          element.href = output.replace('Bail out! ', '');
          element.innerText = output;
          element.setAttribute('output', '');
          element.setAttribute('bail', '');
          this.removeAttribute('ok');
          items.push(element);
        } else {
          const element = document.createElement('div');
          element.innerText = output;
          element.setAttribute('output', '');
          if (output.match(/^# /)) {
            element.setAttribute('diagnostic', '');
          } else if (output.match(/^\s*ok /)) {
            element.setAttribute('it', '');
            element.setAttribute('ok', '');
            if (output.match(/^[^#]* # SKIP/)) {
              element.setAttribute('directive', 'skip');
            } else if (output.match(/^[^#]* # TODO/)) {
              element.setAttribute('directive', 'todo');
            }
          } else if (output.match(/^\s*not ok /)) {
            element.setAttribute('it', '');
            if (output.match(/^[^#]* # TODO/)) {
              element.setAttribute('directive', 'todo');
            } else {
              this.removeAttribute('ok');
            }
          } else if (output.match(/^\s*---/)) {
            element.setAttribute('yaml', '');
          } else if (output.match(/^TAP/)) {
            element.setAttribute('version', '');
          } else if (output.match(/^1\.\.\d*/)) {
            element.setAttribute('plan', '');
            this.removeAttribute('testing');
          }
          items.push(element);
        }
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
  static testLine(ok, number, description, directive, reason) {
    description = description.replace(/\n/g, ' ');
    const result = ok ? 'ok' : 'not ok';
    let text = `${result} - ${number} ${description}`;
    if (directive) {
      reason = reason.replace(/\n/g, ' ');
      text += ` # ${directive}${reason ? ` ${reason}` : ''}`;
    }
    return text;
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
    target.lastItId = null;
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

  static async it(target, directive, reason, description, callback, interval) {
    if (!target.bailed) {
      const itId = this.uuidv4();
      const { lastItId } = target;
      target.lastItId = itId;
      this.waitFor(target, this.promiseIt(target, itId));
      if (
        lastItId === null ||
        target.doneItIds.includes(lastItId) ||
        ((await this.promiseIt(target, lastItId)) || true)
      ) {
        const { testId: parentTestId } = target;
        this.post('x-test-it-started', { itId, parentTestId });
        const data = { itId, description, directive, reason, ok: true };
        try {
          if (directive !== 'SKIP') {
            await Promise.race([callback(), this.timeout(interval)]);
          }
        } catch (err) {
          data.ok = false;
          data.error = this.createError(err);
        } finally {
          this.post('x-test-it-ended', data);
          target.doneItIds.push(itId);
        }
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
    top.postMessage(data ? { type, data } : { type }, '*');
  }

  static yamlIt(ok, directive, reason, error) {
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
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
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
    target.status = 'started';
    target.outputs = [];
    const url = new URL(location);
    target.reporter =
      url.searchParams.get('x-test-no-reporter') !== ''
        ? document.createElement('x-test-reporter')
        : null;
  }

  static output(target, string) {
    target.outputs = [...target.outputs, string];
    console.log(string);
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
        this.post('x-test-ended');
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
      const { itId, ok, description, directive, reason, error } = data;
      const number = target.itIds.indexOf(itId) + 1;
      this.output(
        target,
        Tap.testLine(ok, number, description, directive, reason)
      );
      const yaml = this.yamlIt(ok, directive, reason, error);
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
        el.id = testId;
        el.src = href;
        el.style.border = 'none';
        el.style.backgroundColor = 'white';
        el.style.height = '100vh';
        el.style.width = '100vw';
        el.style.position = 'fixed';
        el.style.zIndex = '0';
        el.style.top = '0';
        el.style.left = '0';
        el.addEventListener('error', () => {
          const error = new Error(`${target.href} failed to load ${href}`);
          this.bail(target, error);
        });
        document.body.appendChild(el);
        Object.assign(target.tests[testId], { status: 'started' });
      } else {
        target.status = 'ended';
        this.output(target, Tap.plan(target.itIds.length));
        this.post('x-test-ended');
      }
    }
  }
}

function assert(assertion, message) {
  if (!assertion) {
    throw new Error(message || 'assertion failed');
  }
}

function test(href) {
  // Initializes a new test script in an iframe.
  Test.test(_test, href);
}

function it(description, callback, interval) {
  // Registers a new test. Callback is not run immediately.
  Test.it(_test, null, null, description, callback, interval);
}

function skip(reason, description, callback, interval) {
  // Count test as passed and do not attempt to run.
  Test.it(_test, 'SKIP', reason, description, callback, interval);
}

function todo(reason, description, callback, interval) {
  // Expect that test is failing. Test will run to confirm this.
  Test.it(_test, 'TODO', reason, description, callback, interval);
}

function waitFor(promise) {
  // Don't end test before this promise settles (test bails if promise throws).
  Test.waitFor(_test, promise);
}

// When we boot a new test, we check if we were instantiated or if we're root.
const _isRoot = frameElement === null || !frameElement.id;
const _testId = _isRoot ? Test.uuidv4() : frameElement.id;
const _test = _isRoot ? new RootTest(_testId) : new Test(_testId);

// Make sure uncaught errors and unhandled rejections cause failures.
addEventListener('error', evt => {
  evt.preventDefault();
  Test.bail(_test, evt.error);
});

addEventListener('unhandledrejection', evt => {
  evt.preventDefault();
  Test.bail(_test, evt.reason);
});
