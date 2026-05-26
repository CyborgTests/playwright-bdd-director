import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports
    },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'warn',
      'no-empty-pattern': 'off',
      'no-unused-vars': 'off',
      'prettier/prettier': 'error',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    ignores: [
      'node_modules/**',
      'test-results/**',
      'blob-report/**',
      'playwright-report/**',
      '.claude/**',
      'dist/**',
      'build/**'
    ]
  }
)
