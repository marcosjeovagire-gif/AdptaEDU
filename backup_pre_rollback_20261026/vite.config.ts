import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import path from 'node:path';
import { defineConfig, loadEnv, Plugin } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240,
        deleteOriginFile: false,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'esnext',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
              if (id.includes('recharts')) return 'vendor-charts';
              return 'vendor';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: !isProd, // Disable HMR in production
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
