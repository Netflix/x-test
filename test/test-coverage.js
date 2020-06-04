import { it, assert, __RootTest__ } from '../x-test.js';

const url = new URL('/fake.js', import.meta.url).href;
const text = `// Fake file to test coverage on.
class MyFakeClass {
  fakeFunction(fake) {
    if (fake) {
      /*
       *
       *
       *
       *
       *
       */
    } else {
      /*
       *
       *
       *
       *
       *
       */
    }
  }
}

export default MyFakeClass;
`;

const js = [
  {
    url,
    text,
    ranges: [{ start: 0, end: 162 }, { start: 239, end: 275 }],
  },
];

const expectedOutput = `1       |  // Fake file to test coverage on.
…
12      |      } else {
13 !    |        /*
…
19 !    |         */
20 !    |      }
…
25      |  `;

it('test coverage', () => {
  const analysis = __RootTest__.analyzeUrlCoverage(js, url, 95);
  assert(analysis.ok === false);
  assert(analysis.output === expectedOutput);
  assert(analysis.percent === 72);
});
