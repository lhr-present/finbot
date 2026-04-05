import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: { ecmaVersion: 2022, ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18' } },
    rules: {
      // Hooks safety — errors only
      'react-hooks/rules-of-hooks': 'error',

      // Warn but don't fail CI (existing code has intentional dep omissions with eslint-disable)
      'react-hooks/exhaustive-deps': 'warn',

      // Mark JSX-used variables as used (prevents false positives on components)
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',

      // Unused vars — ignore underscore-prefixed and common React patterns
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],

      // Allow empty catch blocks (intentional fire-and-forget pattern)
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Off — we don't use prop-types (Zustand store is the contract)
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',   // React 17+ JSX transform
      'react/display-name': 'off',

      // Sensible defaults
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'no-debugger': 'error',
      'prefer-const': 'warn',
    },
  },
  {
    // Test files — relax rules
    files: ['src/test/**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
];
