/** Source, test, script, and JSDoc rules for the repository quality gate. */
import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['coverage/**', 'dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...jsdoc.configs['flat/recommended-typescript-error'],
    files: ['src/**/*.ts'],
    rules: {
      ...jsdoc.configs['flat/recommended-typescript-error'].rules,
      'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }]
    }
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off'
    }
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly'
      }
    }
  }
);
