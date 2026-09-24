import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const designTokenPlugin = require('./eslint-plugin-design-tokens/index.js');

export default tseslint.config(
  {
    ignores: ['dist/**', 'dist-electron/**', 'release/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'electron/**/*.ts', 'shared/**/*.ts'],
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // The design system is the only place allowed to render raw controls or pick values.
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'design-tokens': designTokenPlugin },
    rules: {
      'design-tokens/no-fractional-spacing': 'error',
      'design-tokens/no-hardcoded-colors': 'error',
      'design-tokens/no-legacy-utilities': 'error',
      'design-tokens/no-raw-controls': 'error',
    },
  },
  {
    // The preload bridge is reached only through src/data, which owns IPC and its error model.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/data/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='window'][property.name='electronAPI']",
          message: 'Use src/data (invoke, subscribe, gateway) instead of window.electronAPI.',
        },
      ],
    },
  },
);
