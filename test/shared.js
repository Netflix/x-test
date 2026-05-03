import { assert } from '../x-test.js';

/**
 * @param {() => void} fn
 * @param {RegExp} error
 * @param {string} [message]
 */
export function assertThrows(fn, error, message) {
  let thrown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  assert(thrown !== undefined, message ?? 'expected function to throw');
  assert(error.test(thrown?.message), message ?? `expected error message "${thrown?.message}" to match ${error}`);
}
