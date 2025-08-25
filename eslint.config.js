const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const compat = new FlatCompat({ baseDirectory: __dirname, recommendedConfig: js.configs.recommended });

module.exports = [
  { ignores: ['dist/*', 'src/sw.js'] },
  ...compat.extends('eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended', 'plugin:@typescript-eslint/recommended'),
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
  },
];
