import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/shop/test/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
