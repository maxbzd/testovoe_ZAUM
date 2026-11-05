import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const typed = {
  languageOptions: {
    parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
  },
};

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-single',
      'node_modules',
      'coverage',
      'test-results',
      'playwright-report',
    ],
  },
  js.configs.recommended,
  {
    // Неразрывные пробелы в форматировании чисел — намеренные.
    rules: {
      'no-irregular-whitespace': [
        'error',
        { skipStrings: true, skipComments: true, skipTemplates: true, skipRegExps: true },
      ],
    },
  },

  // Исходники: самые строгие правила TypeScript с проверкой по типам.
  {
    files: ['src/**/*.{ts,tsx}', 'vite.config.ts'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    ...typed,
    languageOptions: { ...typed.languageOptions, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      // Числа в шаблонных строках — нормальная практика, а вот объекты и undefined нет.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // `onClick={() => doSomething()}` читается лучше, чем фигурные скобки.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      'no-console': ['error', { allow: ['error'] }],
      // Конфликтует с no-non-null-assertion из того же набора: оставляем явные `as` с пояснением.
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      eqeqeq: ['error', 'always'],
    },
  },

  // Тесты: правила по типам, но без придирок, мешающих выразительным проверкам.
  {
    files: [
      'src/**/*.test.{ts,tsx}',
      'src/test/**',
      'e2e/**/*.ts',
      'e2e-visual/**/*.ts',
      'scripts/**/*.test.ts',
    ],
    extends: [...tseslint.configs.recommendedTypeChecked],
    ...typed,
    languageOptions: { ...typed.languageOptions, globals: globals.browser },
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },

  {
    files: [
      'scripts/**/*.mjs',
      'eslint.config.js',
      'playwright.config.ts',
      'playwright.visual.config.ts',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: { globals: globals.browser, sourceType: 'script' },
  },
);
