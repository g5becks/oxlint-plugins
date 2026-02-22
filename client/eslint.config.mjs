// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import pluginQuery from '@tanstack/eslint-plugin-query'
import pluginRouter from '@tanstack/eslint-plugin-router'
import pluginSolid from 'eslint-plugin-solid/configs/typescript'

// Import the root config as the base
import rootConfig from '../eslint.config.mjs'

export default rootConfig
  // Enable type-checked linting for client (needed for strict TS rules)
  .override('antfu/typescript/parser', {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  })

  // Strict 'any' type enforcement (client-specific)
  .override('antfu/typescript/rules', {
    rules: {
      'ts/no-explicit-any': 'error',
      'ts/no-unsafe-argument': 'error',
      'ts/no-unsafe-assignment': 'error',
      'ts/no-unsafe-call': 'error',
      'ts/no-unsafe-member-access': 'error',
      'ts/no-unsafe-return': 'error',
    },
  })

  // Client-specific ignores
  .append({
    ignores: [
      'dev-dist/**',
      '**/dev-dist/**',
      'src/api/v1.d.ts',
      '**/*.example.ts',
      '**/*.example.tsx',
      'vite.config.ts',
      'vitest.config.ts',
      'vitest.browser.config.ts',
      'vitest.setup.ts',
      'vitest.browser.setup.ts',
      '**/*.module.css.d.ts',
      // Pre-existing files with type errors - exclude from linting
      'src/components/ui/drawer.tsx',
      'src/components/ui/charts.tsx',
    ],
  })

  // SolidJS plugin config (client-specific)
  .append(pluginSolid)

  // Client-specific rule overrides
  .append({
    rules: {
      // Disable sonarjs rules that are too strict for client code
      'sonarjs/function-return-type': 'off',
      'sonarjs/todo-tag': 'off',
      // SolidJS reactivity enforcement
      'solid/reactivity': 'error',
      'solid/no-destructure': 'error',
      'solid/prefer-for': 'error',
    },
  })

  // Functional immutability rules (stricter for client - plugins already loaded from root)
  .append({
    rules: {
      'functional/no-throw-statements': 'off',
      'functional/prefer-immutable-types': [
        'error',
        {
          enforcement: 'ReadonlyShallow',
          parameters: {
            enforcement: 'None',
            ignoreNamePattern: ['^draft$', '^draft[A-Z]'],
          },
          returnTypes: {
            enforcement: 'None',
          },
          variables: {
            enforcement: 'None',
            ignoreInFunctions: true,
          },
        },
      ],
      'functional/type-declaration-immutability': [
        'error',
        {
          rules: [
            {
              identifiers: ['.*'],
              immutability: 'ReadonlyShallow',
              comparator: 'AtLeast',
            },
          ],
        },
      ],
    },
  })

  // TanStack Query and Router ESLint rules
  .append(...pluginQuery.configs['flat/recommended'])
  .append(...pluginRouter.configs['flat/recommended'])

  // Disable immutability rules in tests
  .append({
    files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
    rules: {
      'functional/prefer-immutable-types': 'off',
      'functional/type-declaration-immutability': 'off',
      'functional/prefer-property-signatures': 'off',
    },
  })

  // Disable TypeScript type-checking rules for JSON and config files
  .append({
    files: [
      '**/*.json',
      '**/*.jsonc',
      '*.config.*',
      '**/vitest.setup.ts',
      '**/vitest.browser.setup.ts',
    ],
    rules: {
      'ts/no-explicit-any': 'off',
      'ts/no-unsafe-argument': 'off',
      'ts/no-unsafe-assignment': 'off',
      'ts/no-unsafe-call': 'off',
      'ts/no-unsafe-member-access': 'off',
      'ts/no-unsafe-return': 'off',
      'no-type-assertion/no-type-assertion': 'off',
    },
  })
