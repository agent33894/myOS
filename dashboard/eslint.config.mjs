import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const designTokenPlugin = require('./eslint-plugin-design-tokens/index.js');

const STRICT_SCOPE_FILES = [
  'shared/**/*.ts',
  'electron/preload.ts',
  'electron/ipc/register-handlers.ts',
  'src/components/layout/QuickCapture.tsx',
  'src/components/layout/SearchBar.tsx',
  'src/components/layout/quickCaptureUtils.ts',
  'src/components/layout/searchBarQueryHelpers.ts',
  'src/components/layout/quickCaptureUtils.test.ts',
  'src/components/layout/searchBarQueryHelpers.test.ts',
  'src/components/projects/projectDetailShared.ts',
  'src/components/research/BriefHistory.tsx',
  'src/components/research/BriefLibrary.tsx',
  'src/components/tasks/ProjectDrillDown.tsx',
  'src/components/editor/ArtifactCopilotPanel.tsx',
  'src/gateways/researchBriefGateway.ts',
  'src/utils/researchBriefs.ts',
  'src/utils/markdown.ts',
  'src/utils/urlParams.ts',
];

const MUTATION_IPC_METHODS = [
  'createArtifact',
  'updateArtifact',
  'deleteArtifact',
  'promoteInboxItem',
];

export default tseslint.config(
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'design-tokens': designTokenPlugin,
    },
    rules: {
      'design-tokens/no-fractional-spacing': 'error',
      'design-tokens/no-hardcoded-colors': ['error', { allowDarkModePairs: false }],
      'design-tokens/no-legacy-utilities': 'error',
    },
  },
  {
    ignores: ['dist/**', 'dist-electron/**', 'release/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'electron/**/*.ts', 'shared/**/*.ts'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-nested-ternary': 'off',
      complexity: 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/gateways/artifactsGateway.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...MUTATION_IPC_METHODS.map((method) => ({
          selector:
            `CallExpression` +
            `[callee.object.object.name='window']` +
            `[callee.object.property.name='electronAPI']` +
            `[callee.property.name='${method}']`,
          message:
            `Do not call window.electronAPI.${method} directly from renderer modules; ` +
            'use artifactsGateway/useUndoableArtifact so mutation behavior stays centralized.',
        })),
      ],
    },
  },
  {
    files: STRICT_SCOPE_FILES,
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-nested-ternary': 'error',
    },
  }
);
