import { assert, it, todo } from '../x-test.js';

it('dom test', () => {
  const div = document.createElement('div');
  div.style.width = '100px';
  div.style.height = '100px';
  div.style.backgroundColor = 'deeppink';
  div.id = 'dom-test';
  document.body.appendChild(div);
  assert(document.getElementById('dom-test'));
});

todo('make false true', 'do the impossible', () => {
  assert(false);
});
