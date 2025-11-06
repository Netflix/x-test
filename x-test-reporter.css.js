// Simple shim as we await cross-browser support for native css modules.
/**
 * @param {TemplateStringsArray} strings
 * @returns {string} CSS string
 */
const css = strings => strings.join();
const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css`
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
  padding-right: 54px;
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

#form {
  display: flex;
  gap: 2px;
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
export default styleSheet;
