import { it, assert } from '../../x-test.js';

it.todo('debuggable', () => {
  const element = document.createElement('div');
  element.textContent = 'this should be green.';
  element.style.color = 'red';
  document.body.append(element);
  assert(element.style.color === 'green');
  // Because the above assertion will fail, the element will remain in the DOM
  //  for debugging in the browser.
  element.remove();
});
