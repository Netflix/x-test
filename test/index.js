import { test, coverage } from '../x-test.js';

coverage('../x-test-reporter.js', 74);
coverage('../x-test-root.js', 82);
coverage('../x-test-suite.js', 93);
coverage('../x-test-tap.js', 99);
coverage('../x-test.js', 96);

test('./test-reporter.html');
test('./test-suite.html');
test('./test-root.html');
test('./test-tap.html');
test('./test-scratch.html');
