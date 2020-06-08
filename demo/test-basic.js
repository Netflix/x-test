import { it, skip, test, waitFor } from '../x-test.js';

skip('loooong test', async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  throw new Error(`i'm broken.`);
});

it('medium test', async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
});

(async () => {
  // Call some api to get a list of things which should each define an "it"...
  const promise = new Promise(resolve => setTimeout(resolve, 1000));
  waitFor(promise);
  await promise;
  it('dynamically defined test based on awaited information', () => {});
})();

test('./test-chained.html');
