import { createLogger, defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger();
const originalWarnOnce = logger.warnOnce.bind(logger);
logger.warnOnce = (msg, options) => {
  if (msg.includes('postcss.parse')) return;
  originalWarnOnce(msg, options);
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    customLogger: logger,
    plugins: [
      react(),
      electron([
        {
          entry: 'electron/main.ts',
          onstart(options) {
            // Launch Electron app
            options.startup();
          },
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron'],
              },
            },
          },
        },
        {
          entry: 'electron/preload.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron'],
              },
            },
          },
        },
      ]),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@electron': path.resolve(__dirname, './electron'),
        '@shared': path.resolve(__dirname, './shared'),
      },
    },
    define: {
      global: 'globalThis',
    },
    build: {
      rollupOptions: {
        output: {
          // Shiki is left to Rollup on purpose: its languages and themes are
          // separate dynamic imports, and grouping them made one 9 MB chunk.
          manualChunks: (id) => {
            if (id.includes('mermaid')) {
              return 'mermaid';
            }
            // Group recharts into a separate chunk (no React dependency issues)
            if (id.includes('recharts') && !id.includes('react')) {
              return 'recharts';
            }
          },
        },
      },
      chunkSizeWarningLimit: 2500,
    },
    server: {
      port: 5173,
    },
  };
});
