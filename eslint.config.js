/**
 * A deliberately narrow lint gate: the rules that catch crashes, not style.
 *
 * A hook placed after an early return took the whole calculator page to a blank screen, and it got
 * through a clean typecheck, 297 passing tests and a successful production build — because none of
 * those can see hook ordering. rules-of-hooks can, statically, in milliseconds.
 *
 * Formatting and taste stay out of here on purpose. This file exists to stop the build shipping
 * something that renders nothing, and adding a hundred stylistic rules would only train everyone to
 * ignore its output.
 */
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // The one that matters: a conditionally-called hook is a blank screen, not a warning.
      'react-hooks/rules-of-hooks': 'error',
      // A stale closure is a wrong number on screen, which for this product is the whole game.
      'react-hooks/exhaustive-deps': 'warn',
      // Everything below is noise for this codebase's conventions, not a defect.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // The charts use comma-sequence assignment deliberately in hot loops. Working code, and
      // rewriting it to satisfy a style rule is exactly the churn this config is meant to avoid.
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
);
