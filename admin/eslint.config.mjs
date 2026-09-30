import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

/**
 * ESLint flat config.
 *
 * `eslint-config-next` v16 ships native flat configs, so they are imported
 * directly rather than bridged through FlatCompat - the compatibility layer
 * cannot serialise the plugin graph these configs produce.
 */
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '**/generated/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]

export default config
