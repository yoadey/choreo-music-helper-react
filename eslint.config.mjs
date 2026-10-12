import eslintReact from '@eslint-react/eslint-plugin'
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    { ignores: ['dist/**', 'temp/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', '.expo/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.{ts,tsx}'],
        ...eslintReact.configs['recommended-typescript'],
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        rules: {
            // Covered by eslint-plugin-react-hooks
            '@eslint-react/exhaustive-deps': 'off',
            '@eslint-react/rules-of-hooks': 'off',
            '@eslint-react/set-state-in-effect': 'off',
            // False positive for WatermelonDB's Relation.fetch()
            '@eslint-react/web-api-no-leaked-fetch': 'off',
        },
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks },
        rules: reactHooks.configs.recommended.rules,
    },
    {
        files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts', '*.ts'],
        languageOptions: { globals: { ...globals.browser } },
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['src/sw.js'],
        languageOptions: { globals: { ...globals.serviceworker } },
    },
    {
        files: ['*.js', 'scripts/**/*.{js,mjs}'],
        languageOptions: { globals: { ...globals.node }, sourceType: 'commonjs' },
        rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
    {
        files: ['scripts/**/*.mjs', 'e2e/**/*.mjs'],
        languageOptions: { globals: { ...globals.node }, sourceType: 'module' },
    },
    {
        files: ['**/__tests__/**', 'src/testUtils/**', 'jest.setup.js'],
        languageOptions: { globals: { ...globals.jest, ...globals.node } },
        rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
)
