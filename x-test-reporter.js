import styleSheet from './x-test-reporter.css.js';

const template = document.createElement('template');
template.setHTMLUnsafe(`
  <div id="header"><div id="result"></div><form id="form"><input id="test-name" name="testName" autofocus placeholder="Filter by name&hellip;"><input id="reset" type=reset value="&#x21BA;"></form></div>
  <div id="body"><div id="spacer"></div><div id="container"></div></div>
  <button id="toggle" type="button"></button>
`);

/**
 * @typedef {Object} References
 * @property {HTMLInputElement} testName
 * @property {HTMLButtonElement} toggle
 * @property {HTMLDivElement} header
 * @property {HTMLFormElement} form
 * @property {HTMLDivElement} container
 */

export class XTestReporter extends HTMLElement {
  /** @type {ShadowRoot} */
  #root;
  /** @type {References} */
  #references;

  /**
   * @template {keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap} T
   * @param {string} id
   * @param {T} expectedTag
   * @returns {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : T extends keyof SVGElementTagNameMap ? SVGElementTagNameMap[T] : Element}
   */
  #getElement(id, expectedTag) {
    const el = this.#root.querySelector(`#${id}`);
    if (!el) {
      throw new Error(`Expected ${id} to exist.`);
    }
    if (el.tagName.toLowerCase() !== expectedTag) {
      throw new Error(`Expected ${id} to be <${expectedTag}>, got <${el.tagName.toLowerCase()}>`);
    }
    return /** @type {any} */ (el);
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) {
      throw new Error('Shadow root must exist after attachShadow');
    }
    this.#root = this.shadowRoot;
    this.#root.adoptedStyleSheets = [styleSheet];
    this.#root.append(template.content.cloneNode(true));
    this.#references = {
      testName: this.#getElement('test-name', 'input'),
      toggle: this.#getElement('toggle', 'button'),
      header: this.#getElement('header', 'div'),
      form: this.#getElement('form', 'form'),
      container: this.#getElement('container', 'div'),
    };
  }

  connectedCallback() {
    this.setAttribute('ok', '');
    this.setAttribute('testing', '');
    this.style.height = localStorage.getItem('x-test-reporter-height') ?? '';
    if (localStorage.getItem('x-test-reporter-closed') !== 'true') {
      this.setAttribute('open', '');
    }
    this.#references.testName.value = new URL(location.href).searchParams.get('x-test-name') ?? '';
    this.#references.toggle.addEventListener('click', () => {
      this.hasAttribute('open') ? this.removeAttribute('open') : this.setAttribute('open', '');
      localStorage.setItem('x-test-reporter-closed', String(!this.hasAttribute('open')));
    });
    /**
     * @param {PointerEvent} event
     */
    const resize = (event) => {
      const nextHeaderY = event.clientY - Number(this.getAttribute('dragging'));
      const currentHeaderY = this.#references.header.getBoundingClientRect().y;
      const currentHeight = this.getBoundingClientRect().height;
      this.style.height = `${Math.round(currentHeight + currentHeaderY - nextHeaderY)}px`;
      localStorage.setItem('x-test-reporter-height', this.style.height);
    };
    this.#references.form.addEventListener('reset', () => {
      const url = new URL(location.href);
      url.searchParams.delete('x-test-name');
      location.href = url.href;
    });
    /**
     * @param {SubmitEvent} event
     */
    const handleSubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(this.#references.form);
      const testName = formData.get('testName');
      const url = new URL(location.href);
      if (testName && typeof testName === 'string') {
        url.searchParams.set('x-test-name', testName);
      } else {
        url.searchParams.delete('x-test-name');
      }
      location.href = url.href;
    };
    this.#references.form.addEventListener('submit', handleSubmit);
    /**
     * @param {PointerEvent} event
     */
    const handlePointerDown = (event) => {
      if (this.hasAttribute('open')) {
        const headerY = this.#references.header.getBoundingClientRect().y;
        const clientY = event.clientY;
        this.setAttribute('dragging', String(clientY - headerY));
        addEventListener('pointermove', resize);
        for (const iframe of document.querySelectorAll('iframe')) {
          iframe.style.pointerEvents = 'none';
        }
      }
    };
    this.#references.header.addEventListener('pointerdown', handlePointerDown);
    addEventListener('pointerup', () => {
      removeEventListener('pointermove', resize);
      this.removeAttribute('dragging');
      for (const iframe of document.querySelectorAll('iframe')) {
        iframe.style.pointerEvents = '';
      }
    });
  }

  /**
   * @param {...string} tap
   */
  tap(...tap) {
    const items = [];
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
    this.#references.container.append(...items);
  }

  /**
   * @param {string} text
   * @returns {{tag: string, properties: Record<string, any>, attributes: Record<string, any>, failed: boolean, done: boolean}}
   */
  static parse(text) {
    const result = { tag: '', properties: /** @type {Record<string, any>} */ ({}), attributes: /** @type {Record<string, any>} */ ({}), failed: false, done: false };
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
