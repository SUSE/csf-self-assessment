import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';

// Flat config. Non-type-checked (no projectService) — the boundary rules below
// are lexical (imports/globals) and need no type information.
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '.claude/**',
      '.tools/**',
      'docs/**',
      'samples/recommendations/**',
      'scripts/**',
      '**/.svelte-kit/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}', '**/*.config.{js,ts,mjs}', 'tools/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Invariant #3 / spec §3: the engine and schema import nothing from UI/DOM.
  {
    files: [
      'packages/platform/src/score-engine/**/*.ts',
      'packages/platform/src/schema/**/*.ts',
      'packages/platform/src/assessment/**/*.ts',
      'packages/platform/src/author/**/*.ts',
      'packages/platform/src/analytics/**/*.ts',
      'packages/platform/src/report/**/*.ts',
      'packages/platform/src/merge/**/*.ts',
      'packages/platform/src/load/**/*.ts',
      'packages/platform/src/setup/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['svelte', 'svelte/*', '**/*.svelte', '**/ui', '**/ui/**'],
              message:
                'The engine and schema import nothing from UI/DOM (spec §3, invariant #3).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'engine/schema are DOM-free (spec §3).' },
        { name: 'document', message: 'engine/schema are DOM-free (spec §3).' },
        { name: 'navigator', message: 'engine/schema are DOM-free (spec §3).' },
      ],
    },
  },
);
