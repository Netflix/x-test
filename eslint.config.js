import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';
import NetflixCommon from '@netflix/eslint-config';

export default [
  {
    ...NetflixCommon,
    files: ['**/*.js'],
    languageOptions: { globals: globals.browser },
    ignores: [
      'server.js',
      'demo/react/*',
    ],
  },
  {
    ...jsdoc.configs['flat/recommended'],
    files: ['x-test.js'],
  },
  {
    ...NetflixCommon,
    files: ['server.js'],
    languageOptions: { globals: globals.node },
  },
  {
    ...NetflixCommon,
    files: ['demo/react/**/*.js'],
    languageOptions: { globals: { ...globals.browser, React: 'readonly', ReactDOM: 'readonly' } },
  },
  {
    ignores: ['types/**'],
  },
  {
    settings: {
      jsdoc: {
        preferredTypes: [
          // TypeScript knows about this, but eslint does not.
          'TemplateStringsArray',
        ],
      },
    },
  },
];
