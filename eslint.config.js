// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-globals': [
        'error',
        {
          name: 'Bun',
          message: 'Keep src runtime-neutral: no Bun.* globals.',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  }
);
