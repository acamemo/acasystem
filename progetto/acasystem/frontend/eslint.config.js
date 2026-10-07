import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import babelParser from '@babel/eslint-parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        HTMLElement: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        __APP_VERSION__: 'readonly',
      },
    },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          parserOpts: { plugins: ['typescript', 'jsx'] },
        },
      },
    },
    // TypeScript checks identifiers and unused declarations in the migrated scope.
    // React and hook rules still run on the original TSX source.
    rules: { 'no-undef': 'off', 'no-unused-vars': 'off' },
  },
  // Layer hierarchy (ADR-0004/0008): primitives → system → widgets → templates → pages.
  // A layer may import from the layers before it, never from the ones after it.
  ...layerRules([
    ['src/components/primitives/**', ['components/system', 'components/widgets', 'templates', 'pages', 'api']],
    ['src/components/system/**', ['components/widgets', 'templates', 'pages']],
    ['src/components/widgets/**', ['templates', 'pages']],
    ['src/templates/**', ['pages']],
  ]),
  {
    ignores: ['dist/', 'node_modules/', 'scripts/', 'src/__tests__/', 'src/**/*.d.ts'],
  },
];

function layerRules(layers) {
  return layers.map(([files, forbidden]) => ({
    files: [files],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: forbidden.map((dir) => ({
            group: [`@/${dir}`, `@/${dir}/*`, `**/${dir}`, `**/${dir}/*`],
            message: `Gerarchia degli strati: questo strato non può importare da ${dir}.`,
          })),
        },
      ],
    },
  }));
}
