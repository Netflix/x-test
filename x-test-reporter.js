import styleSheet from './x-test-reporter.css.js';

const template = document.createElement('template');
template.setHTMLUnsafe(`
  <div id="header"><div id="result"></div><div id="tag-line">x-test - a simple, tap-compliant test runner for the browser.</div></div>
  <div id="body"><div id="spacer"></div><div id="container"></div></div>
  <button id="toggle" type="button"></button>
`);

export class XTestReporter extends HTMLElement {
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
