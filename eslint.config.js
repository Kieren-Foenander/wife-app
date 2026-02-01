//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  {
    ignores: [
      'convex/_generated/**',
      'eslint.config.js',
      'prettier.config.js',
      'src/env.js',
      'src/routes/demo/api.names.js',
    ],
  },
  ...tanstackConfig,
]
