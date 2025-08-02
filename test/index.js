import { test, coverage } from '../x-test.js';

coverage('../x-test-reporter.js', 70);
coverage('../x-test-root.js', 71);
coverage('../x-test-suite.js', 96);
coverage('../x-test-tap.js', 100);
coverage('../x-test.js', 100);

test('./test-reporter.html');
test('./test-suite.html');
test('./test-root.html');
test('./test-tap.html');
test('./test-scratch.html');
