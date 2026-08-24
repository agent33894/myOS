import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dashboardRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dashboardRoot, 'src'),
      '@electron': path.resolve(dashboardRoot, 'electron'),
      '@shared': path.resolve(dashboardRoot, 'shared'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'shared/**/*.test.ts',
      'electron/**/*.test.ts',
    ],
    clearMocks: true,
  },
});
