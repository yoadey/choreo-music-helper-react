const { defineConfig } = require('eslint/config');

module.exports = defineConfig({
  ignores: ['dist/*'],
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  env: { browser: true, es2021: true },
  settings: { react: { version: 'detect' } },
});
