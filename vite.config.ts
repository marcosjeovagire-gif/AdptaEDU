import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, Plugin } from 'vite';

function healthCheckPlugin(): Plugin {
  let sharedLanState: any = {};

  const healthHandler = (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.end(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
      })
    );
  };

  const syncHandler = (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          sharedLanState = { ...sharedLanState, ...parsed, _lastSync: new Date().toISOString() };
          res.end(JSON.stringify({ success: true, timestamp: sharedLanState._lastSync }));
        } catch (e: any) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // GET
    res.end(JSON.stringify({ success: true, data: sharedLanState }));
  };

  const aiHandler = (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const url = req.url || '';

        if (url.includes('/sintese-apoio')) {
          res.end(JSON.stringify({
            success: true,
            message: 'Síntese pedagógica processada com sucesso.',
          }));
          return;
        }

        if (url.includes('/gerar-atividade')) {
          res.end(JSON.stringify({
            success: true,
            message: 'Atividade gerada com base na Matriz Curricular homologada.',
          }));
          return;
        }

        res.end(JSON.stringify({ success: true, payload }));
      } catch (e: any) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
  };

  return {
    name: 'api-school-sync-middleware',
    configureServer(server) {
      server.middlewares.use('/api/health', healthHandler);
      server.middlewares.use('/api/sync-state', syncHandler);
      server.middlewares.use('/api/ai', aiHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/health', healthHandler);
      server.middlewares.use('/api/sync-state', syncHandler);
      server.middlewares.use('/api/ai', aiHandler);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), healthCheckPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
