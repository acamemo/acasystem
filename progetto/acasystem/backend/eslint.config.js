import js from '@eslint/js';
import babelParser from '@babel/eslint-parser';

// Backend lint (ADR-0008): the same parser setup as the frontend, without React.
// Node strips the types at runtime; TypeScript (tsc --noEmit, strict) checks identifiers
// and unused declarations, so the matching ESLint rules are off for .ts files.
export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          parserOpts: { plugins: ['typescript'] },
        },
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Headers: 'readonly',
        fetch: 'readonly',
        globalThis: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-debugger': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    ignores: ['node_modules/', 'data/', 'src/**/*.d.ts'],
  },
];
